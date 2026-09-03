import os
import re
import pytest
from playwright.sync_api import Page, expect


class TestAdminWorkflow:
    @pytest.fixture(autouse=True)
    def admin_login(self, page: Page):
        """Logs into Easy-LIMS with admin credentials prior to each test in this suite."""
        # Go to the admin login page
        page.goto("/")

        # Login as admin using ADMIN_USERNAME and ADMIN_PASSWORD
        username = os.getenv("ADMIN_USERNAME")
        password = os.getenv("ADMIN_PASSWORD")

        if not username or not password:
            pytest.skip("No admin credentials configured in env file")

        page.fill("#username", username)
        page.fill("#password", password)
        page.click('button:has-text("Login")')

        # Wait for navigation to dashboard
        expect(page).to_have_url(re.compile(r".*settings/dashboard"))

        # Wait for the dashboard loader to disappear if it exists
        page.wait_for_selector("text=Initializing Admin Dashboard...", state="hidden")

    def test_should_see_administrative_dashboard(self, page: Page):
        """Verifies administrative operational dashboard visibility and summary counters."""
        expect(page.locator('h1:has-text("Operational Dashboard")')).to_be_visible()
        expect(page.locator("text=Active Jobs")).to_be_visible()
        expect(page.locator("text=Total Clients")).to_be_visible()

    def test_should_list_jobs(self, page: Page):
        """Verifies jobs list page navigation and action buttons."""
        page.click('nav a:has-text("Jobs")')
        expect(page).to_have_url(re.compile(r".*settings/jobs"))
        expect(page.locator('button:has-text("New Job")')).to_be_visible()
        expect(page.locator("table")).to_be_visible()

    def test_should_list_clients(self, page: Page):
        """Verifies client settings navigation and Add Client action button."""
        page.click('button:has-text("Settings")')
        page.click('a[href*="settings/clients"]')
        expect(page).to_have_url(re.compile(r".*settings/clients"))
        expect(page.locator('button:has-text("Add Client")')).to_be_visible()
        expect(page.locator("table")).to_be_visible()

    def test_should_list_documents(self, page: Page):
        """Verifies documents list navigation and Create Document action button."""
        page.click('nav a:has-text("Documents")')
        expect(page).to_have_url(re.compile(r".*settings/documents"))
        expect(page.locator('button:has-text("Create Document")')).to_be_visible()
        expect(page.locator("table")).to_be_visible()

    def test_should_list_users_in_system_settings(self, page: Page):
        """Verifies system settings navigation and user management tab."""
        page.click('button:has-text("Settings")')
        page.click('a:has-text("System")')
        expect(page).to_have_url(re.compile(r".*settings/system"))

        page.click('button[role="tab"]:has-text("Users")')
        expect(page.locator('h1:has-text("Users")')).to_be_visible()
        expect(page.locator('input[placeholder="Search users..."]')).to_be_visible()
        expect(page.locator("table")).to_be_visible()
