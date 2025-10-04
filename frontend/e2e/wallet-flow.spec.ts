import { test, expect } from '@playwright/test';

test.describe('Wallet Autopilot Flow', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Wallet Autopilot');
  });

  test('should show connect wallet button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("Connect MetaMask")')).toBeVisible();
  });

  test('should display wallet health dashboard after connection', async ({ page }) => {
    // Note: This test would require MetaMask extension and wallet setup
    // For now, it's a placeholder for the E2E structure
    await page.goto('/');
    const connectButton = page.locator('button:has-text("Connect MetaMask")');
    await expect(connectButton).toBeVisible();
  });
});
