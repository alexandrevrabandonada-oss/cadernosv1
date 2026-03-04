import { seedPoluicaoVr } from './demo/poluicao-vr.mjs';

async function main() {
  const publish = process.env.DEMO_PUBLISH !== '0';
  const dryRun = process.env.DEMO_DRY_RUN === '1';

  const summary = await seedPoluicaoVr({ publish, dryRun });

  console.log('=== Universo DEMO: Poluicao em Volta Redonda ===');
  console.log(`Slug: ${summary.slug}`);
  console.log(`Universe ID: ${summary.universeId}`);
  console.log(`Publicado: ${summary.published ? 'sim' : 'nao'}`);
  console.log('');
  console.table({
    nodes_total: summary.nodes,
    nodes_core: summary.coreNodes,
    nodes_secondary: summary.secondaryNodes,
    edges: summary.edges,
    glossary_terms: summary.glossaryTerms,
    events: summary.events,
    node_questions: summary.nodeQuestions,
    placeholder_evidences: summary.placeholderEvidences,
    trails: summary.trails,
    trail_steps: summary.trailSteps,
    docs_from_sources: summary.importSummary.documentsHandled,
    docs_uploaded_pdf: summary.importSummary.uploaded,
    docs_link_only: summary.importSummary.linkOnly,
  });

  console.log('');
  console.log('Proximos passos recomendados:');
  console.log('1) Preencher data/demo/poluicao-vr.sources.json com DOI/URL/PDF reais.');
  console.log('2) Rodar: npm run demo:import');
  console.log('3) Processar docs em /admin/universes/[id]/docs ate 10+ PDFs processados.');
  console.log('4) Abrir /admin/universes/[id]/assistido para vincular docs/evidencias aos nos.');
  console.log('5) Fechar lacunas no checklist e revisar publish.');
}

main().catch((error) => {
  console.error('Falha ao seedar universo demo poluicao-vr.');
  console.error(error?.message ?? error);
  process.exit(1);
});

