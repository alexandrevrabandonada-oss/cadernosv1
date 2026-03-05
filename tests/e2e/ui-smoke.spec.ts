import { expect, test } from '@playwright/test';

const slug = 'demo';

test.describe('UI smoke - workspace critico', () => {
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
    await expect(page.getByText('Sem resultados')).toBeVisible();
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

    await page.getByTestId('map-cluster').first().getByRole('link', { name: 'Entrar no cluster' }).click();
    await expect(page).toHaveURL(/cluster=/);
    await expect(page.getByTestId('detail-panel').first()).toBeVisible();
    await page.getByTestId('detail-panel').first().getByRole('link', { name: 'Abrir portal Provas' }).first().click();
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
    await page.goto(`/c/${slug}/provas?selected=${slug}-ev-1&panel=detail`);
    await page.getByRole('button', { name: 'Salvar trecho' }).first().click();
    await expect(page.getByText('Salvo no meu caderno')).toBeVisible();

    await page.goto(`/c/${slug}/meu-caderno`);
    await expect(page.getByTestId('workspace')).toBeVisible();
    await expect(page.getByText(/Entrada Evidencia|Evidencia 1 sobre/i).first()).toBeVisible();
    await page.getByRole('link', { name: 'Abrir no app' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/c/${slug}/`));
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
    await expect(ogImage).toHaveAttribute('content', /\/api\/og\?type=universe&u=demo/);
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
    await expect(page.getByRole('heading', { name: /Conceito central de demo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir no app' })).toBeVisible();
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', new RegExp(`/api/og\\?type=node&u=${slug}&id=${slug}-n1`));
  });

  test('share page term: renderiza com og:image e CTAs', async ({ page }) => {
    await page.goto(`/c/${slug}/s/term/mock-${slug}-${slug}-n1`);
    await expect(page.getByRole('heading', { name: /Conceito central de demo/i }).first()).toBeVisible();
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

    await page.goto('/admin/universes/mock-demo/share-pack');
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
    await openAppLink.click();
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

  test('pwa: service worker e rota offline existem', async ({ request, page }) => {
    const swResponse = await request.get('/sw.js');
    expect(swResponse.status()).toBe(200);
    const swText = await swResponse.text();
    expect(swText).toContain('CACHE_VERSION');
    expect(swText).toContain('/api/public/offline-seed');

    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Voce esta offline' })).toBeVisible();
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
