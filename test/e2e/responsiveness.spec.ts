import { test, expect } from '@playwright/test';

test.describe('Responsiveness', () => {
  test('adapts to desktop viewport', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the layout is appropriate for desktop
    const mainContent = await page.locator('main').boundingBox();
    if (mainContent) {
      expect(mainContent.width).toBeGreaterThan(800);
    }
    
    // Check that the form is centered
    const form = await page.locator('form').first().boundingBox();
    if (form && mainContent) {
      const formCenterX = form.x + form.width / 2;
      const mainCenterX = mainContent.x + mainContent.width / 2;
      expect(Math.abs(formCenterX - mainCenterX)).toBeLessThan(50); // Allow some margin of error
    }
  });
  
  test('adapts to tablet viewport', async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the layout is appropriate for tablet
    const mainContent = await page.locator('main').boundingBox();
    if (mainContent) {
      expect(mainContent.width).toBeLessThan(768);
      expect(mainContent.width).toBeGreaterThan(500);
    }
    
    // Check that the form is still usable
    await expect(page.getByText('Select your country')).toBeVisible();
  });
  
  test('adapts to mobile viewport', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Check that the layout is appropriate for mobile
    const mainContent = await page.locator('main').boundingBox();
    if (mainContent) {
      expect(mainContent.width).toBeLessThan(375);
    }
    
    // Check that the form is stacked vertically
    const countrySelector = await page.getByText('Select your country').boundingBox();
    const phoneInput = await page.getByLabel('Phone Number').boundingBox();
    
    if (countrySelector && phoneInput) {
      expect(phoneInput.y).toBeGreaterThan(countrySelector.y);
    }
    
    // Check that the assistant button is visible and properly positioned
    const assistantButton = await page.getByRole('button', { name: 'Get Help' }).boundingBox();
    if (assistantButton) {
      expect(assistantButton.x + assistantButton.width).toBeLessThanOrEqual(375);
      expect(assistantButton.y + assistantButton.height).toBeLessThanOrEqual(667);
    }
  });
  
  test('download page is responsive', async ({ page }) => {
    // Test different viewport sizes
    for (const viewport of [
      { width: 1280, height: 800 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]) {
      // Set viewport size
      await page.setViewportSize(viewport);
      
      // Navigate to the download page
      await page.goto('/download');
      
      // Check that the page title is visible
      await expect(page.getByRole('heading', { name: 'Download Our App' })).toBeVisible();
      
      // Check that the QR code is visible
      await expect(page.locator('img[alt="QR Code"]')).toBeVisible();
      
      // Check that the download button is visible
      await expect(page.getByRole('link', { name: 'Download App' })).toBeVisible();
      
      // For mobile, check that elements stack vertically
      if (viewport.width <= 768) {
        const qrCode = await page.locator('img[alt="QR Code"]').boundingBox();
        const downloadButton = await page.getByRole('link', { name: 'Download App' }).boundingBox();
        
        if (qrCode && downloadButton) {
          // On mobile, download button should be below QR code
          expect(downloadButton.y).toBeGreaterThan(qrCode.y);
        }
      }
    }
  });
  
  test('user assistant is responsive', async ({ page }) => {
    // Test different viewport sizes
    for (const viewport of [
      { width: 1280, height: 800 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]) {
      // Set viewport size
      await page.setViewportSize(viewport);
      
      // Navigate to the homepage
      await page.goto('/');
      
      // Open the assistant
      await page.getByRole('button', { name: 'Get Help' }).click();
      
      // Check that the assistant is visible
      await expect(page.getByText('AI Assistant')).toBeVisible();
      
      // Check that the assistant is properly sized
      const assistant = await page.locator('div').filter({ hasText: /AI Assistant/ }).first().boundingBox();
      if (assistant) {
        expect(assistant.width).toBeLessThanOrEqual(viewport.width);
        expect(assistant.height).toBeLessThanOrEqual(viewport.height);
      }
      
      // Close the assistant
      await page.getByRole('button', { name: 'Close' }).click();
    }
  });
});