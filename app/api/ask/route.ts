import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp } from '@/lib/ratelimit/keys';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';
import { askUniverse, isValidPayload } from '@/lib/ask/universe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      {
        error: 'invalid_payload',
        message: 'Payload esperado: { universeSlug, question, nodeSlug?, scope?, source? }',
      },
      { status: 400 },
    );
  }

  const auth = await getSupabaseServerAuthClient();
  const authUser = auth ? (await auth.auth.getUser()).data.user : null;
  const result = await askUniverse(payload, {
    userId: authUser?.id ?? null,
    ip: extractClientIp(request),
  });
  return NextResponse.json(result.body, { status: result.status });
}
