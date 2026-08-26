import { test, expect } from '@playwright/test';

test.describe('Death Skill Draft Flow', () => {
  test('shows death skill draft after time up', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://localhost:4000');
    
    // Wait for game to initialize
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000);
    
    // Click start button (no paywall in dev mode)
    const startBtn = page.locator('button.restart-btn');
    await expect(startBtn).not.toHaveClass(/disabled/, { timeout: 10000 });
    console.log('Start button enabled, clicking...');
    await startBtn.click();
    await page.waitForTimeout(3000);
    
    // Check timer is running
    const timerElement = page.locator('.hud-item').first();
    const initialTimer = await timerElement.textContent();
    console.log('Initial timer:', initialTimer);
    
    // Wait for timer to run out (30 seconds + buffer)
    console.log('Waiting for timer to run out...');
    await page.waitForTimeout(35000);
    
    // Check if death skill draft appears - wait for it to be attached first
    const deathDraft = page.locator('app-death-skill-draft');
    await deathDraft.waitFor({ state: 'attached', timeout: 10000 });
    console.log('Death skill draft attached!');
    
    // Check available skills
    const skillCards = page.locator('.card');
    const count = await skillCards.count();
    console.log('Available cards count:', count);
    expect(count).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/death-draft-test.png', fullPage: true });
  });
});