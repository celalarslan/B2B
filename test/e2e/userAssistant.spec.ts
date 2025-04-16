import { test, expect } from '@playwright/test';

test.describe('User Assistant Interaction', () => {
  test('opens assistant and sends a message', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Verify the assistant is open
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    // Verify the welcome message is displayed
    await expect(page.locator('div').filter({ hasText: /Hello! I'm your AI assistant/ })).toBeVisible();
    
    // Type and send a message
    await page.getByPlaceholderText('Type your message...').fill('What is call forwarding?');
    await page.getByPlaceholderText('Type your message...').press('Enter');
    
    // Wait for the response
    await page.waitForResponse(response => 
      response.url().includes('openai.com/v1/chat/completions') && 
      response.status() === 200
    );
    
    // Verify the user message is displayed
    await expect(page.getByText('What is call forwarding?')).toBeVisible();
    
    // Verify that an assistant response is displayed (we can't check the exact content)
    await expect(page.locator('div[class*="rounded-tl-none"]').filter({ hasText: /.*/ })).toBeVisible();
  });
  
  test('handles voice input', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Click the voice input button
    await page.getByRole('button', { name: 'Start Voice Input' }).click();
    
    // Verify the recording state
    await expect(page.getByRole('button', { name: 'Stop Recording' })).toBeVisible();
    
    // Stop recording
    await page.getByRole('button', { name: 'Stop Recording' }).click();
    
    // Wait for processing to complete (this is a mock, so it might not actually process anything)
    await page.waitForTimeout(1000);
  });
  
  test('handles support request flow', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Send a message requesting help
    await page.getByPlaceholderText('Type your message...').fill('I need to speak to someone');
    await page.getByPlaceholderText('Type your message...').press('Enter');
    
    // Wait for the response asking for name
    await page.waitForResponse(response => 
      response.url().includes('openai.com/v1/chat/completions') && 
      response.status() === 200
    );
    
    // Provide name
    await page.getByPlaceholderText('Enter your information...').fill('John Doe');
    await page.getByPlaceholderText('Enter your information...').press('Enter');
    
    // Wait for the response asking for email
    await page.waitForTimeout(500);
    
    // Provide email
    await page.getByPlaceholderText('Enter your information...').fill('john@example.com');
    await page.getByPlaceholderText('Enter your information...').press('Enter');
    
    // Wait for the final confirmation
    await page.waitForTimeout(500);
    
    // Verify the confirmation message
    await expect(page.locator('div').filter({ hasText: /Thank you/ })).toBeVisible();
  });
  
  test('toggles mute state', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Click the mute button
    await page.getByRole('button', { name: 'Mute' }).click();
    
    // Verify the unmute button is now visible
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
    
    // Click the unmute button
    await page.getByRole('button', { name: 'Unmute' }).click();
    
    // Verify the mute button is visible again
    await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  });
  
  test('closes the assistant', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Close the assistant
    await page.getByRole('button', { name: 'Close' }).click();
    
    // Verify the assistant is closed
    await expect(page.getByText('AI Assistant')).not.toBeVisible();
  });
});