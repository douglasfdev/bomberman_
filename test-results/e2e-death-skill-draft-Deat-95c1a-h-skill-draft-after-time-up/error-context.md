# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\death-skill-draft.spec.ts >> Death Skill Draft Flow >> shows death skill draft after time up
- Location: e2e\death-skill-draft.spec.ts:4:7

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('button.restart-btn')
Expected pattern: not /disabled/
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "not toHaveClass" with timeout 10000ms
  - waiting for locator('button.restart-btn')

```

```yaml
- text: ⏱️ 19s ❤️ 3 🛡️ 0
- button "🌳 0"
- text: "Pontos: 180 Inimigos: 3 Bombas: 3 Alcance: 2"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Death Skill Draft Flow', () => {
  4  |   test('shows death skill draft after time up', async ({ page }) => {
  5  |     test.setTimeout(300000); // 5 minutes
  6  |     
  7  |     page.on('console', msg => {
  8  |       console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  9  |     });
  10 |     page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  11 |     
  12 |     await page.goto('http://localhost:4000');
  13 |     
  14 |     // Wait for game to initialize
  15 |     await page.waitForSelector('canvas', { state: 'visible' });
  16 |     await page.waitForTimeout(3000);
  17 |     
  18 |     // Click start button (no paywall in dev mode)
  19 |     const startBtn = page.locator('button.restart-btn');
> 20 |     await expect(startBtn).not.toHaveClass(/disabled/, { timeout: 10000 });
     |                                ^ Error: expect(locator).not.toHaveClass(expected) failed
  21 |     console.log('Start button enabled, clicking...');
  22 |     await startBtn.click();
  23 |     await page.waitForTimeout(3000);
  24 |     
  25 |     // Check timer is running
  26 |     const timerElement = page.locator('.hud-item').first();
  27 |     const initialTimer = await timerElement.textContent();
  28 |     console.log('Initial timer:', initialTimer);
  29 |     
  30 |     // Wait for timer to run out (30 seconds + buffer)
  31 |     console.log('Waiting for timer to run out...');
  32 |     await page.waitForTimeout(35000);
  33 |     
  34 |     // Wait a bit more for Angular to process the state change
  35 |     await page.waitForTimeout(1000);
  36 |     
  37 |     // Check if death skill draft appears - wait for it to be attached first
  38 |     const deathDraft = page.locator('app-death-skill-draft');
  39 |     await deathDraft.waitFor({ state: 'attached', timeout: 15000 });
  40 |     console.log('Death skill draft attached!');
  41 |     
  42 |     // Check available skills
  43 |     const skillCards = page.locator('.card');
  44 |     const count = await skillCards.count();
  45 |     console.log('Available cards count:', count);
  46 |     expect(count).toBeGreaterThan(0);
  47 |     
  48 |     // Take screenshot
  49 |     await page.screenshot({ path: 'e2e/screenshots/death-draft-test.png', fullPage: true });
  50 |   });
  51 | });
```