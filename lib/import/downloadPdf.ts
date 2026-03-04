import 'server-only';
import { getAdminDb } from '@/lib/admin/db';
import { isSafeHttpUrl } from '@/lib/import/resolve';

type DownloadAndStorePdfInput = {
  universeId: string;
  documentId: string;
  pdfUrl: string;
  maxBytes?: number;
  timeoutMs?: number;
};

type DownloadAndStorePdfResult = {
  ok: boolean;
  storagePath: string | null;
  errorCode?: string;
};

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

function buildStoragePath(input: { universeId: string; documentId: string }) {
  return `universes/${input.universeId}/imports/${input.documentId}.pdf`;
}

export async function downloadAndStorePdf(
  input: DownloadAndStorePdfInput,
): Promise<DownloadAndStorePdfResult> {
  const maxBytes = input.maxBytes ?? 50 * 1024 * 1024;
  const timeoutMs = input.timeoutMs ?? 15000;

  if (!isSafeHttpUrl(input.pdfUrl)) {
    return { ok: false, storagePath: null, errorCode: 'unsafe_url' };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, storagePath: null, errorCode: 'db_not_configured' };
  }

  const storagePath = buildStoragePath({
    universeId: input.universeId,
    documentId: input.documentId,
  });

  const headTimeout = withTimeout(Math.min(10000, timeoutMs));
  try {
    const head = await fetch(input.pdfUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: headTimeout.controller.signal,
      cache: 'no-store',
    });
    const headType = head.headers.get('content-type')?.toLowerCase() ?? '';
    const length = Number(head.headers.get('content-length') ?? '0');
    if (head.ok && headType && !headType.includes('application/pdf')) {
      return { ok: false, storagePath: null, errorCode: 'not_pdf' };
    }
    if (Number.isFinite(length) && length > maxBytes) {
      return { ok: false, storagePath: null, errorCode: 'file_too_large' };
    }
  } catch {
    // Some providers block HEAD; fallback to GET validation.
  } finally {
    headTimeout.clear();
  }

  const getTimeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(input.pdfUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: getTimeout.controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      return { ok: false, storagePath: null, errorCode: 'download_failed' };
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType && !contentType.includes('application/pdf')) {
      return { ok: false, storagePath: null, errorCode: 'not_pdf' };
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return { ok: false, storagePath: null, errorCode: 'empty_file' };
    }
    if (arrayBuffer.byteLength > maxBytes) {
      return { ok: false, storagePath: null, errorCode: 'file_too_large' };
    }

    const { error: uploadError } = await db.storage
      .from('cv-docs')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return { ok: false, storagePath: null, errorCode: 'upload_failed' };
    }

    return { ok: true, storagePath };
  } catch {
    return { ok: false, storagePath: null, errorCode: 'download_failed' };
  } finally {
    getTimeout.clear();
  }
}
