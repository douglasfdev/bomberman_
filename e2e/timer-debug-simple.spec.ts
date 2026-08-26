import { test, expect } from '@playwright/test';

test.describe('Timer Debug Simple', () => {
  test('check timer decreases', async ({ page }) => {
    page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));
    
    await page.goto('http://localhost:4000');
    
    // Wait for game to initialize
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000);
    
    // Wait for paywall timer (10s + buffer)
    await page.waitForTimeout(12000);
    
    // Click start button
    const startBtn = page.locator('button.restart-btn:not(.disabled)');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await page.waitForTimeout(2000);
    
    // Check timer
    const timerElement = page.locator('.hud-item').first();
    const initialText = await timerElement.textContent();
    console.log('Initial timer:', initialText);
    
    await page.waitForTimeout(3000);
    const after3s = await timerElement.textContent();
    console.log('After 3s:', after3s);
    
    await page.waitForTimeout(3000);
    const after6s = await timerElement.textContent();
    console.log('After 6s:', after6s);
    
    // The timer should decrease from 30s
    expect(after6s).not.toBe(initialText);
  });
});