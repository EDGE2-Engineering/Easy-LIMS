# Automated Testing Guide for Easy-LIMS (Python Playwright)

This document provides instructions, methodology, test inventories, and best practices for developers performing automated tests on the **Easy-LIMS** platform using Python and Playwright.

---

## 1. Test Architecture Overview

Easy-LIMS uses **Python Playwright** with **pytest** (`pytest-playwright`) as its primary End-to-End (E2E) testing framework.

- **Target Application UI**: Configured directly via `APP_URL` in `test.env` (e.g. `http://test-easy-lims.onrender.com`).
- **Test Framework**: `pytest-playwright` / `playwright` for Python (sync API).
- **Test Directory**: `tests/` (`test_*.py`).
- **Test Runner**: `tests/run_tests.py` (CLI wrapper) and `pytest`.
- **Environment Configuration**: `test.env` (loaded automatically by `tests/conftest.py`).

---

## 2. Environment Setup & Prerequisites

Before running tests, ensure `test.env` exists with the target application configuration:

### Step 1: Create `test.env` from Example
If `test.env` does not exist in the root directory, create it from `test.env.example`:

```bash
cp test.env.example test.env
```

> **Note**: If `test.env` is missing, tests will fail immediately with an informative error prompting you to create it from `test.env.example`.

### Step 2: Configure Credentials & URLs in `test.env`
Update `test.env` with target credentials and application URL:

```env
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=gw123
MRO_USERNAME=superadmin
MRO_PASSWORD=gw123
APP_URL=https://test-easy-lims.onrender.com
HEADLESS=false
```

> **Note for LLMs**: Tests in `test_admin.py` and authenticated tests in `test_auth.py` require valid credentials in `test.env`. If credentials are not present, tests will be automatically skipped using `pytest.skip()`.

### Step 3: Install Test Dependencies & Playwright Browsers
Install Python requirements and browser binaries:

```bash
pip install -r tests/requirements.txt
python -m playwright install chromium
```

---

## 3. Available Test Suites & Inventory

| Test File | Suite Name | Description | Key Verifications |
| :--- | :--- | :--- | :--- |
| [`scenarios/test_auth.py`](./scenarios/test_auth.py) | **Authentication** | Validates user login behaviors with valid & invalid credentials. | - Invalid credentials error alert (`.bg-red-50`) display.<br>- Successful authentication and navigation away from login page using `ADMIN_USERNAME` & `ADMIN_PASSWORD`. |
| [`scenarios/test_admin.py`](./scenarios/test_admin.py) | **Admin User Workflow** | Verifies administrative features, navigation, and dashboard components. | - Operational Dashboard visibility & key metrics ("Active Jobs", "Total Clients").<br>- Jobs management page loading & "New Job" button.<br>- Clients management page loading via Settings & "Add Client" button.<br>- Documents list & "Create Document" button.<br>- System settings user list & user search input (`input[placeholder="Search users..."]`). |

---

## 4. How LLMs and Developers Should Execute Tests

### Command Reference

| Goal | Command | Description |
| :--- | :--- | :--- |
| **Run All Tests (Headless / E2E)** | `python tests/run_tests.py --e2e`<br>or `make test-e2e` / `.\make.ps1 test-e2e` / `npm run test:e2e` | Runs Playwright tests headlessly. Auto-starts dev server if not running. Generates HTML report. |
| **Run All Tests (Headed Mode)** | `python tests/run_tests.py --headed`<br>or `make test` / `.\make.ps1 test` / `npm test` | Runs tests with visible browser window and opens HTML report on completion. |
| **Run Tests with Custom `.env` File** | `.\make.ps1 test dev.env`<br>`.\make.ps1 .\dev.env`<br>`make test ENV_FILE=dev.env`<br>`python tests/run_tests.py --env-file dev.env` | Executes tests using the specified environment configuration file instead of `test.env`. |
| **Run Tests in Interactive / Tracing Mode** | `python tests/run_tests.py --ui`<br>or `make test-ui` / `.\make.ps1 test-ui` / `npm run test:ui` | Runs tests with tracing enabled for debugging. |
| **Run Specific Test File** | `python -m pytest tests/scenarios/test_auth.py`<br>or `python tests/run_tests.py -k test_auth` | Runs only the specified test module or filter. |
| **Run Single Test by Name** | `python tests/run_tests.py -k "invalid_credentials"` | Filters execution to test cases matching the string pattern. |
| **View HTML Test Report** | `playwright-report/index.html` | Self-contained HTML report generated automatically after each test run and opened in browser. |
| **View Pytest Trace Artifacts** | `python -m playwright show-trace <trace.zip>` | Opens trace file in Playwright Trace Viewer. |

---

## 5. Test Methodology & Standard Operating Procedures (SOP for LLMs)

When tasked with running, writing, or debugging tests in Easy-LIMS, LLMs must follow these operational rules:

### 1. Pre-Run Checks
1. Check if `test.env` exists and contains non-placeholder values for `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Ensure the dev server is responsive or allow `tests/run_tests.py` to auto-spawn it.
3. If ports `3000` or `8000` are blocked by stale processes, execute `make stop` or `./make.ps1 stop` before proceeding.

### 2. Standard Selector Strategy
- Prefer text-based selectors: `page.locator('button:has-text("...")')` or `page.locator('h1:has-text("...")')`.
- Prefer route-specific link selectors like `page.click('a[href*="settings/clients"]')` when dropdown descriptions contain the same text (e.g. "Send Email communication to clients").
- Prefer ARIA role / accessible selectors: `page.locator('button[role="tab"]:has-text("Users")')`.
- Fall back to clean CSS selectors or form field IDs: `#username`, `#password`.
- Avoid brittle XPath selectors.

### 3. Handling Asynchronous UI States
- Easy-LIMS UI components load asynchronously. Always await element state or navigation before asserting UI elements.
- Wait for loaders to disappear before asserting content visibility:
  ```python
  page.wait_for_selector('text=Initializing Admin Dashboard...', state='hidden')
  ```
- Default action and navigation timeouts are configured to `15,000ms` in `tests/conftest.py`.

### 4. Authoring New Test Suites
When creating a new test file under `tests/`:
1. Use standard naming convention: `test_<feature_name>.py`.
2. Use Python `playwright.sync_api` types: `Page`, `expect`.
3. Wrap test cases inside a test class or functions prefixed with `test_`.
4. Include credential validation and call `pytest.skip('No credentials provided in test.env')` if required environment variables are absent.
5. Update this `README.md` to document any newly added test suites or scenarios.

---

## 6. Troubleshooting & Diagnostics

- **Trace Viewer**: Traces can be recorded with `--ui` or `--tracing=on`. View trace logs using:
  ```bash
  python -m playwright show-trace <path-to-trace.zip>
  ```
- **Server Shutdown**: To force kill running backend/frontend dev server processes:
  ```bash
  make stop
  # or
  .\make.ps1 stop
  ```
