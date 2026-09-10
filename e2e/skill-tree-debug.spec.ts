import { test, expect } from '@playwright/test';

test.describe('Skill Tree Drag and Drop Debug', () => {
  test('debug skill tree drag functionality', async ({ page }) => {
    // Capture all console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const log = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(log);
      console.log('PLAYWRIGHT CONSOLE:', log);
    });

    page.on('pageerror', err => {
      console.log('PLAYWRIGHT PAGE ERROR:', err.message);
    });

    await page.goto('http://localhost:4000');
    
    // Wait for game to initialize
    await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Press 's' key to open skill tree
    console.log('Pressing "s" key to open skill tree...');
    await page.keyboard.press('s');
    await page.waitForTimeout(2000);
    
    // Check if skill tree overlay is visible
    const overlay = page.locator('.skill-tree-overlay');
    let isVisible = await overlay.isVisible({ timeout: 5000 });
    console.log('Skill tree overlay visible after "s" key:', isVisible);
    
    if (!isVisible) {
      // Try clicking a button to open skill tree
      const openBtn = page.locator('button[aria-label*="skill"]');
      const openBtnVisible = await openBtn.isVisible({ timeout: 5000 });
      console.log('Skill open button visible:', openBtnVisible);
      if (openBtnVisible) {
        await openBtn.click();
      }
      await page.waitForTimeout(2000);
      isVisible = await overlay.isVisible({ timeout: 5000 });
      console.log('Skill tree overlay visible after click:', isVisible);
    }
    
    await page.waitForTimeout(2000);
    
    // Print all console logs so far
    console.log('\n=== CONSOLE LOGS SO FAR ===');
    consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
    
    // If skill tree is open, try to drag it
    if (isVisible) {
      console.log('Skill tree is open, attempting to drag...');
      
      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/skill-tree-open.png', fullPage: true });
      console.log('Screenshot saved: skill-tree-open.png');
      
      // Get the panzoom canvas inside the skill tree
      const panzoomCanvas = page.locator('.skill-tree-panzoom');
      const panzoomVisible = await panzoomCanvas.isVisible({ timeout: 5000 });
      console.log('Panzoom canvas visible:', panzoomVisible);
      
      if (panzoomVisible) {
        // Get bounding box
        const panzoomBox = await panzoomCanvas.boundingBox();
        console.log('Panzoom bounding box:', panzoomBox);
        
        if (panzoomBox) {
          const centerX = panzoomBox.x + panzoomBox.width / 2;
          const centerY = panzoomBox.y + panzoomBox.height / 2;
          console.log('Center point for drag:', centerX, centerY);
          
          // Mousemove to center first
          await page.mouse.move(centerX, centerY);
          await page.waitForTimeout(300);
          
          // Mousedown at center - this should start the drag
          console.log('Mouse down to start drag...');
          await page.mouse.down();
          await page.waitForTimeout(300);
          
          // Mousemove to drag (move left by 50px)
          console.log('Dragging left...');
          await page.mouse.move(centerX - 50, centerY);
          await page.waitForTimeout(300);
          
          // Continue drag
          await page.mouse.move(centerX - 100, centerY);
          await page.waitForTimeout(300);
          
          // Mouseup
          console.log('Mouse up, ending drag...');
          await page.mouse.up();
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Check state after drag
      const nodes = page.locator('.skill-node');
      const nodeCount = await nodes.count();
      console.log('Number of skill nodes after drag:', nodeCount);
      
      // Take screenshot after drag
      await page.screenshot({ path: 'e2e/screenshots/skill-tree-after-drag.png', fullPage: true });
      console.log('Screenshot saved: skill-tree-after-drag.png');
    }
    
    // Print ALL console logs at the end
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
    
    // Final assertion
    const finalVisible = await overlay.isVisible({ timeout: 5000 });
    console.log('Final - Skill tree overlay visible:', finalVisible);
  });
});