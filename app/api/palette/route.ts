import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const universeSlug = searchParams.get('universeSlug')?.trim() ?? '';
  const q = (searchParams.get('q')?.trim() ?? '').slice(0, 80);
  if (!universeSlug) return NextResponse.json({ nodes: [], terms: [] }, { status: 400 });

  const access = await getUniverseAccessBySlug(universeSlug);
  if (!access.universe || (!access.published && !access.canPreview)) {
    return NextResponse.json({ nodes: [], terms: [] }, { status: 404 });
  }

  const session = await getCurrentSession();
  const privileged = Boolean(session && (session.role === 'admin' || session.role === 'editor'));
  const db = privileged ? getSupabaseServiceRoleClient() : getSupabaseServerClient();
  if (!db) return NextResponse.json({ nodes: [], terms: [] });

  const universeId = access.universe.id;
  const nodesQuery = db
    .from('nodes')
    .select('id, slug, title')
    .eq('universe_id', universeId)
    .order('title', { ascending: true })
    .limit(8);
  const termsQuery = db
    .from('glossary_terms')
    .select('id, slug, term')
    .eq('universe_id', universeId)
    .order('term', { ascending: true })
    .limit(8);

  if (q) {
    nodesQuery.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
    termsQuery.or(`term.ilike.%${q}%,short_def.ilike.%${q}%`);
  }

  const [nodesRaw, termsRaw] = await Promise.all([nodesQuery, termsQuery]);
  const nodes = (nodesRaw.data ?? []).map((node) => ({
    id: node.id,
    slug: node.slug,
    title: node.title,
  }));
  const terms = (termsRaw.data ?? []).map((term) => ({
    id: term.id,
    slug: term.slug,
    term: term.term,
  }));

  return NextResponse.json({ nodes, terms });
}
