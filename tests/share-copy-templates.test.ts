import { describe, expect, it } from 'vitest';
import {
  buildInstagramCaption,
  buildTelegramText,
  buildTwitterThread,
  buildWhatsAppText,
  type SharePackTemplateInput,
} from '@/lib/share/copyTemplates';

function samplePack(): SharePackTemplateInput {
  return {
    universeSlug: 'poluicao-vr',
    universeTitle: 'Poluicao em Volta Redonda',
    weekKey: '2026-W10',
    title: 'Pack da semana — Poluicao em Volta Redonda',
    note: 'Comece pelo item 1 e avance para contexto, linha e debate.',
    items: [
      { type: 'evidence', id: 'ev-1', label: 'Evidencia 1', url: '/c/poluicao-vr/s/evidence/ev-1' },
      { type: 'evidence', id: 'ev-2', label: 'Evidencia 2', url: '/c/poluicao-vr/s/evidence/ev-2' },
      { type: 'thread', id: 'th-1', label: 'Thread 1', url: '/c/poluicao-vr/s/thread/th-1' },
      { type: 'event', id: 'evt-1', label: 'Evento 1', url: '/c/poluicao-vr/s/event/evt-1' },
      { type: 'term', id: 'term-1', label: 'Termo 1', url: '/c/poluicao-vr/s/term/term-1' },
      { type: 'node', id: 'node-1', label: 'No 1', url: '/c/poluicao-vr/s/node/node-1' },
    ],
  };
}

describe('share copy templates', () => {
  it('instagram caption respeita limite e hashtags maximas', () => {
    const text = buildInstagramCaption(samplePack());
    expect(text.length).toBeLessThanOrEqual(2000);
    const hashTags = text
      .split(/\s+/)
      .filter((token) => token.startsWith('#'));
    expect(hashTags.length).toBeLessThanOrEqual(5);
    expect(text).toContain('Pack da semana');
  });

  it('whatsapp e telegram incluem links e contexto', () => {
    const wa = buildWhatsAppText(samplePack());
    const tg = buildTelegramText(samplePack());
    expect(wa).toContain('/c/poluicao-vr/s/evidence/ev-1');
    expect(wa).toContain('Hub:');
    expect(tg).toContain('Universo:');
    expect(tg).toContain('/c/poluicao-vr/s/thread/th-1');
  });

  it('twitter thread gera blocos numerados', () => {
    const tw = buildTwitterThread(samplePack());
    expect(tw).toContain('1/');
    expect(tw).toContain('2/');
    expect(tw).toContain('/c/poluicao-vr/s/evidence/ev-1');
  });
});

