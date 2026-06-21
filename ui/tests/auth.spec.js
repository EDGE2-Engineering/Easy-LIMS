
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show error message with invalid credentials', async ({ page }) => {
    // Go to the login page
    await page.goto('/');

    // Fill in the login form with dummy data
    await page.fill('#username', 'non_existent_user');
    await page.fill('#password', 'wrong_password');

    // Click the login button
    await page.click('button:has-text("Login")');

    // Check if error message appears
    const errorAlert = page.locator('.bg-red-50');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid username or password');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Uses credentials from test.env
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      test.skip('No credentials provided in test.env');
    }

    await page.goto('/');

    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button:has-text("Login")');

    // Verify successful login
    // Since we don't know the exact landing page after login, 
    // we look for common post-login indicators like a logout button or user profile
    // Alternatively, check that we are no longer on the login page
    await expect(page.locator('button:has-text("Login")')).not.toBeVisible();
    
    // Check for a known element after login, e.g., the Navbar or a specific dashboard element
    // Based on AdminLogin.jsx, it calls onLoginSuccess() which usually redirects or changes state
    await expect(page).not.toHaveURL(/.*login.*/);
  });
});
