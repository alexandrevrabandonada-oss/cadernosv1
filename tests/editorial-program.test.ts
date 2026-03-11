import { describe, expect, it } from 'vitest';
import { bootstrapUniverseWorkflow } from '@/lib/universe/bootstrap';
import {
  addUniverseToProgram,
  autoAssessUniverseLane,
  createEditorialBatch,
  createEditorialProgram,
  getProgramBoard,
} from '@/lib/editorial/program';

describe('editorial program', () => {
  it('creates a program and adds universes to the board', async () => {
    const program = await createEditorialProgram({
      title: 'Programa de teste',
      slug: 'programa-de-teste',
      summary: 'Board editorial para testes.',
      userId: 'user-1',
    });

    const universe = await bootstrapUniverseWorkflow({
      mode: 'template',
      universe: {
        title: 'Universo programa',
        slug: 'universo-programa',
        summary: 'Universo bootstrapado para board.',
      },
      templateId: 'issue_investigation',
      userId: 'user-1',
    });

    const item = await addUniverseToProgram({
      programId: program.id,
      universeId: universe.id,
      lane: 'bootstrap',
      priority: 2,
    });

    const board = await getProgramBoard(program.slug);
    expect(item.lane).toBe('bootstrap');
    expect(board?.totals.bootstrap).toBeGreaterThan(0);
    expect(board?.columns.find((column) => column.lane === 'bootstrap')?.items[0]?.universe.slug).toBe('universo-programa');
  });

  it('auto assesses bootstrap universes without docs as bootstrap', async () => {
    const universe = await bootstrapUniverseWorkflow({
      mode: 'template',
      universe: {
        title: 'Universo sem docs',
        slug: 'universo-sem-docs',
        summary: 'Sem ingest ainda.',
      },
      templateId: 'blank_minimal',
      userId: 'user-1',
    });

    await expect(autoAssessUniverseLane(universe.id)).resolves.toBe('bootstrap');
  });

  it('creates a batch and places universes in bootstrap lane', async () => {
    const program = await createEditorialProgram({
      title: 'Programa lote',
      slug: 'programa-lote',
      userId: 'user-1',
    });

    const universes = await createEditorialBatch({
      programId: program.id,
      userId: 'user-1',
      universes: [
        { title: 'Lote A', slug: 'lote-a', templateId: 'issue_investigation', priority: 3 },
        { title: 'Lote B', slug: 'lote-b', templateId: 'campaign_watch', priority: 2 },
      ],
    });

    const board = await getProgramBoard(program.slug);
    expect(universes).toHaveLength(2);
    expect(board?.totals.bootstrap).toBeGreaterThanOrEqual(2);
  });
});
