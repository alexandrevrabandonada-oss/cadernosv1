import { describe, expect, it } from 'vitest';
import { getNextScheduledRun, getWeekKey, getWeekStart } from '@/lib/share/week';

describe('share week helpers', () => {
  it('getWeekKey respeita timezone America/Sao_Paulo', () => {
    const date = new Date('2026-03-02T01:00:00.000Z');
    const spWeek = getWeekKey(date, 'America/Sao_Paulo');
    const utcWeek = getWeekKey(date, 'UTC');

    expect(spWeek).toBe('2026-W09');
    expect(utcWeek).toBe('2026-W10');
  });

  it('getWeekStart retorna inicio ISO da semana local', () => {
    const date = new Date('2026-03-04T12:00:00.000Z');
    expect(getWeekStart(date, 'America/Sao_Paulo')).toBe('2026-03-02');
  });

  it('getNextScheduledRun retorna timestamp ISO', () => {
    const now = new Date('2026-03-04T13:00:00.000Z');
    const next = getNextScheduledRun(
      {
        weekly_day: 1,
        weekly_hour: 9,
        timezone: 'America/Sao_Paulo',
      },
      now,
    );
    expect(next).toMatch(/^2026-03-09T09:00:00.000Z$/);
  });
});

