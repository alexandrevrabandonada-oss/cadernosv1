import 'server-only';
import * as Sentry from '@sentry/nextjs';

type SafeContext = Record<string, string | number | boolean | null | undefined>;

function sanitizeStringValue(value: string) {
  let next = value;
  next = next.replace(
    /\bhttps?:\/\/([^/\s:@]+):([^/\s@]+)@/gi,
    (_match, user) => `https://${user}:***@`,
  );
  next = next.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    '[redacted-jwt]',
  );
  return next;
}

function sanitizeContext(contextSafe: SafeContext | undefined) {
  if (!contextSafe) return undefined;
  const safe: SafeContext = {};
  for (const [key, value] of Object.entries(contextSafe)) {
    if (/(token|secret|password|cookie|authorization|key)/i.test(key)) continue;
    safe[key] = typeof value === 'string' ? sanitizeStringValue(value) : value;
  }
  return safe;
}

export function isSentryConfigured() {
  return Boolean((process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim());
}

export function captureException(error: unknown, contextSafe?: SafeContext) {
  if (!isSentryConfigured()) return;
  Sentry.withScope((scope) => {
    const safe = sanitizeContext(contextSafe);
    if (safe) scope.setContext('safe', safe);
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, contextSafe?: SafeContext) {
  if (!isSentryConfigured()) return;
  Sentry.withScope((scope) => {
    const safe = sanitizeContext(contextSafe);
    if (safe) scope.setContext('safe', safe);
    Sentry.captureMessage(message);
  });
}

export async function withSpan<T>(name: string, fn: () => Promise<T>) {
  if (!isSentryConfigured()) return fn();
  return Sentry.startSpan({ name }, fn);
}
