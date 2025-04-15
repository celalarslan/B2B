import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('loads the homepage within acceptable time', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Log the load time
    console.log(`Page load time: ${loadTime}ms`);
    
    // Check that the page loads within an acceptable time (e.g., 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Check that the main content is visible
    await expect(page.locator('main')).toBeVisible();
  });
  
  test('renders form components quickly', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Measure time to render form components
    const startTime = Date.now();
    
    // Wait for form components to be visible
    await expect(page.getByText('Select your country')).toBeVisible();
    await expect(page.getByLabel('Phone Number')).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    
    // Log the render time
    console.log(`Form components render time: ${renderTime}ms`);
    
    // Check that the form components render within an acceptable time (e.g., 1 second)
    expect(renderTime).toBeLessThan(1000);
  });
  
  test('AI assistant opens quickly', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Measure time to open the assistant
    const startTime = Date.now();
    
    // Open the assistant
    await page.getByRole('button', { name: 'Get Help' }).click();
    
    // Wait for the assistant to be visible
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    const openTime = Date.now() - startTime;
    
    // Log the open time
    console.log(`Assistant open time: ${openTime}ms`);
    
    // Check that the assistant opens within an acceptable time (e.g., 500ms)
    expect(openTime).toBeLessThan(500);
  });
  
  test('language switching is performant', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Measure time to switch language
    const startTime = Date.now();
    
    // Open language switcher
    await page.getByRole('button', { name: 'Change language' }).click();
    
    // Select Turkish
    await page.getByText('Turkish').click();
    
    // Wait for the translation to be applied
    await expect(page.getByText('Çağrı Yönlendirme Asistanı')).toBeVisible();
    
    const switchTime = Date.now() - startTime;
    
    // Log the switch time
    console.log(`Language switch time: ${switchTime}ms`);
    
    // Check that the language switch happens within an acceptable time (e.g., 1 second)
    expect(switchTime).toBeLessThan(1000);
  });
  
  test('code generation is performant', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Fill out the form
    await page.getByText('Select your country').click();
    await page.getByText('United States').click();
    
    await page.getByText('Select your operator').click();
    await page.getByText('AT&T').click();
    
    await page.getByLabel('Phone Number').fill('+1234567890');
    
    // Measure time to generate code
    const startTime = Date.now();
    
    // Generate the code
    await page.getByRole('button', { name: 'Generate Code' }).click();
    
    // Wait for the code to be displayed
    await expect(page.getByText('Your Call Forwarding Code')).toBeVisible();
    
    const generateTime = Date.now() - startTime;
    
    // Log the generate time
    console.log(`Code generation time: ${generateTime}ms`);
    
    // Check that the code generation happens within an acceptable time (e.g., 500ms)
    expect(generateTime).toBeLessThan(500);
  });
});