import fs from 'node:fs';
import path from 'node:path';
import { getServiceClient, loadDemoSources, loadEnvLocal, importSourcesForUniverse } from './demo/poluicao-vr.mjs';

function normalize(kind, value) {
  const raw = String(value ?? '').trim();
  if (kind === 'doi') {
    return raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').toLowerCase();
  }
  if (kind === 'url') {
    try {
      const url = new URL(raw);
      url.hash = '';
      return url.toString();
    } catch {
      return raw;
    }
  }
  return raw.replace(/\\/g, '/');
}

function looksPlaceholder(entry) {
  const hay = `${entry.value ?? ''} ${entry.note ?? ''}`.toLowerCase();
  return hay.includes('placeholder') || hay.includes('10.xxxx/') || hay.includes('exemplo.org');
}

function validateSources(entries) {
  const seen = new Set();
  const issues = [];
  const unique = [];
  let placeholders = 0;
  let duplicates = 0;
  let missingPdfs = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const kind = String(entry.kind ?? '').toLowerCase();
    const value = normalize(kind, entry.value);
    const key = `${kind}:${value.toLowerCase()}`;
    const duplicate = seen.has(key);
    if (!duplicate) seen.add(key);

    if (looksPlaceholder(entry)) placeholders += 1;
    if (duplicate) {
      duplicates += 1;
      issues.push({ index: i, level: 'warning', code: 'duplicate', message: 'Entrada duplicada (kind+value).' });
      continue;
    }

    if (kind === 'url') {
      try {
        const url = new URL(value);
        if (!(url.protocol === 'http:' || url.protocol === 'https:')) {
          issues.push({ index: i, level: 'error', code: 'invalid_url_scheme', message: 'URL com esquema inseguro.' });
          continue;
        }
      } catch {
        issues.push({ index: i, level: 'error', code: 'invalid_url', message: 'URL invalida.' });
        continue;
      }
    }

    if (kind === 'pdf') {
      const absolute = path.resolve(process.cwd(), value.replace(/^\.\/+/, ''));
      if (!fs.existsSync(absolute)) {
        missingPdfs += 1;
        issues.push({ index: i, level: 'warning', code: 'pdf_missing', message: `PDF local ausente: ${value}` });
      }
    }

    unique.push(entry);
  }

  const errors = issues.filter((issue) => issue.level === 'error').length;
  return {
    ok: errors === 0,
    unique,
    issues,
    stats: {
      total: entries.length,
      placeholders,
      duplicates,
      missingPdfs,
      errors,
      warnings: issues.filter((issue) => issue.level === 'warning').length,
    },
  };
}

function renderReport(summary, validation) {
  const lines = [];
  lines.push('# Import Demo — Poluicao VR');
  lines.push(`Data: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Validacao');
  lines.push(`- total: ${validation.stats.total}`);
  lines.push(`- placeholders: ${validation.stats.placeholders}`);
  lines.push(`- duplicados: ${validation.stats.duplicates}`);
  lines.push(`- pdf_missing: ${validation.stats.missingPdfs}`);
  lines.push(`- erros: ${validation.stats.errors}`);
  lines.push(`- avisos: ${validation.stats.warnings}`);
  lines.push('');
  lines.push('## Import');
  lines.push(`- total_sources: ${summary.totalSources}`);
  lines.push(`- documents_handled: ${summary.documentsHandled}`);
  lines.push(`- uploaded_pdf: ${summary.uploaded}`);
  lines.push(`- link_only: ${summary.linkOnly}`);
  lines.push(`- linked_nodes: ${summary.nodeDocumentLinksSeeded}`);
  lines.push('');
  lines.push('## Proximos passos');
  lines.push('- Substituir placeholders no sources.json');
  lines.push('- Garantir PDFs locais reais para subir como uploaded');
  lines.push('- Enfileirar ingest + rodar worker no admin console demo');
  lines.push('- Revisar checklist e curadoria assistida');
  lines.push('');
  const issues = validation.issues.slice(0, 40);
  if (issues.length > 0) {
    lines.push('## Issues (top 40)');
    for (const issue of issues) {
      lines.push(`- [${issue.level.toUpperCase()}] #${issue.index + 1} ${issue.code}: ${issue.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  loadEnvLocal();
  const client = getServiceClient();
  if (!client) {
    throw new Error('Ambiente Supabase incompleto. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  const sources = loadDemoSources();
  if (sources.length === 0) {
    console.log('Nenhuma fonte encontrada em data/demo/poluicao-vr.sources.json.');
    return;
  }

  const { data: universe } = await client
    .from('universes')
    .select('id, slug')
    .eq('slug', 'poluicao-vr')
    .maybeSingle();
  if (!universe?.id) {
    throw new Error('Universo poluicao-vr nao encontrado. Rode primeiro: npm run demo:seed');
  }

  const validation = validateSources(sources);
  if (!validation.ok) {
    console.error(`Validacao falhou com ${validation.stats.errors} erro(s). Corrija data/demo/poluicao-vr.sources.json.`);
    process.exit(1);
  }

  const summary = await importSourcesForUniverse(client, universe.id, validation.unique, {
    dryRun: process.env.DEMO_DRY_RUN === '1',
  });

  const reportPath = path.resolve(process.cwd(), 'reports/demo_poluicao_vr_import.md');
  fs.writeFileSync(reportPath, renderReport(summary, validation), 'utf8');

  console.log('=== Import em lote (poluicao-vr) ===');
  console.table({
    total_sources: summary.totalSources,
    documents_handled: summary.documentsHandled,
    uploaded_pdf: summary.uploaded,
    link_only: summary.linkOnly,
    linked_nodes: summary.nodeDocumentLinksSeeded,
    placeholders: validation.stats.placeholders,
    duplicates: validation.stats.duplicates,
    report: reportPath,
  });
}

main().catch((error) => {
  console.error('Falha no import em lote de fontes do universo demo.');
  console.error(error?.message ?? error);
  process.exit(1);
});
