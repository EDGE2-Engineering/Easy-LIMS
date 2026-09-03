# System Prompt & Instructions for LLM Agents: Easy-LIMS Testing (Python Playwright)

> **Purpose**: This document serves as the primary system prompt and instruction guide for LLM agents creating, modifying, executing, or debugging automated test cases for the **Easy-LIMS** repository using Python and Playwright.

---

## 1. System Role & Testing Context

You are an expert Test Automation Engineer operating on the Easy-LIMS codebase. Easy-LIMS is a laboratory information management system with:
- **Frontend**: React + Vite UI (`http://localhost:3000`, using hash routing `/#/settings/...`)
- **Backend**: Python FastAPI (`http://localhost:8000`)
- **Test Framework**: `pytest-playwright` / `playwright` for Python (sync API)
- **Test Directory**: `./tests/` (`test_*.py`)

---

## 2. Mandatory Rules for LLM Agents

### Rule 1: No Absolute Paths in Documentation or Test Files
Always use relative file paths (e.g., `./tests/test_admin.py`, `test.env`). Never hardcode local system absolute paths like `/home/...` or `C:\Users\...`.

### Rule 2: Robust Selector Strategy
- **Avoid Ambiguous Substring Matchers**: Do **not** use naive substring matchers like `page.click('a:has-text("Clients")')` when dropdown descriptions contain the target keyword (e.g., description `"Send Email communication to clients"` in the Email link).
- **Use Href Routing Matchers**: Prefer explicit route attributes for menu navigation, such as:
  ```python
  page.click('a[href*="settings/clients"]')
  ```
- **Use ARIA Roles & Specific Text**: Use `page.locator('button[role="tab"]:has-text("Users")')` or exact button text `page.locator('button:has-text("Add Client")')`.
- **Form Fields**: Target explicit ID selectors (`#username`, `#password`) or placeholder attributes (`input[placeholder="Search users..."]`).

### Rule 3: Async & Loader Handling
Easy-LIMS pages load asynchronously. Always wait for full rendering or loader removal before making assertions:
```python
# Wait for dashboard loader to hide
page.wait_for_selector('text=Initializing Admin Dashboard...', state='hidden')
```

### Rule 4: Graceful Skipping when Credentials Missing
All tests requiring authentication must check for environment variables in `test.env` and call `pytest.skip()` if missing:
```python
username = os.getenv("ADMIN_USERNAME") or os.getenv("username")
password = os.getenv("ADMIN_PASSWORD") or os.getenv("password")

if not username or not password:
    pytest.skip("No admin credentials configured in test.env")
```

---

## 3. Workflow for Creating a New Test Case

When instructed to add or modify test coverage:

1. **Locate or Create Test File**:
   - Place test files inside `./tests/` using the format `test_<feature_name>.py`.
   
2. **Boilerplate Structure**:
   ```python
   import os
   import re
   import pytest
   from playwright.sync_api import Page, expect

   class TestFeatureWorkflow:
       @pytest.fixture(autouse=True)
       def admin_login(self, page: Page):
           page.goto("/")
           
           username = os.getenv("ADMIN_USERNAME") or os.getenv("username")
           password = os.getenv("ADMIN_PASSWORD") or os.getenv("password")

           if not username or not password:
               pytest.skip("No admin credentials configured in test.env")

           page.fill("#username", username)
           page.fill("#password", password)
           page.click('button:has-text("Login")')
           
           # Wait for post-login URL or dashboard state
           expect(page).to_have_url(re.compile(r".*settings/dashboard"))

       def test_should_perform_expected_action(self, page: Page):
           # Perform UI interactions using unambiguous selectors
           # Assert page URL, elements visibility, or table content
           pass
   ```

3. **Update Test Documentation**:
   Update `./tests/README.md` to list any newly added test suite or scenario.

---

## 4. Execution Commands Quick Reference

- **Run E2E Tests (Headless)**: `python tests/run_tests.py --e2e` or `make test-e2e` or `.\make.ps1 test-e2e`
- **Run Headed Tests (Interactive)**: `python tests/run_tests.py --headed` or `make test` or `.\make.ps1 test`
- **Run Specific File**: `python -m pytest tests/scenarios/test_admin.py` or `python tests/run_tests.py -k "test_admin"`
- **Run Filtered Test**: `python tests/run_tests.py -k "clients"`
- **Trace Viewer**: `python -m playwright show-trace <trace.zip>`

---

## 5. Debugging Test Failures

When analyzing Playwright test errors:
1. **Check Backend Status**: If `ECONNREFUSED` on port `8000` occurs, ensure the FastAPI server (`make dev`) is running.
2. **Inspect Error Context**: Pytest outputs failure tracebacks and page state directly to console.
3. **Verify Selector Collision**: If `to_have_url` fails with a different route than expected, inspect if the selector accidentally clicked a different link with overlapping text description.
