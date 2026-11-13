import { defineConfig } from '@playwright/test';

// The smoke test runs against the production build in `dist` (run `npm run build` first).
// CI builds with a GitHub Pages base path and passes the same path here, so the test opens
// the app exactly where it will be published.
const base = process.env.E2E_BASE ?? '/';
const port = 4173;
const url = `http://localhost:${port}${base}`;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: url,
    // CSS size of the Samsung S24 Ultra screen in portrait, with touch instead of a mouse.
    viewport: { width: 384, height: 824 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'ru-RU',
    // The offline cache is checked by hand on the phone. Without the service worker the
    // "ready to work offline" banner cannot move the board in the middle of the test.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'phone-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --base=${base}`,
    url,
    reuseExistingServer: !process.env.CI,
  },
});
