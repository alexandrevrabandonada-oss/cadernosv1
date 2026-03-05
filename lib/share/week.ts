import 'server-only';

type WeekParts = {
  year: number;
  week: number;
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  isoWeekday: number;
};

type ScheduleSettings = {
  weekly_day: number;
  weekly_hour: number;
  timezone: string;
};

const WEEKDAY_BY_SHORT: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    isoWeekday: WEEKDAY_BY_SHORT[get('weekday')] ?? 1,
  };
}

function toIsoWeekParts(date: Date): WeekParts {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

function zonedDateToUtcMidnight(parts: ZonedDateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function getWeekKey(date: Date, timeZone = 'America/Sao_Paulo') {
  const zoned = getZonedParts(date, timeZone);
  const iso = toIsoWeekParts(zonedDateToUtcMidnight(zoned));
  return `${iso.year}-W${String(iso.week).padStart(2, '0')}`;
}

export function getWeekStart(date: Date, timeZone = 'America/Sao_Paulo') {
  const zoned = getZonedParts(date, timeZone);
  const midnight = zonedDateToUtcMidnight(zoned);
  const start = new Date(midnight);
  start.setUTCDate(start.getUTCDate() - (zoned.isoWeekday - 1));
  return start.toISOString().slice(0, 10);
}

export function getNextScheduledRun(settings: ScheduleSettings, now = new Date()) {
  const current = getZonedParts(now, settings.timezone);
  const todayMidnightUtc = zonedDateToUtcMidnight(current);
  const deltaDays =
    settings.weekly_day >= current.isoWeekday
      ? settings.weekly_day - current.isoWeekday
      : 7 - (current.isoWeekday - settings.weekly_day);
  const candidate = new Date(todayMidnightUtc);
  candidate.setUTCDate(candidate.getUTCDate() + deltaDays);
  candidate.setUTCHours(settings.weekly_hour, 0, 0, 0);
  return candidate.toISOString();
}

