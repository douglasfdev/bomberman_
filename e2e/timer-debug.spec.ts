import { test, expect } from '@playwright/test';

test.describe('Timer Debug', () => {
  test('check timer HUD updates after paywall', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));
    
    await page.goto('http://localhost:4000');
    
    // Wait for game to initialize
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    
    // Check initial timer before clicking start
    const timerElement = page.locator('.hud-item').first();
    await expect(timerElement).toBeVisible();
    const beforeStart = await timerElement.textContent();
    console.log('Timer before start:', beforeStart);
    
    // Check button state initially
    const startBtn = page.locator('button.restart-btn');
    const initialClass = await startBtn.getAttribute('class');
    console.log('Initial button class:', initialClass);
    
    // Wait for paywall timer to complete (15 seconds to be safe)
    console.log('Waiting for paywall timer...');
    await page.waitForTimeout(15000);
    
    // Check button state after wait
    const afterWaitClass = await startBtn.getAttribute('class');
    console.log('Button class after wait:', afterWaitClass);
    
    // Check waitTimer value via component instance
    const waitTimerValue = await page.evaluate(() => {
      const app = document.querySelector('app-game');
      if (app && app['__ngContext__']) {
        const lView = app['__ngContext__'].lView;
        if (lView && lView[1]) {
          return lView[1].waitTimer?.() ?? 'not found in lView[1]';
        }
      }
      return 'no context';
    });
    console.log('waitTimer value:', waitTimerValue);
    
    const canPlayValue = await page.evaluate(() => {
      const app = document.querySelector('app-game');
      if (app && app['__ngContext__']) {
        const lView = app['__ngContext__'].lView;
        if (lView && lView[1]) {
          return lView[1].canPlay?.() ?? 'not found in lView[1]';
        }
      }
      return 'no context';
    });
    console.log('canPlay value:', canPlayValue);
    
    // Click to start game if enabled
    if (!afterWaitClass?.includes('disabled')) {
      console.log('Start button found, clicking...');
      await startBtn.click();
      await page.waitForTimeout(2000);
      
      // Check timer element
      const initialText = await timerElement.textContent();
      console.log('Initial timer after click:', initialText);
      
      // Wait and check if timer decreases
      await page.waitForTimeout(3000);
      const after3s = await timerElement.textContent();
      console.log('After 3s:', after3s);
      
      await page.waitForTimeout(3000);
      const after6s = await timerElement.textContent();
      console.log('After 6s:', after6s);
    } else {
      console.log('Button still disabled after 15s');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/timer-debug.png', fullPage: true });
  });

  test('debug game phase and run state', async ({ page }) => {
    await page.goto('http://localhost:4000');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    
    // Check game phase signal
    const phase = await page.evaluate(() => {
      // Access Angular component
      const app = document.querySelector('app-game');
      if (app && app['__ngContext__']) {
        // Try to access component instance
        return 'Component found';
      }
      return 'No component access';
    });
    console.log('Phase check:', phase);
    
    // Check runState in console
    await page.evaluate(() => {
      // Try to access runState service
      console.log('Checking runState...');
    });
    
    await page.waitForTimeout(5000);
  });
});