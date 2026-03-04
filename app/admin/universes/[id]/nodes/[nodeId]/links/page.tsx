import { redirect } from 'next/navigation';

type NodeScopedLinksPageProps = {
  params: Promise<{
    id: string;
    nodeId: string;
  }>;
};

export default async function NodeScopedLinksPage({ params }: NodeScopedLinksPageProps) {
  const { id, nodeId } = await params;
  redirect(`/admin/universes/${id}/links?node=${nodeId}&tab=docs`);
}
