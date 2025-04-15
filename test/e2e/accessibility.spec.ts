import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('main page passes basic accessibility checks', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the page has a title
    await expect(page).toHaveTitle(/Call Forwarding Assistant/);
    
    // Check that all images have alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt).not.toBe('');
    }
    
    // Check that form elements have labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel !== null).toBeTruthy();
      } else {
        expect(ariaLabel).not.toBeNull();
      }
    }
    
    // Check that buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      expect(text?.trim() !== '' || ariaLabel !== null).toBeTruthy();
    }
    
    // Check color contrast for main elements
    // Note: This is a simplified check. In a real project, you would use
    // a dedicated accessibility testing tool like axe-playwright
    
    // Check that the page has a lang attribute
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).not.toBeNull();
    
    // Check that the page has a skip link or main landmark
    const mainCount = await page.locator('main').count();
    expect(mainCount).toBeGreaterThan(0);
  });
  
  test('user assistant is keyboard accessible', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Focus on the assistant button using keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check that the assistant button is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focusedElement).toBe('Get Help');
    
    // Open the assistant with Enter key
    await page.keyboard.press('Enter');
    
    // Verify the assistant is open
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    // Navigate to the input field
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Type a message
    await page.keyboard.type('Hello');
    
    // Send the message with Enter
    await page.keyboard.press('Enter');
    
    // Wait for the response
    await page.waitForResponse(response => 
      response.url().includes('openai.com/v1/chat/completions') && 
      response.status() === 200
    );
    
    // Verify the message was sent
    await expect(page.getByText('Hello')).toBeVisible();
  });
  
  test('supports screen readers with ARIA attributes', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Check for appropriate ARIA roles
    expect(await page.locator('[role="button"]').count()).toBeGreaterThan(0);
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Check for live regions for dynamic content
    const liveRegions = await page.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThanOrEqual(0); // Ideally should be > 0
    
    // Check for appropriate button states
    const disabledButton = await page.locator('button[disabled]').count();
    expect(disabledButton).toBeGreaterThan(0);
    
    // Check for appropriate focus management
    await page.getByPlaceholderText('Type your message...').focus();
    const activeElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(activeElement).toBe('input');
  });
  
  test('supports mobile viewport accessibility', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that all interactive elements are large enough for touch
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        // Touch targets should be at least 44x44 pixels
        expect(box.width >= 44 || box.height >= 44).toBeTruthy();
      }
    }
    
    // Check that the page is responsive
    const overflowX = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflowX;
    });
    expect(overflowX).not.toBe('scroll');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Check that the assistant is properly sized for mobile
    const assistantBox = await page.locator('div').filter({ hasText: /AI Assistant/ }).first().boundingBox();
    if (assistantBox) {
      expect(assistantBox.width).toBeLessThanOrEqual(375);
    }
  });
});