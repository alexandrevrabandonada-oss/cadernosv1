import { NextResponse } from 'next/server';
import { getPublicOfflineSeed } from '@/lib/offline/seed';

export const runtime = 'nodejs';

export async function GET() {
  const seed = await getPublicOfflineSeed();
  return NextResponse.json(seed, {
    headers: {
      'cache-control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}

