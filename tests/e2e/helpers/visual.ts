import { expect, type Page } from '@playwright/test';

type UiDensity = 'normal' | 'compact';
type UiTexture = 'normal' | 'low';

export async function setViewportDesktop(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
}

export async function setViewportMobile(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

export async function applyUiPrefsViaLocalStorage(page: Page, density: UiDensity, texture: UiTexture) {
  await page.addInitScript(
    ({ densityValue, textureValue }) => {
      const payload = {
        density: densityValue,
        texture: textureValue,
        last_section: 'mapa',
      };
      localStorage.setItem('cv:ui-prefs', JSON.stringify(payload));
      document.documentElement.setAttribute('data-density', densityValue);
      document.documentElement.setAttribute('data-texture', textureValue);
    },
    { densityValue: density, textureValue: texture },
  );
}

export async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      html {
        scroll-behavior: auto !important;
      }
    `,
  });
}

export async function waitForAppReady(page: Page, options?: { requireWorkspace?: boolean }) {
  if (options?.requireWorkspace ?? true) {
    await expect(page.getByTestId('workspace')).toBeVisible();
  }
  await expect(page.getByTestId('skeleton')).toHaveCount(0, { timeout: 4_000 });
}

export async function captureStableScreenshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: false,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
}
