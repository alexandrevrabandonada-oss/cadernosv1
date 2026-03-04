import { OrientationBar } from '@/components/universe/OrientationBar';
import { Portais } from '@/components/universe/Portais';
import { MapExplorer } from '@/components/map/MapExplorer';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getMapData, getNodeRelatedDocuments } from '@/lib/data/universe';
import {
  type NodeLinkedDocument,
  type NodeLinkedEvidence,
  type NodeQuestion,
  listNodeDocumentsByNodeIds,
  listNodeEvidencesByNodeIds,
  listNodeQuestionsByNodeIds,
} from '@/lib/data/nodeLinks';
import { buildUniverseHref } from '@/lib/universeNav';

type MapaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MapaPage({ params }: MapaPageProps) {
  const { slug } = await params;
  const currentPath = buildUniverseHref(slug, 'mapa');
  const data = await getMapData(slug);
  const nodeIds = data.nodes.map((node) => node.id);
  const emptyDocs: Record<string, NodeLinkedDocument[]> = {};
  const emptyEvidences: Record<string, NodeLinkedEvidence[]> = {};
  const emptyQuestions: Record<string, NodeQuestion[]> = {};
  const [explicitDocsByNode, explicitEvidencesByNode, questionsByNode, relatedByLabel] = await Promise.all([
    data.universeId ? listNodeDocumentsByNodeIds(data.universeId, nodeIds) : Promise.resolve(emptyDocs),
    data.universeId ? listNodeEvidencesByNodeIds(data.universeId, nodeIds) : Promise.resolve(emptyEvidences),
    data.universeId ? listNodeQuestionsByNodeIds(data.universeId, nodeIds) : Promise.resolve(emptyQuestions),
    getNodeRelatedDocuments(
      slug,
      data.nodes.map((node) => node.label),
    ),
  ]);

  const nodesWithDocs = data.nodes.map((node) => ({
    ...node,
    relatedDocuments:
      (explicitDocsByNode[node.id] ?? []).map((link) => ({
        id: link.documentId,
        title: link.document?.title ?? 'Documento',
        year: link.document?.year ?? null,
        status: link.document?.status ?? 'uploaded',
        sourceUrl: link.document?.sourceUrl ?? null,
        weight: link.weight,
        note: link.note,
      })) ||
      [],
    linkedEvidences: (explicitEvidencesByNode[node.id] ?? []).map((link) => ({
      id: link.evidenceId,
      title: link.evidence?.title ?? 'Evidencia',
      summary: link.evidence?.summary ?? '',
      quote: link.evidence?.quote ?? '',
      docId: link.evidence?.documentId ?? null,
      docTitle: link.evidence?.documentTitle ?? null,
      year: link.evidence?.year ?? null,
      pageStart: link.evidence?.pageStart ?? null,
      pageEnd: link.evidence?.pageEnd ?? null,
      pinRank: link.pinRank,
    })),
    suggestedQuestions: (questionsByNode[node.id] ?? []).map((item) => item.question),
  }));

  const nodesWithFallback = nodesWithDocs.map((node) => ({
    ...node,
    relatedDocuments:
      node.relatedDocuments && node.relatedDocuments.length > 0 ? node.relatedDocuments : (relatedByLabel[node.label] ?? []),
  }));

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Mapa' />

      <Card className='stack'>
        <SectionHeader
          title={`Mapa do Universo: ${data.title}`}
          description='Grid de nos com conexoes suaves em SVG, filtros e painel lateral de contexto.'
          tag='Mapa'
        />
        <MapExplorer slug={slug} source={data.source} nodes={nodesWithFallback} edges={data.edges} />
      </Card>

      <Card className='stack'>
        <Portais slug={slug} currentPath='mapa' title='Proximas portas' />
      </Card>
    </div>
  );
}
