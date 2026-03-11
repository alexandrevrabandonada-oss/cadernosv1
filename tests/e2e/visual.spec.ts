import { expect, test, type Page } from '@playwright/test';
import {
  applyUiPrefsViaLocalStorage,
  captureStableScreenshot,
  disableMotion,
  setViewportDesktop,
  setViewportMobile,
  waitForAppReady,
} from './helpers/visual';

const slug = 'exemplo';

type Screen = {
  key: string;
  path: string;
  requireWorkspace?: boolean;
  openDetail?: (page: Page) => Promise<void>;
};

const screens: Screen[] = [
  {
    key: 'home',
    path: '/',
    requireWorkspace: false,
  },
  {
    key: 'mapa',
    path: `/c/${slug}/mapa?view=clusters`,
    openDetail: async (page) => {
      const href = await page.getByTestId('map-cluster').first().getByRole('link', { name: 'Entrar no cluster' }).getAttribute('href');
      await page.goto(href ?? `/c/${slug}/mapa?view=clusters`);
      await expect(page).toHaveURL(/cluster=/);
    },
  },
  {
    key: 'provas',
    path: `/c/${slug}/provas`,
    openDetail: async (page) => {
      const href = await page.getByTestId('evidence-card').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
      await page.goto(href ?? `/c/${slug}/provas`);
      await expect(page).toHaveURL(/selected=/);
    },
  },
  {
    key: 'linha',
    path: `/c/${slug}/linha`,
    openDetail: async (page) => {
      const href = await page.getByTestId('timeline-item').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
      await page.goto(href ?? `/c/${slug}/linha`);
      await expect(page).toHaveURL(/selected=/);
    },
  },
  {
    key: 'debate',
    path: `/c/${slug}/debate`,
    openDetail: async (page) => {
      const href = await page.getByTestId('thread-item').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
      await page.goto(href ?? `/c/${slug}/debate`);
      await expect(page).toHaveURL(/selected=/);
    },
  },
  {
    key: 'glossario',
    path: `/c/${slug}/glossario`,
    openDetail: async (page) => {
      const href = await page.getByTestId('term-item').first().getByRole('link', { name: 'Ver detalhe' }).getAttribute('href');
      await page.goto(href ?? `/c/${slug}/glossario`);
      await expect(page).toHaveURL(/selected=/);
    },
  },
  {
    key: 'trilhas',
    path: `/c/${slug}/trilhas`,
    requireWorkspace: false,
  },
];

function withSnapshot(url: string) {
  if (process.env.UI_SNAPSHOT !== '1') return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}snapshot=1`;
}

async function runVisualMatrix(page: Page, params: { viewport: 'desktop' | 'mobile'; density: 'normal' | 'compact'; texture: 'normal' | 'low' }) {
  if (params.viewport === 'desktop') {
    await setViewportDesktop(page);
  } else {
    await setViewportMobile(page);
  }
  await applyUiPrefsViaLocalStorage(page, params.density, params.texture);

  for (const screen of screens) {
    await page.goto(withSnapshot(screen.path));
    await disableMotion(page);
    await waitForAppReady(page, { requireWorkspace: screen.requireWorkspace ?? true });
    if (screen.openDetail) {
      await screen.openDetail(page);
      await disableMotion(page);
      if (params.viewport === 'mobile') {
        await expect(page).toHaveURL(/panel=detail/);
      }
    }
    if (params.viewport === 'mobile' && (screen.requireWorkspace ?? true)) {
      await expect(page.getByTestId('dock-nav')).toBeVisible();
    }
    await captureStableScreenshot(page, `${params.viewport}_${params.density}_${params.texture}_${screen.key}.png`);
  }
}

test.describe('Visual snapshots - workspace e temas', () => {
  test.describe.configure({ timeout: 180_000 });

  test('desktop normal/normal', async ({ page }) => {
    await runVisualMatrix(page, { viewport: 'desktop', density: 'normal', texture: 'normal' });
  });

  test('desktop compact/low', async ({ page }) => {
    await runVisualMatrix(page, { viewport: 'desktop', density: 'compact', texture: 'low' });
  });

  test('mobile normal/normal', async ({ page }) => {
    await runVisualMatrix(page, { viewport: 'mobile', density: 'normal', texture: 'normal' });
  });

  test('mobile compact/low', async ({ page }) => {
    await runVisualMatrix(page, { viewport: 'mobile', density: 'compact', texture: 'low' });
  });
});
