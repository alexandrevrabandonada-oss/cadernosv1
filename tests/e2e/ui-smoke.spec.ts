import { expect, test } from '@playwright/test';

const slug = 'exemplo';

test.describe('UI smoke - workspace critico', () => {
  test('home: usa universo featured seedado como foco editorial real', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Universo em foco').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exemplo' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar agora' }).first()).toBeVisible();
  });

  test('admin featured/focus: painel mostra o bloco de governanca editorial', async ({ page }) => {
    await page.goto('/admin/universes/featured');
    await expect(page.getByRole('heading', { name: 'Featured / Focus' })).toBeVisible();
    await expect(page.getByText('focus_override').first()).toBeVisible();
    await expect(page.getByText('is_featured').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar aos universos' })).toBeVisible();
  });

  test('home: estado vazio orienta quando busca nao encontra universo publico', async ({ page }) => {
    await page.goto('/?q=zzzxxyynotfound');
    await expect(page.getByText('Vitrine em preparacao').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Como ler este universo' })).toBeVisible();
  });

  test('provas: abre detalhe com selected e mostra empty state com filtro impossivel', async ({ page }) => {
    await page.goto(`/c/${slug}/provas`);
    await expect(page.getByTestId('workspace')).toBeVisible();
    await expect(page.getByTestId('evidence-card').first()).toBeVisible();

    const firstDetailHref = await page.getByTestId('evidence-card').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
    expect(firstDetailHref).toContain('selected=');
    await page.goto(firstDetailHref ?? `/c/${slug}/provas`);
    await expect(page).toHaveURL(/selected=/);
    await expect(page.getByTestId('evidence-card').first()).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();

    await page.goto(`/c/${slug}/provas?q=zzzxxyynotfound`);
    await expect(page.getByText('Sem resultados').first()).toBeVisible();
  });

  test('linha: abre detalhe e CTA Ver Provas navega com filtros', async ({ page }) => {
    await page.goto(`/c/${slug}/linha`);
    await expect(page.getByTestId('timeline-item').first()).toBeVisible();

    const detailHref = await page.getByTestId('timeline-item').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
    expect(detailHref).toContain('selected=');
    await page.goto(detailHref ?? `/c/${slug}/linha`);
    const provasHref = await page.getByTestId('detail-panel').first().getByRole('link', { name: 'Ver Provas' }).getAttribute('href');
    expect(provasHref).toContain(`/c/${slug}/provas`);
    await page.goto(provasHref ?? `/c/${slug}/provas`);
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/provas`));
  });

  test('command palette 2.0: busca node e term no mesmo fluxo', async ({ page }) => {
    await page.goto(`/c/${slug}/provas`);
    await page.waitForTimeout(400);
    await page.keyboard.press('/');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.getByLabel('Buscar comando').fill('conceito');
    const results = page.getByLabel('Resultados da command palette');
    await expect(results.getByText('Nos', { exact: true })).toBeVisible();
    await expect(results.getByText('Glossario', { exact: true })).toBeVisible();
    await expect(results.getByRole('option').filter({ hasText: 'Conceito central de exemplo' }).first()).toBeVisible();
  });
  test('debate: seleciona thread, troca lente e CTA Ver Provas funciona', async ({ page }) => {
    await page.goto(`/c/${slug}/debate?selected=${slug}-thread-1`);
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
    await expect(page.getByTestId('detail-panel').first()).toContainText('confianca:');
    await expect(page.getByTestId('detail-panel').first()).toContainText('Limitacoes');

    await page.getByTestId('lens-toggle').first().selectOption('worker');
    await page.getByRole('button', { name: 'Aplicar' }).first().click();
    await expect(page).toHaveURL(/lens=worker/);

    const provasHref = await page.getByTestId('detail-panel').first().getByRole('link', { name: 'Ver Provas' }).getAttribute('href');
    expect(provasHref).toContain(`/c/${slug}/provas`);
    await page.goto(provasHref ?? `/c/${slug}/provas`);
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/provas`));
  });

  test('api ask: retorna confidence limitations e divergence', async ({ request }) => {
    const response = await request.post('/api/ask', {
      data: {
        universeSlug: slug,
        question: 'Quais evidencias principais desta base?',
      },
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      confidence?: { score: number; label: string };
      limitations?: string[];
      divergence?: { flag: boolean; summary: string | null };
    };
    expect(payload.confidence).toBeTruthy();
    expect(typeof payload.confidence?.score).toBe('number');
    expect(['forte', 'media', 'fraca']).toContain(payload.confidence?.label);
    expect(Array.isArray(payload.limitations)).toBeTruthy();
    expect(payload.divergence).toBeTruthy();
  });

  test('glossario: abre detalhe e CTA Ir para No abre mapa com node selecionado', async ({ page }) => {
    await page.goto(`/c/${slug}/glossario`);
    await expect(page.getByTestId('term-item').first()).toBeVisible();

    const detailHref = await page.getByTestId('term-item').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
    expect(detailHref).toContain('selected=');
    await page.goto(detailHref ?? `/c/${slug}/glossario`);
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
    const mapHref = await page.locator(`a[href*="/c/${slug}/mapa?node="]`).first().getAttribute('href');
    expect(mapHref).toContain(`/c/${slug}/mapa?node=`);
    await page.goto(mapHref ?? `/c/${slug}/mapa`);
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/mapa\\?`));
    await expect(page).toHaveURL(/node=/);
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
  });

  test('mapa: clusters abre detalhe, entrar no cluster e portal navega', async ({ page }) => {
    await page.goto(`/c/${slug}/mapa?view=clusters`);
    await expect(page.getByTestId('map-cluster').first()).toBeVisible();

    const clusterHref = await page.getByTestId('map-cluster').first().getByRole('link', { name: 'Entrar no cluster' }).getAttribute('href');
    await page.goto(clusterHref ?? `/c/${slug}/mapa?view=clusters`);
    await expect(page).toHaveURL(/cluster=/);
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
    const portalHref = await page.getByTestId('detail-panel').first().getByRole('link', { name: 'Abrir portal Provas' }).first().getAttribute('href');
    expect(portalHref).toContain(`/c/${slug}/provas`);
    await page.goto(portalHref ?? `/c/${slug}/provas`);
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/provas`));
  });

  test('densidade e textura: alterna e aplica data-attrs no root', async ({ page }) => {
    await page.goto(`/c/${slug}/provas`);
    await expect(page.locator('html')).toHaveAttribute('data-density', /normal|compact/);
    await expect(page.locator('html')).toHaveAttribute('data-texture', /normal|low/);

    const toggle = page.getByTestId('density-toggle').first();
    await toggle.getByRole('button', { name: 'Compacto' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');

    await toggle.getByRole('button', { name: 'Normal' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'normal');

    const textureToggle = page.getByTestId('texture-toggle').first();
    await textureToggle.getByRole('button', { name: 'Baixa' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-texture', 'low');

    await textureToggle.getByRole('button', { name: 'Normal' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-texture', 'normal');
  });

  test('teclado: ArrowDown preserva contexto de selected no workspace', async ({ page }) => {
    await page.goto(`/c/${slug}/provas`);
    const firstDetailHref = await page.getByTestId('evidence-card').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
    expect(firstDetailHref).toContain('selected=');
    const selectedOnlyHref = new URL(firstDetailHref ?? `/c/${slug}/provas`, 'http://localhost:3000');
    selectedOnlyHref.searchParams.delete('panel');
    await page.goto(`${selectedOnlyHref.pathname}${selectedOnlyHref.search}`);
    expect(new URL(page.url()).searchParams.get('selected')).toBeTruthy();
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-palette-open', '0');
    });

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    await expect
      .poll(() => new URL(page.url()).searchParams.get('selected'))
      .toBeTruthy();

    await expect(page).toHaveURL(/selected=/);
  });

  test('focus mode: alterna data-focus com atalho de teclado no desktop', async ({ page }) => {
    await page.goto(`/c/${slug}/provas?selected=${slug}-ev-1&panel=detail`);
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'off');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('f');
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'on');

    await page.keyboard.press('f');
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'off');
  });

  test('meu caderno: salva highlight em provas e aparece na lista', async ({ page }) => {
    await page.goto(`/c/${slug}/meu-caderno`);
    await page.evaluate((slugValue) => {
      localStorage.setItem(
        `cv:user-notes:v1:${slugValue}`,
        JSON.stringify([
          {
            id: 'local-smoke-note',
            universeSlug: slugValue,
            universeId: '',
            kind: 'highlight',
            title: 'Evidencia smoke',
            text: 'Trecho salvo localmente para validar listagem do meu caderno.',
            sourceType: 'evidence',
            sourceId: `${slugValue}-ev-1`,
            sourceMeta: {},
            tags: ['exemplo'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pendingSync: false,
          },
        ]),
      );
    }, slug);

    await page.reload();
    await expect(page.getByTestId('workspace')).toBeVisible();
    await expect(page.getByText(/Evidencia smoke|Entrada Evidencia/i).first()).toBeVisible();
    await page.getByRole('link', { name: 'Abrir no app' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/`));
  });

  test('doc viewer: cria highlight real, aparece no meu caderno e reabre na origem', async ({ page }) => {
    await page.goto(`/c/${slug}/doc/${slug}-doc-1`);
    await expect(page.getByTestId('doc-text-surface')).toBeVisible();
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const paragraph = document.querySelector('p.doc-text-block');
      if (!paragraph || !paragraph.firstChild) throw new Error('doc text not found');
      const textNode = paragraph.firstChild;
      const text = textNode.textContent ?? '';
      const start = text.indexOf('highlight real');
      const end = start + 'highlight real no Doc Viewer'.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

        await page.waitForFunction(() => Boolean(window.getSelection()?.toString().trim()));
    await expect(page.getByRole('dialog', { name: 'Acoes da selecao' })).toBeVisible();
    await page.getByRole('button', { name: 'Destacar' }).click();
    await expect(page.getByText('Highlight salvo no Meu Caderno.')).toBeVisible();
    await expect(page.locator('mark[data-highlight-id]').first()).toBeVisible();

    await page.goto(`/c/${slug}/meu-caderno`);
    await expect(page.getByText(/highlight real no Doc Viewer/i).first()).toBeVisible();
    await page.getByRole('link', { name: 'Abrir no app' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/doc/${slug}-doc-1`));
    await expect.poll(() => new URL(page.url()).searchParams.get('hl')).toBeTruthy();
    await expect(page.locator('mark[data-highlight-id]').first()).toBeVisible();
    await expect(page.getByText('Editar highlight')).toBeVisible();
  });

  test('command palette 2.0: @ abre highlight de doc salvo localmente', async ({ page }) => {
    await page.goto(`/c/${slug}/doc/${slug}-doc-1`);
    await expect(page.getByTestId('doc-text-surface')).toBeVisible();
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const paragraph = document.querySelector('p.doc-text-block');
      if (!paragraph || !paragraph.firstChild) throw new Error('doc text not found');
      const textNode = paragraph.firstChild;
      const text = textNode.textContent ?? '';
      const start = text.indexOf('highlight real');
      const end = start + 'highlight real no Doc Viewer'.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

        await page.waitForFunction(() => Boolean(window.getSelection()?.toString().trim()));
    await expect(page.getByRole('dialog', { name: 'Acoes da selecao' })).toBeVisible();
    await page.getByRole('button', { name: 'Destacar' }).click();
    await expect(page.getByText('Highlight salvo no Meu Caderno.')).toBeVisible();

    await page.waitForTimeout(250);
    await page.keyboard.press('/');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.getByLabel('Buscar comando').fill('@highlight real');
    const results = page.getByLabel('Resultados da command palette');
    await expect(results.getByText('Meu Caderno', { exact: true })).toBeVisible();
    await results.getByRole('option').filter({ hasText: 'Highlight: Documento Demo' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/doc/${slug}-doc-1`));
    await expect.poll(() => new URL(page.url()).searchParams.get('hl')).toBeTruthy();
    await expect(page.getByText('Editar highlight')).toBeVisible();
  });

  test('coletivos: cria por template, mostra badge na lista, adiciona item e abre review', async ({ page, request }) => {
    await page.goto(`/c/${slug}/coletivos/novo`);
    await expect(page.getByRole('heading', { name: /Criar coletivo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Criar Base da Semana/i })).toBeVisible();

    const createResponse = await request.post('/api/shared-notebooks', {
      data: {
        universeSlug: slug,
        title: 'Base da Semana',
        summary: 'Base semanal criada a partir do template para validar fluxo.',
        visibility: 'team',
        templateId: 'weekly_base',
        templateMeta: {
          suggestedTags: ['semana', 'prioridade', 'base'],
          preferredSources: ['highlight', 'evidence', 'thread', 'event'],
          microcopy: 'Template semanal para triagem e review.',
        },
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createPayload = (await createResponse.json()) as { notebook?: { id: string; slug: string } };
    expect(createPayload.notebook?.id).toBeTruthy();

    await page.goto(`/c/${slug}/coletivos`);
    await expect(page.getByText('Base da semana').first()).toBeVisible();
    await expect(page.getByText('Template semanal para triagem e review.').first()).toBeVisible();

    const addResponse = await request.post('/api/shared-notebooks', {
      data: {
        action: 'add_item',
        notebookId: createPayload.notebook?.id,
        universeSlug: slug,
        sourceType: 'evidence',
        sourceId: `${slug}-ev-1`,
        title: 'Nota para coletivo',
        text: 'Resumo curto para promover ao coletivo e validar export.',
        sourceMeta: {
          nodeSlug: 'exemplo-n1',
          originalSourceType: 'evidence',
          originalSourceId: `${slug}-ev-1`,
          linkToApp: `/c/${slug}/provas?selected=${slug}-ev-1&panel=detail`,
        },
        tags: ['exemplo', 'base'],
        note: 'Virou base compartilhada.',
      },
    });
    expect(addResponse.ok()).toBeTruthy();

    await page.goto(`/c/${slug}/coletivos/${createPayload.notebook?.slug ?? 'base-da-semana'}/review`);
    await expect(page.getByText('Nota para coletivo').first()).toBeVisible();
    await expect(page.getByText('status:draft').first()).toBeVisible();
    await page.getByLabel('Nota editorial').first().fill('Precisa subir para review coletivo.');
    await page.getByRole('button', { name: 'Mover para review' }).click();
    await expect(page.getByText(/Item atualizado para review./)).toBeVisible();
    await expect(page.getByText('status:review').first()).toBeVisible();

    const exportResponse = await request.post('/api/export/shared-notebook', {
      data: {
        universeSlug: slug,
        notebookId: createPayload.notebook?.id,
        format: 'pdf',
      },
    });
    expect(exportResponse.ok()).toBeTruthy();
    const exportPayload = (await exportResponse.json()) as { ok: boolean; assets?: Array<{ signedUrl: string | null; format: string }> };
    expect(exportPayload.ok).toBeTruthy();
    expect(exportPayload.assets?.some((asset) => asset.format === 'pdf' && Boolean(asset.signedUrl))).toBeTruthy();
  });

  test('study recap: highlight no doc aparece no recap local', async ({ page }) => {
    await page.goto(`/c/${slug}/doc/${slug}-doc-1`);
    await expect(page.getByTestId('doc-text-surface')).toBeVisible();
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const paragraph = document.querySelector('p.doc-text-block');
      if (!paragraph || !paragraph.firstChild) throw new Error('doc text not found');
      const textNode = paragraph.firstChild;
      const text = textNode.textContent ?? '';
      const start = text.indexOf('highlight real');
      const end = start + 'highlight real no Doc Viewer'.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

        await page.waitForFunction(() => Boolean(window.getSelection()?.toString().trim()));
    await expect(page.getByRole('dialog', { name: 'Acoes da selecao' })).toBeVisible();
    await page.getByRole('button', { name: 'Destacar' }).click();
    await expect(page.getByText('Highlight salvo no Meu Caderno.')).toBeVisible();

    await page.goto(`/c/${slug}/meu-caderno/recap`);
    await expect(page.getByRole('heading', { name: 'Seu Recap' })).toBeVisible();
    await expect(page.getByTestId('study-recap-today')).toContainText('Highlights: 1');
    await expect(page.getByTestId('study-recap-today')).toContainText('Itens estudados: 1');
    await expect(page.getByRole('link', { name: 'Continuar' })).toBeVisible();
  });
  test('mobile ergonomics: dock nav, drawer, detail sheet e doc toolbar respeitam toque', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/c/${slug}/provas`);
    await expect(page.getByTestId('dock-nav')).toBeVisible();

    const dockHeights = await page.locator('[data-testid="dock-nav"] .workspace-dock-item').evaluateAll((elements) =>
      elements.filter((element) => element.getClientRects().length > 0).slice(0, 4).map((element) => Math.round(element instanceof HTMLElement ? element.offsetHeight : 0)),
    );
    expect(dockHeights.every((height) => height >= 44)).toBeTruthy();

    const openFiltersHeight = await page.getByRole('button', { name: 'Abrir filtros' }).evaluate((element) => Math.round(element instanceof HTMLElement ? element.offsetHeight : 0));
    expect(openFiltersHeight).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Abrir filtros' }).click();
    await expect(page.locator('.workspace-drawer.is-open')).toBeVisible();
    const closeFiltersHeight = await page.getByRole('button', { name: 'Fechar filtros' }).evaluate((element) => Math.round(element instanceof HTMLElement ? element.offsetHeight : 0));
    expect(closeFiltersHeight).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Fechar filtros' }).click();

    const detailHref = await page.getByTestId('evidence-card').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
    await page.goto(detailHref ?? `/c/${slug}/provas`);
    await expect(page.locator('.workspace-sheet.is-open')).toBeVisible();
    const sheetHeights = await page.locator('.workspace-sheet.is-open .workspace-detail-head .ui-button').evaluateAll((elements) =>
      elements.filter((element) => element.getClientRects().length > 0).map((element) => Math.round(element instanceof HTMLElement ? element.offsetHeight : 0)),
    );
    expect(sheetHeights.every((height) => height >= 44)).toBeTruthy();

    await page.goto(`/c/${slug}/doc/${slug}-doc-1`);
    await expect(page.getByTestId('doc-text-surface')).toBeVisible();
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const paragraph = document.querySelector('p.doc-text-block');
      if (!paragraph || !paragraph.firstChild) throw new Error('doc text not found');
      const textNode = paragraph.firstChild;
      const text = textNode.textContent ?? '';
      const start = text.indexOf('highlight real');
      const end = start + 'highlight real no Doc Viewer'.length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    const toolbar = page.getByTestId('doc-selection-toolbar');
    await expect(toolbar).toBeVisible();
    const toolbarHeights = await toolbar.locator('.ui-button').evaluateAll((elements) =>
      elements.filter((element) => element.getClientRects().length > 0).map((element) => Math.round(element instanceof HTMLElement ? element.offsetHeight : 0)),
    );
    expect(toolbarHeights.every((height) => height >= 44)).toBeTruthy();
  });

  test('workspace base: rail, content e detail panel renderizam', async ({ page }) => {
    await page.goto(`/c/${slug}/linha`);
    await expect(page.getByTestId('workspace')).toBeVisible();
    await expect(page.getByTestId('filter-rail').first()).toBeVisible();
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
  });

  test('og universe: endpoint retorna image/png', async ({ request }) => {
    const response = await request.get(`/api/og?type=universe&u=${slug}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('og evidence: endpoint retorna image/png', async ({ request }) => {
    const response = await request.get(`/api/og?type=evidence&u=${slug}&id=${slug}-ev-1`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('share page universe: carrega com meta og:image', async ({ page }) => {
    await page.goto(`/c/${slug}/s`);
    await expect(page.getByText(/Vitrine publica/i)).toBeVisible();
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', /\/api\/og\?type=universe&u=exemplo/);
  });

  test('og export: endpoint retorna image/png', async ({ request }) => {
    const response = await request.get(`/api/og?type=export&u=${slug}&id=${slug}-export-1`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('share page export: renderiza com link de download', async ({ page }) => {
    await page.goto(`/c/${slug}/s/export/${slug}-export-1`);
    await expect(page.getByText(/Export Share/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Baixar PDF' })).toBeVisible();
  });

  test('export clip: endpoint gera asset e link de download', async ({ request }) => {
    const response = await request.post('/api/admin/export/clip', {
      data: {
        universeSlug: slug,
        sourceType: 'evidence',
        sourceId: `${slug}-ev-1`,
        title: 'Clip smoke',
        snippet: 'Trecho curto de teste para validar export clip no fluxo e2e.',
        isPublic: false,
      },
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      kind: string;
      assets: Array<{ format: string; signedUrl: string | null }>;
    };
    expect(payload.ok).toBeTruthy();
    expect(payload.kind).toBe('clip');
    expect(payload.assets.some((asset) => asset.format === 'pdf' && Boolean(asset.signedUrl))).toBeTruthy();
  });

  test('og node: endpoint retorna image/png', async ({ request }) => {
    const response = await request.get(`/api/og?type=node&u=${slug}&id=${slug}-n1`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('og term: endpoint retorna image/png', async ({ request }) => {
    const response = await request.get(`/api/og?type=term&u=${slug}&id=mock-${slug}-${slug}-n1`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('share page node: renderiza com og:image e CTAs', async ({ page }) => {
    await page.goto(`/c/${slug}/s/node/${slug}-n1`);
    await expect(page.getByRole('heading', { name: /Conceito central de exemplo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir no app' })).toBeVisible();
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', new RegExp(`/api/og\\?type=node&u=${slug}&id=${slug}-n1`));
  });

  test('share page term: renderiza com og:image e CTAs', async ({ page }) => {
    await page.goto(`/c/${slug}/s/term/mock-${slug}-${slug}-n1`);
    await expect(page.getByRole('heading', { name: /Conceito central de exemplo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir no app' })).toBeVisible();
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', new RegExp(`/api/og\\?type=term&u=${slug}&id=mock-${slug}-${slug}-n1`));
  });

  test('share pack semanal: gera lista de links validos', async ({ request }) => {
    const response = await request.get(`/api/share-pack?u=${slug}`);
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      weekKey: string;
      title: string;
      items: Array<{ type: string; url: string }>;
    };

    expect(payload.weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(payload.title).toContain('Pack da semana');
    expect(payload.items.length).toBeGreaterThanOrEqual(5);

    const types = new Set(payload.items.map((item) => item.type));
    expect(types.has('evidence')).toBeTruthy();
    expect(types.has('thread')).toBeTruthy();
    expect(types.has('event')).toBeTruthy();
    expect(types.has('term')).toBeTruthy();
    expect(types.has('node')).toBeTruthy();

    for (const item of payload.items) {
      const linkResponse = await request.get(item.url);
      expect(linkResponse.status()).toBe(200);
    }
  });

  test('share pack caption: endpoint responde em ambiente de teste', async ({ request }) => {
    const response = await request.get(`/api/share-pack/caption?u=${slug}&channel=instagram`);
    expect(response.status()).toBe(200);
  });

  test('cron weekly-pack: endpoint protegido cria/garante pack da semana', async ({ request }) => {
    const unauthorized = await request.post('/api/cron/weekly-pack');
    expect(unauthorized.status()).toBe(401);

    const response = await request.post('/api/cron/weekly-pack', {
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { ok: boolean; processed: number; results: Array<{ packId: string | null }> };
    expect(payload.ok).toBeTruthy();
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0]?.packId).toBeTruthy();
  });

  test('share pack admin: marcar instagram como postado persiste', async ({ page, request }) => {
    await request.post('/api/cron/weekly-pack', {
      headers: { 'x-cron-secret': 'test-cron-secret' },
    });

    await page.goto('/admin/universes/mock-exemplo/share-pack');
    const instagramCard = page.locator('article.core-node').filter({ hasText: 'instagram' }).first();
    await expect(instagramCard).toBeVisible();
    await instagramCard.getByRole('button', { name: 'Marcar postado' }).click();
    await expect(instagramCard).toContainText('posted');

    await page.reload();
    const instagramAfterReload = page.locator('article.core-node').filter({ hasText: 'instagram' }).first();
    await expect(instagramAfterReload).toContainText('posted');
  });

  test('api track: aceita evento valido', async ({ request }) => {
    const response = await request.post('/api/track', {
      data: {
        universeSlug: slug,
        event_name: 'cta_click',
        route: `/c/${slug}`,
        meta: { cta: 'smoke_test' },
      },
    });
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { ok: boolean };
    expect(payload.ok).toBeTruthy();
  });

  test('share page: link Abrir no app tem tracking e navega', async ({ page }) => {
    await page.goto(`/c/${slug}/s/evidence/${slug}-ev-1`);
    const openAppLink = page.getByRole('link', { name: 'Abrir no app' });
    await expect(openAppLink).toHaveAttribute('data-track-event', 'share_open_app');
    const href = await openAppLink.getAttribute('href');
    expect(href).toContain(`/c/${slug}/provas`);
    await page.goto(href ?? `/c/${slug}/provas`);
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/provas`));
  });

  test('pwa: manifest e icons existem', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    const manifest = (await manifestResponse.json()) as {
      name: string;
      icons: Array<{ src: string; sizes: string }>;
    };
    expect(manifest.name).toContain('Cadernos');
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBeTruthy();
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBeTruthy();

    const icon192 = await request.get('/icons/icon-192.png');
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()['content-type']).toContain('image/png');
  });

  test('coletivos: detalhe restrito mostra estado de acesso', async ({ page }) => {
    await page.goto(`/c/${slug}/coletivos/sem-acesso`);
    await expect(page.getByText('Coletivo indisponivel').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar aos coletivos' })).toBeVisible();
  });

  test('exports: export privado mostra bloqueio elegante', async ({ page }) => {
    await page.goto(`/c/${slug}/exports/${slug}-export-private`);
    await expect(page.getByText('Este export nao esta liberado aqui').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar ao universo' })).toBeVisible();
  });

  test('pwa: service worker e rota offline existem', async ({ request, page }) => {
    const swResponse = await request.get('/sw.js');
    expect(swResponse.status()).toBe(200);
    const swText = await swResponse.text();
    expect(swText).toContain('CACHE_VERSION');
    expect(swText).toContain('/api/public/offline-seed');

    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Voce esta offline' })).toBeVisible();
    await expect(page.getByText('O shell do app foi carregado').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir Home' })).toBeVisible();
  });

  test('pwa: offline-seed publico responde com slugs/share pages', async ({ request }) => {
    const response = await request.get('/api/public/offline-seed');
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      universeSlugs: string[];
      sharePages: string[];
      updatedAt: string;
    };
    expect(Array.isArray(payload.universeSlugs)).toBeTruthy();
    expect(Array.isArray(payload.sharePages)).toBeTruthy();
    expect(typeof payload.updatedAt).toBe('string');
  });

  test('route progress: aparece em navegacao lenta e some ao concluir', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('cv:navigation-start'));
    });
    await expect(page.getByTestId('route-progress')).toBeVisible({ timeout: 3000 });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('cv:page-ready'));
    });
    await expect(page.getByTestId('route-progress')).toHaveCount(0);
  });
});
test('admin bootstrap: cria universo por template, abre hub e checklist inicial', async ({ page, request }) => {
  const stamp = Date.now();
  const slug = `bootstrap-template-${stamp}`;
  await page.goto('/admin/universes/new');
  await expect(page.getByRole('heading', { name: 'Wizard de bootstrap de universo' })).toBeVisible();

  const response = await request.post('/api/admin/universes/bootstrap', {
    data: {
      title: 'Bootstrap Template Smoke',
      slug,
      summary: 'Universo criado no smoke para validar bootstrap via template.',
      mode: 'template',
      templateId: 'issue_investigation',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { universe?: { id: string; slug: string } };
  expect(payload.universe?.id).toBeTruthy();

  await page.goto(`/admin/universes/${payload.universe?.id}/bootstrap`);
  await expect(page.getByRole('heading', { name: /Bootstrap \/ Clone:/ })).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar template' }).click();
  await expect(page.getByText('Template aplicado com sucesso.')).toBeVisible();

  await page.goto(`/c/${slug}`);
  await expect(page.getByRole('heading', { name: 'Bootstrap Template Smoke' }).first()).toBeVisible();
  await expect(page.getByText('Mapa').first()).toBeVisible();

  await page.goto(`/c/${slug}/trilhas`);
  await expect(page.getByText('Comece Aqui').first()).toBeVisible();

  await page.goto(`/admin/universes/${payload.universe?.id}/checklist`);
  await expect(page.getByRole('heading', { name: /Checklist do Universo:/ })).toBeVisible();
});

test('admin bootstrap: clone estrutural nao herda evidencias nem exports', async ({ page, request }) => {
  const stamp = Date.now();
  const slug = `bootstrap-clone-${stamp}`;
  await page.goto('/admin/universes/new');
  await expect(page.getByRole('heading', { name: 'Wizard de bootstrap de universo' })).toBeVisible();

  const listPage = await request.get('/admin/universes');
  expect(listPage.ok()).toBeTruthy();

  const response = await request.post('/api/admin/universes/bootstrap', {
    data: {
      title: 'Bootstrap Clone Smoke',
      slug,
      summary: 'Universo clonado no smoke para validar guardrails.',
      mode: 'clone',
      sourceUniverseId: 'mock-exemplo',
      cloneOptions: {
        nodes: true,
        glossary: true,
        trails: true,
        nodeQuestions: true,
        collectiveTemplates: true,
        homeEditorialDefaults: false,
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { universe?: { id: string; slug: string } };
  expect(payload.universe?.id).toBeTruthy();

  await page.goto(`/admin/universes/${payload.universe?.id}/checklist`);
  await expect(page.getByText('Evidencias').first()).toBeVisible();
  await expect(page.getByText(/total 0 \| publicadas 0/).first()).toBeVisible();
  await expect(page.getByText('Docs').first()).toBeVisible();
  await expect(page.getByText(/total 0 \| processed 0/).first()).toBeVisible();
});

test('admin programa editorial: cria lote, move card e reaplica sugestao de lane', async ({ page, request }) => {
  const stamp = Date.now();
  const programSlug = `programa-${stamp}`;
  const createProgram = await request.post('/api/admin/programa-editorial', {
    data: {
      action: 'create_program',
      title: `Programa ${stamp}`,
      slug: programSlug,
      summary: 'Board smoke para operar multiplos universos.',
    },
  });
  expect(createProgram.ok()).toBeTruthy();

  const createBatch = await request.post('/api/admin/programa-editorial', {
    data: {
      action: 'create_batch',
      programSlug,
      universes: [
        { title: `Lote A ${stamp}`, slug: `lote-a-${stamp}`, templateId: 'issue_investigation', priority: 3 },
        { title: `Lote B ${stamp}`, slug: `lote-b-${stamp}`, templateId: 'campaign_watch', priority: 2 },
      ],
    },
  });
  expect(createBatch.ok()).toBeTruthy();

  await page.goto(`/admin/programa-editorial/${programSlug}`);
  await expect(page.getByRole('heading', { name: `Programa ${stamp}` })).toBeVisible();
  await expect(page.getByText(`Lote A ${stamp}`).first()).toBeVisible();
  await expect(page.getByText('Criar lote de 3 universos').first()).toBeVisible();

  const boardResponse = await request.get(`/api/admin/programa-editorial?program=${programSlug}`);
  expect(boardResponse.ok()).toBeTruthy();
  const boardPayload = (await boardResponse.json()) as {
    board: {
      columns: Array<{
        items: Array<{ item: { id: string; lane: string }; universe: { title: string } }>;
      }>;
    };
  };
  const firstCard = boardPayload.board.columns.flatMap((column) => column.items).find((item) => item.universe.title === `Lote A ${stamp}`);
  expect(firstCard?.item.id).toBeTruthy();

  const moveResponse = await request.post('/api/admin/programa-editorial', {
    data: {
      action: 'move_item',
      itemId: firstCard?.item.id,
      lane: 'review',
      priority: 5,
      note: 'Precisa passar pela fila editorial.',
    },
  });
  expect(moveResponse.ok()).toBeTruthy();

  await page.reload();
  const movedCard = page.locator('article.core-node').filter({ hasText: `Lote A ${stamp}` }).first();
  await expect(movedCard).toContainText('lane:review');

  await page.getByRole('button', { name: 'Aplicar sugestoes de lane' }).click();
  await expect(page.getByText('Lanes sugeridas aplicadas ao board.').first()).toBeVisible();
  await expect(page.locator('article.core-node').filter({ hasText: `Lote A ${stamp}` }).first()).toContainText('lane:bootstrap');
});



test('programa editorial 2026: garante lote real com tres universos e hub unpublished', async ({ page, request }) => {
  const seedResponse = await request.post('/api/admin/programa-editorial', {
    data: {
      action: 'ensure_main_batch',
    },
  });
  expect(seedResponse.ok()).toBeTruthy();

  await page.goto('/admin/programa-editorial/programa-editorial-2026');
  await expect(page.getByRole('heading', { name: 'Programa Editorial 2026' })).toBeVisible();
  await expect(page.getByText('Saude e Poluicao em Volta Redonda').first()).toBeVisible();
  await expect(page.getByText('Memoria Industrial de Volta Redonda').first()).toBeVisible();
  await expect(page.getByText('Respira Fundo Monitoramento').first()).toBeVisible();
  await expect(page.getByText('lane:bootstrap').first()).toBeVisible();

  const saudeCard = page.locator('article.core-node').filter({ hasText: 'Saude e Poluicao em Volta Redonda' }).first();
  await expect(saudeCard).toContainText('Investigacao de tema');
  await saudeCard.getByRole('link', { name: 'Abrir hub' }).click();
  await expect(page).toHaveURL(/\/c\/saude-poluicao-vr/);
  await expect(page.getByRole('heading', { name: 'Saude e Poluicao em Volta Redonda' }).first()).toBeVisible();
  await expect(page.getByText('Mapa').first()).toBeVisible();

  await page.goto('/admin/programa-editorial/programa-editorial-2026');
  await saudeCard.getByRole('link', { name: 'Checklist' }).click();
  await expect(page.getByRole('heading', { name: /Checklist do Universo:/ })).toBeVisible();
});

test('admin universe inbox: analisa lote PDF, cria universo e entra no board em ingest', async ({ page }) => {
  const stamp = Date.now();
  const universeTitle = `Inbox Smoke ${stamp}`;
  const universeSlug = `inbox-smoke-${stamp}`;
  const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 40 90 Td (Saude poluicao monitoramento industrial) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n0\n%%EOF');

  await page.goto('/admin/universes/inbox');
  await expect(page.getByRole('heading', { name: 'Universe Inbox' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles([
    { name: 'saude-poluicao.pdf', mimeType: 'application/pdf', buffer: fakePdf },
    { name: 'monitoramento-industrial.pdf', mimeType: 'application/pdf', buffer: fakePdf },
    { name: 'impacto-ambiental.pdf', mimeType: 'application/pdf', buffer: fakePdf },
  ]);

  await expect(page.getByText('Lote analisado. Revise a sugestao antes de criar o universo.')).toBeVisible();
  await expect(page.getByText('Nos core sugeridos')).toBeVisible();
  await page.getByLabel('Titulo').fill(universeTitle);
  await page.getByLabel('Slug').fill(universeSlug);
  await page.getByLabel('Resumo').fill('Universo criado via inbox assistida para validar bootstrap e ingest.');
  await page.getByRole('button', { name: 'Criar universo e enfileirar ingest' }).click();

  await expect(page.getByText('Universo criado com sucesso.')).toBeVisible();
  await expect(page.getByText(new RegExp(`${universeTitle} entrou no board em ingest`, 'i'))).toBeVisible();
  await page.getByRole('link', { name: 'Abrir board deste universo' }).click();
  await expect(page).toHaveURL(/\/admin\/programa-editorial\//);
  await expect(page.getByText(universeTitle).first()).toBeVisible();
  await expect(page.locator('article.core-node').filter({ hasText: universeTitle }).first()).toContainText('lane:ingest');

  await page.goto(`/c/${universeSlug}`);
  await expect(page.getByRole('heading', { name: universeTitle }).first()).toBeVisible();
  await page.goto(`/c/${universeSlug}/trilhas`);
  await expect(page.getByText('Comece Aqui').first()).toBeVisible();
});

