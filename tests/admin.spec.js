import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: 'test.env' });

test.describe('Admin User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the admin login page
    await page.goto('/');

    // Login as admin
    const username = process.env.ADMIN_USERNAME || process.env.username || 'superadmin';
    const password = process.env.ADMIN_PASSWORD || process.env.password || 'gw123';
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button:has-text("Login")');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*settings\/dashboard/);
    
    // Wait for the dashboard loader to disappear if it exists
    await page.waitForSelector('text=Initializing Admin Dashboard...', { state: 'hidden' });
  });

  test('should see administrative dashboard', async ({ page }) => {
    // Check for the Operational Dashboard header
    await expect(page.locator('h1:has-text("Operational Dashboard")')).toBeVisible();
    
    // Check for some dashboard stats indicators
    await expect(page.locator('text=Active Jobs')).toBeVisible();
    await expect(page.locator('text=Total Clients')).toBeVisible();
  });

  test('should list jobs', async ({ page }) => {
    // Navigate via the sidebar/navbar
    await page.click('nav a:has-text("Jobs")');
    await expect(page).toHaveURL(/.*settings\/jobs/);
    
    // Check for "New Job" button
    await expect(page.locator('button:has-text("New Job")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should list clients', async ({ page }) => {
    // Navigate via the Settings dropdown (Admin has it there)
    await page.click('button:has-text("Settings")');
    await page.click('a:has-text("Clients")');
    await expect(page).toHaveURL(/.*settings\/clients/);
    
    // Check for "Add Client" button
    await expect(page.locator('button:has-text("Add Client")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should list documents', async ({ page }) => {
    // Navigate via the sidebar/navbar
    await page.click('nav a:has-text("Documents")');
    await expect(page).toHaveURL(/.*settings\/documents/);
    
    // Check for "Create Document" button
    await expect(page.locator('button:has-text("Create Document")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should list users in system settings', async ({ page }) => {
    // Navigate to System settings via the Settings dropdown
    await page.click('button:has-text("Settings")');
    await page.click('a:has-text("System")');
    await expect(page).toHaveURL(/.*settings\/system/);

    // Click on the Users tab
    await page.click('button[role="tab"]:has-text("Users")');
    
    // Verify user list header
    await expect(page.locator('h1:has-text("Users")')).toBeVisible();
    await expect(page.locator('input[placeholder="Search users..."]')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
