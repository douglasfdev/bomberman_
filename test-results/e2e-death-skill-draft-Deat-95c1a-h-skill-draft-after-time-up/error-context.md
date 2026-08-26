# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\death-skill-draft.spec.ts >> Death Skill Draft Flow >> shows death skill draft after time up
- Location: e2e\death-skill-draft.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000/
Call log:
  - navigating to "http://localhost:4000/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "Não é possível acessar esse site" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - text: A conexão com
      - strong [ref=e9]: localhost
      - text: foi recusada.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Tente:"
      - list [ref=e12]:
        - listitem [ref=e13]: Verificar a conexão
        - listitem [ref=e14]:
          - link "Verificar o proxy e o firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Recarregar" [ref=e19] [cursor=pointer]
    - button "Saiba mais" [ref=e20] [cursor=pointer]
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
> 12 |     await page.goto('http://localhost:4000');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000/
  13 |     
  14 |     // Wait for game to initialize
  15 |     await page.waitForSelector('canvas', { state: 'visible' });
  16 |     await page.waitForTimeout(3000);
  17 |     
  18 |     // Click start button (no paywall in dev mode)
  19 |     const startBtn = page.locator('button.restart-btn');
  20 |     await expect(startBtn).not.toHaveClass(/disabled/, { timeout: 10000 });
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
  34 |     // Check if death skill draft appears - wait for it to be attached first
  35 |     const deathDraft = page.locator('app-death-skill-draft');
  36 |     await deathDraft.waitFor({ state: 'attached', timeout: 10000 });
  37 |     console.log('Death skill draft attached!');
  38 |     
  39 |     // Check available skills
  40 |     const skillCards = page.locator('.card');
  41 |     const count = await skillCards.count();
  42 |     console.log('Available cards count:', count);
  43 |     expect(count).toBeGreaterThan(0);
  44 |     
  45 |     // Take screenshot
  46 |     await page.screenshot({ path: 'e2e/screenshots/death-draft-test.png', fullPage: true });
  47 |   });
  48 | });
```