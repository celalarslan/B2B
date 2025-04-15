import { test, expect } from '@playwright/test';

test.describe('Call Forwarding Flow', () => {
  test('complete call forwarding flow', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Verify the page title
    await expect(page).toHaveTitle(/Call Forwarding Assistant/);
    
    // Select a country
    await page.getByText('Select your country').click();
    await page.getByText('United States').click();
    
    // Select an operator
    await page.getByText('Select your operator').click();
    await page.getByText('AT&T').click();
    
    // Enter a phone number
    await page.getByLabel('Phone Number').fill('+1234567890');
    
    // Generate the code
    await page.getByRole('button', { name: 'Generate Code' }).click();
    
    // Verify the forwarding code is displayed
    await expect(page.getByText('Your Call Forwarding Code')).toBeVisible();
    await expect(page.getByText('*21*+1234567890#')).toBeVisible();
    
    // Verify the instructions are displayed
    await expect(page.getByText('How to use')).toBeVisible();
    
    // Test the copy button
    const copyButton = page.getByRole('button', { name: 'Copy to clipboard' });
    await copyButton.click();
    
    // Verify the "Copied!" message appears
    await expect(page.getByText('Copied!')).toBeVisible();
  });
  
  test('validates required fields', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Try to generate code without selecting anything
    const generateButton = page.getByRole('button', { name: 'Generate Code' });
    await expect(generateButton).toBeDisabled();
    
    // Select a country
    await page.getByText('Select your country').click();
    await page.getByText('United States').click();
    
    // Button should still be disabled
    await expect(generateButton).toBeDisabled();
    
    // Select an operator
    await page.getByText('Select your operator').click();
    await page.getByText('AT&T').click();
    
    // Button should still be disabled
    await expect(generateButton).toBeDisabled();
    
    // Enter a phone number
    await page.getByLabel('Phone Number').fill('+1234567890');
    
    // Now the button should be enabled
    await expect(generateButton).toBeEnabled();
  });
  
  test('handles form reset', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Fill out the form
    await page.getByText('Select your country').click();
    await page.getByText('United States').click();
    
    await page.getByText('Select your operator').click();
    await page.getByText('AT&T').click();
    
    await page.getByLabel('Phone Number').fill('+1234567890');
    
    // Reset the form
    await page.getByRole('button', { name: '' }).click(); // Reset button has no text, just an icon
    
    // Verify the form is reset
    await expect(page.getByText('Select your country')).toBeVisible();
    await expect(page.getByLabel('Phone Number')).toHaveValue('');
  });
});