import os
import re
import pytest
from playwright.sync_api import Page, expect


class TestAuthentication:
    def test_should_show_error_message_with_invalid_credentials(self, page: Page):
        """Validates that error alert is displayed when logging in with invalid credentials."""
        page.goto("/")

        # Fill in the login form with dummy data
        page.fill("#username", "non_existent_user")
        page.fill("#password", "wrong_password")

        # Click the login button
        page.click('button:has-text("Login")')

        # Check if error message appears
        error_alert = page.locator(".bg-red-50")
        expect(error_alert).to_be_visible()
        expect(error_alert).to_contain_text("Invalid username or password")

    def test_should_login_successfully_with_valid_credentials(self, page: Page):
        """Validates that valid admin credentials allow logging in and navigating away from login."""
        username = os.getenv("ADMIN_USERNAME")
        password = os.getenv("ADMIN_PASSWORD")

        if not username or not password:
            pytest.skip("No admin credentials configured in env file")

        page.goto("/")

        page.fill("#username", username)
        page.fill("#password", password)
        page.click('button:has-text("Login")')

        # Verify successful login
        expect(page.locator('button:has-text("Login")')).not_to_be_visible()
        expect(page).not_to_have_url(re.compile(r".*login.*"))

    def test_should_login_successfully_with_mro_credentials(self, page: Page):
        """Validates that MRO credentials allow logging in and navigating away from login."""
        username = os.getenv("MRO_USERNAME")
        password = os.getenv("MRO_PASSWORD")

        if not username or not password:
            pytest.skip("No MRO credentials configured in env file")

        page.goto("/")

        page.fill("#username", username)
        page.fill("#password", password)
        page.click('button:has-text("Login")')

        # Verify successful login
        expect(page.locator('button:has-text("Login")')).not_to_be_visible()
        expect(page).not_to_have_url(re.compile(r".*login.*"))
