import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080/';

test.describe('SCEAP MVP smoke', () => {
  test('home page loads and backend health is reachable', async ({ page }) => {
    await page.goto(BASE);
    // click health check button and wait for the network call
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/health') && r.status() === 200),
      page.click('text=Test backend health')
    ]);
    expect(resp.ok()).toBeTruthy();
  });
});
