import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { DocumentReaderClient } from '@/components/doc/DocumentReaderClient';
import { canWriteAdminContent } from '@/lib/auth/requireRole';
import { getDocumentViewData, getThreadCitationsForDocument } from '@/lib/data/debate';
import { buildUniverseHref } from '@/lib/universeNav';

type DocPageProps = {
  params: Promise<{
    slug: string;
    docId: string;
  }>;
  searchParams: Promise<{
    p?: string;
    thread?: string;
    cite?: string;
    hl?: string;
  }>;
};

export default async function UniverseDocPage({ params, searchParams }: DocPageProps) {
  const { slug, docId } = await params;
  const { p, thread, cite } = await searchParams;
  const currentPath = buildUniverseHref(slug, '');
  const canExportClip = await canWriteAdminContent();
  const doc = await getDocumentViewData(slug, docId);

  if (!doc) notFound();

  const pageHint = p ? `p.${p}` : 'sem pagina definida';
  const threadId = thread?.trim() || '';
  const citations = threadId ? await getThreadCitationsForDocument(slug, docId, threadId) : [];
  const selected = citations.find((item) => item.citationId === cite) ?? citations[0] ?? null;

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Documento' />
      <DocumentReaderClient
        slug={slug}
        doc={doc}
        pageHint={pageHint}
        threadId={threadId}
        citations={citations}
        selectedCitationId={selected?.citationId ?? ''}
        canExportClip={canExportClip}
      />
    </div>
  );
}
