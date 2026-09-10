# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skill-tree-debug.spec.ts >> Skill Tree Drag and Drop Debug >> debug skill tree drag functionality
- Location: e2e\skill-tree-debug.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000/
Call log:
  - navigating to "http://localhost:4000/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Skill Tree Drag and Drop Debug', () => {
  4   |   test('debug skill tree drag functionality', async ({ page }) => {
  5   |     // Capture all console logs
  6   |     const consoleLogs: string[] = [];
  7   |     page.on('console', msg => {
  8   |       const log = `${msg.type()}: ${msg.text()}`;
  9   |       consoleLogs.push(log);
  10  |       console.log('PLAYWRIGHT CONSOLE:', log);
  11  |     });
  12  | 
  13  |     page.on('pageerror', err => {
  14  |       console.log('PLAYWRIGHT PAGE ERROR:', err.message);
  15  |     });
  16  | 
> 17  |     await page.goto('http://localhost:4000');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000/
  18  |     
  19  |     // Wait for game to initialize
  20  |     await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
  21  |     await page.waitForTimeout(3000);
  22  |     
  23  |     // Press 's' key to open skill tree
  24  |     console.log('Pressing "s" key to open skill tree...');
  25  |     await page.keyboard.press('s');
  26  |     await page.waitForTimeout(2000);
  27  |     
  28  |     // Check if skill tree overlay is visible
  29  |     const overlay = page.locator('.skill-tree-overlay');
  30  |     let isVisible = await overlay.isVisible({ timeout: 5000 });
  31  |     console.log('Skill tree overlay visible after "s" key:', isVisible);
  32  |     
  33  |     if (!isVisible) {
  34  |       // Try clicking a button to open skill tree
  35  |       const openBtn = page.locator('button[aria-label*="skill"]');
  36  |       const openBtnVisible = await openBtn.isVisible({ timeout: 5000 });
  37  |       console.log('Skill open button visible:', openBtnVisible);
  38  |       if (openBtnVisible) {
  39  |         await openBtn.click();
  40  |       }
  41  |       await page.waitForTimeout(2000);
  42  |       isVisible = await overlay.isVisible({ timeout: 5000 });
  43  |       console.log('Skill tree overlay visible after click:', isVisible);
  44  |     }
  45  |     
  46  |     await page.waitForTimeout(2000);
  47  |     
  48  |     // Print all console logs so far
  49  |     console.log('\n=== CONSOLE LOGS SO FAR ===');
  50  |     consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
  51  |     
  52  |     // If skill tree is open, try to drag it
  53  |     if (isVisible) {
  54  |       console.log('Skill tree is open, attempting to drag...');
  55  |       
  56  |       // Take screenshot
  57  |       await page.screenshot({ path: 'e2e/screenshots/skill-tree-open.png', fullPage: true });
  58  |       console.log('Screenshot saved: skill-tree-open.png');
  59  |       
  60  |       // Get the panzoom canvas inside the skill tree
  61  |       const panzoomCanvas = page.locator('.skill-tree-panzoom');
  62  |       const panzoomVisible = await panzoomCanvas.isVisible({ timeout: 5000 });
  63  |       console.log('Panzoom canvas visible:', panzoomVisible);
  64  |       
  65  |       if (panzoomVisible) {
  66  |         // Get bounding box
  67  |         const panzoomBox = await panzoomCanvas.boundingBox();
  68  |         console.log('Panzoom bounding box:', panzoomBox);
  69  |         
  70  |         if (panzoomBox) {
  71  |           const centerX = panzoomBox.x + panzoomBox.width / 2;
  72  |           const centerY = panzoomBox.y + panzoomBox.height / 2;
  73  |           console.log('Center point for drag:', centerX, centerY);
  74  |           
  75  |           // Mousemove to center first
  76  |           await page.mouse.move(centerX, centerY);
  77  |           await page.waitForTimeout(300);
  78  |           
  79  |           // Mousedown at center - this should start the drag
  80  |           console.log('Mouse down to start drag...');
  81  |           await page.mouse.down();
  82  |           await page.waitForTimeout(300);
  83  |           
  84  |           // Mousemove to drag (move left by 50px)
  85  |           console.log('Dragging left...');
  86  |           await page.mouse.move(centerX - 50, centerY);
  87  |           await page.waitForTimeout(300);
  88  |           
  89  |           // Continue drag
  90  |           await page.mouse.move(centerX - 100, centerY);
  91  |           await page.waitForTimeout(300);
  92  |           
  93  |           // Mouseup
  94  |           console.log('Mouse up, ending drag...');
  95  |           await page.mouse.up();
  96  |         }
  97  |       }
  98  |       
  99  |       await page.waitForTimeout(2000);
  100 |       
  101 |       // Check state after drag
  102 |       const nodes = page.locator('.skill-node');
  103 |       const nodeCount = await nodes.count();
  104 |       console.log('Number of skill nodes after drag:', nodeCount);
  105 |       
  106 |       // Take screenshot after drag
  107 |       await page.screenshot({ path: 'e2e/screenshots/skill-tree-after-drag.png', fullPage: true });
  108 |       console.log('Screenshot saved: skill-tree-after-drag.png');
  109 |     }
  110 |     
  111 |     // Print ALL console logs at the end
  112 |     console.log('\n=== ALL CONSOLE LOGS ===');
  113 |     consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
  114 |     
  115 |     // Final assertion
  116 |     const finalVisible = await overlay.isVisible({ timeout: 5000 });
  117 |     console.log('Final - Skill tree overlay visible:', finalVisible);
```