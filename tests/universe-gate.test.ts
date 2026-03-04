import { describe, expect, it, vi } from 'vitest';

Object.assign(globalThis, {
  React: {
    createElement: () => ({}),
  },
});

const hoisted = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  getUniverseAccessBySlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: hoisted.notFound,
}));

vi.mock('@/lib/data/universes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/universes')>('@/lib/data/universes');
  return {
    ...actual,
    getUniverseAccessBySlug: hoisted.getUniverseAccessBySlug,
  };
});

describe('gate do layout /c/[slug]', () => {
  it('anonimo em universo nao publicado recebe notFound', async () => {
    hoisted.getUniverseAccessBySlug.mockResolvedValue({
      universe: { id: 'u1', slug: 'a' },
      published: false,
      canPreview: false,
    });
    const { default: UniversoLayout } = await import('@/app/c/[slug]/layout');

    await expect(
      UniversoLayout({
        children: null,
        params: Promise.resolve({ slug: 'a' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('editor/admin em preview nao recebe bloqueio', async () => {
    hoisted.getUniverseAccessBySlug.mockResolvedValue({
      universe: { id: 'u1', slug: 'a' },
      published: false,
      canPreview: true,
    });
    const { default: UniversoLayout } = await import('@/app/c/[slug]/layout');

    const result = await UniversoLayout({
      children: null,
      params: Promise.resolve({ slug: 'a' }),
    });

    expect(result).toBeTruthy();
  });
});
