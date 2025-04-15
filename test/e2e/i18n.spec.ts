import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('changes language and applies translations', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Check initial language (English)
    await expect(page.getByText('Call Forwarding Assistant')).toBeVisible();
    
    // Open language switcher
    await page.getByRole('button', { name: 'Change language' }).click();
    
    // Select Turkish
    await page.getByText('Turkish').click();
    
    // Verify Turkish translation is applied
    await expect(page.getByText('Çağrı Yönlendirme Asistanı')).toBeVisible();
    
    // Open language switcher again
    await page.getByRole('button', { name: 'Change language' }).click();
    
    // Select French
    await page.getByText('French').click();
    
    // Verify French translation is applied
    await expect(page.getByText('Assistant de Transfert d\'Appel')).toBeVisible();
    
    // Open language switcher again
    await page.getByRole('button', { name: 'Change language' }).click();
    
    // Select Arabic
    await page.getByText('Arabic').click();
    
    // Verify Arabic translation is applied and RTL direction
    await expect(page.getByText('مساعد تحويل المكالمات')).toBeVisible();
    
    // Check that the document direction is RTL
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    
    // Switch back to English
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByText('English').click();
    
    // Verify English translation is applied again
    await expect(page.getByText('Call Forwarding Assistant')).toBeVisible();
    
    // Check that the document direction is LTR
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
  
  test('language preference persists across page navigation', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Change language to French
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByText('French').click();
    
    // Verify French translation is applied
    await expect(page.getByText('Assistant de Transfert d\'Appel')).toBeVisible();
    
    // Navigate to download page
    await page.getByRole('link', { name: 'Download' }).click();
    
    // Verify French translation is still applied
    await expect(page.getByText('Téléchargez Notre Application')).toBeVisible();
    
    // Navigate back to home page
    await page.getByRole('link', { name: 'Back to Home' }).click();
    
    // Verify French translation is still applied
    await expect(page.getByText('Assistant de Transfert d\'Appel')).toBeVisible();
  });
  
  test('language affects AI assistant responses', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Change language to Turkish
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByText('Turkish').click();
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Verify the welcome message is in Turkish
    await expect(page.locator('div').filter({ hasText: /Merhaba! Ben AI asistanınızım/ })).toBeVisible();
    
    // Type and send a message in Turkish
    await page.getByPlaceholderText('Mesajınızı yazın...').fill('Yönlendirme kodu nedir?');
    await page.getByPlaceholderText('Mesajınızı yazın...').press('Enter');
    
    // Wait for the response
    await page.waitForResponse(response => 
      response.url().includes('openai.com/v1/chat/completions') && 
      response.status() === 200
    );
    
    // Close the assistant
    await page.getByRole('button', { name: 'Close' }).click();
    
    // Change language back to English
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByText('English').click();
    
    // Open the assistant again
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Verify the welcome message is in English
    await expect(page.locator('div').filter({ hasText: /Hello! I'm your AI assistant/ })).toBeVisible();
  });
});