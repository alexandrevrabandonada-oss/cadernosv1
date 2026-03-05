import { notFound } from 'next/navigation';
import { OrientationBar } from '@/components/universe/OrientationBar';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TutorPointLab } from '@/components/tutor/TutorPointLab';
import {
  getTutorPlanPreview,
  getTutorSessionById,
  markTutorPointDone,
  setTutorCurrentIndex,
  type TutorPointView,
} from '@/app/actions/tutor';
import {
  ensureTutorChatThread,
  listTutorChatMessages,
  sendTutorChatMessage,
} from '@/app/actions/tutorChat';
import { getCurrentSession } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getEvidenceMapByIds } from '@/lib/tutor/points';
import { buildUniverseHref } from '@/lib/universeNav';

type TutorPointPageProps = {
  params: Promise<{ slug: string; sessionId: string; index: string }>;
};

async function getUniverseIdBySlug(slug: string) {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  return data ?? null;
}

export default async function TutorPointPage({ params }: TutorPointPageProps) {
  const { slug, sessionId, index } = await params;
  const currentPath = buildUniverseHref(slug, 'tutor');
  const universe = await getUniverseIdBySlug(slug);
  if (!universe) notFound();

  const parsedIndex = Math.max(0, Number(index) || 0);
  const session = await getCurrentSession();
  const isLoggedIn = Boolean(session && session.userId !== 'dev-bypass');

  let points: TutorPointView[] = [];
  let currentIndex = parsedIndex;
  let mode: 'visitor' | 'logged' = 'visitor';
  let chatThreadId: string | null = null;
  let initialChatMessages: Array<{
    id: string;
    role: 'user' | 'tutor';
    text: string;
    qaThreadId: string | null;
    createdAt: string;
  }> = [];

  if (sessionId === 'local') {
    points = await getTutorPlanPreview(slug);
    mode = 'visitor';
  } else {
    if (!isLoggedIn) notFound();
    const tutorSession = await getTutorSessionById(sessionId);
    if (!tutorSession || tutorSession.universeId !== universe.id) notFound();
    points = tutorSession.points;
    currentIndex = parsedIndex;
    mode = 'logged';
    const point = tutorSession.points[parsedIndex];
    if (point) {
      chatThreadId = await ensureTutorChatThread(sessionId, point.id);
      if (chatThreadId) {
        initialChatMessages = await listTutorChatMessages(chatThreadId);
      }
    }
  }

  if (points.length === 0 || parsedIndex >= points.length) notFound();
  const evidenceIds = Array.from(
    new Set(points.flatMap((point) => point.requiredEvidenceIds)),
  );
  const evidenceMapRaw = await getEvidenceMapByIds(evidenceIds);
  const evidenceMap = Object.fromEntries(evidenceMapRaw.entries());

  async function setCurrentIndexAction(targetSessionId: string, nextIndex: number) {
    'use server';
    if (targetSessionId === 'local') return { ok: true as const };
    return setTutorCurrentIndex(targetSessionId, nextIndex);
  }

  async function markDoneAction(
    targetSessionId: string,
    orderIndex: number,
    options: { threadId?: string | null },
  ) {
    'use server';
    if (targetSessionId === 'local') {
      return {
        ok: true as const,
        done: orderIndex >= points.length - 1,
        nextIndex: Math.min(orderIndex + 1, points.length - 1),
      };
    }
    return markTutorPointDone(targetSessionId, orderIndex, options);
  }

  async function sendChatMessageAction(payload: {
    sessionId: string;
    pointId: string;
    text: string;
  }) {
    'use server';
    return sendTutorChatMessage(payload);
  }

  return (
    <div className='stack'>
      <OrientationBar slug={slug} currentPath={currentPath} currentLabel='Tutor Ponto' />

      <Card className='stack'>
        <SectionHeader
          title={`Ponto ${parsedIndex + 1} de ${points.length}`}
          description='Mini-lab do ponto: evidencia obrigatoria, pergunta guiada e checkpoint.'
          tag='Tutor Point'
        />
      </Card>

      <Card className='stack'>
        <TutorPointLab
          slug={slug}
          sessionId={sessionId}
          mode={mode}
          points={points}
          initialIndex={currentIndex}
          evidenceMap={evidenceMap}
          initialChatThreadId={chatThreadId}
          initialChatMessages={initialChatMessages}
          onSetCurrentIndex={setCurrentIndexAction}
          onMarkDone={markDoneAction}
          onSendChatMessage={sendChatMessageAction}
        />
      </Card>
    </div>
  );
}
