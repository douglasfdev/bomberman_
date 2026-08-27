import { test, expect } from '@playwright/test';

test.describe('Timer Debug - Capture Errors', () => {
  test('capture all console errors', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://localhost:4000');
    
    // Wait for game to initialize
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(5000);
    
    // Check for Vite error overlay
    const errorOverlay = page.locator('vite-error-overlay');
    const hasErrorOverlay = await errorOverlay.count() > 0;
    console.log('Has Vite error overlay:', hasErrorOverlay);
    
    if (hasErrorOverlay) {
      const errorText = await errorOverlay.textContent();
      console.log('Error overlay text:', errorText);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/error-check.png', fullPage: true });
  });
});