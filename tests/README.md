# Automated Testing Guide for Easy-LIMS

This document provides instructions, methodology, test inventories, and best practices for developers performing automated tests on the **Easy-LIMS** platform.

---

## 1. Test Architecture Overview

Easy-LIMS uses **Playwright** as its primary End-to-End (E2E) testing framework.

- **Frontend Application**: React / Vite UI running on `http://localhost:3000` (or served via FastAPI).
- **Backend API**: Python FastAPI server running on `http://localhost:8000`.
- **Test Framework**: `@playwright/test` (v1.50+).
- **Test Directory**: `tests/`
- **Environment Configuration**: `test.env` (loaded automatically by `playwright.config.js` and individual spec files).

---

## 2. Environment Setup & Prerequisites

Before running tests, ensure the test environment is configured:

### Step 1: Initialize Test Environment File
If `test.env` does not exist in the root directory, create it from `test.env.example`:

```bash
cp test.env.example test.env
```

Or run the Makefile initialization command:

```bash
make init-test
```

### Step 2: Configure Credentials & URLs in `test.env`
Update `test.env` with valid target credentials:

```env
# Application Base API URL
API_URL=http://localhost:8000

# Admin Test Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

> **Note for LLMs**: Tests in `admin.spec.js` and authenticated tests in `auth.spec.js` require valid credentials in `test.env`. If credentials are not present, tests will be automatically skipped using `test.skip()`.

### Step 3: Install Playwright Browsers
Ensure browser binaries are installed:

```bash
npx playwright install
```

---

## 3. Available Test Suites & Inventory

| Test File | Suite Name | Description | Key Verifications |
| :--- | :--- | :--- | :--- |
| [`auth.spec.js`](./auth.spec.js) | **Authentication** | Validates user login behaviors with valid & invalid credentials. | - Invalid credentials error alert (`.bg-red-50`) display.<br>- Successful authentication and navigation away from login page using `ADMIN_USERNAME` & `ADMIN_PASSWORD`. |
| [`admin.spec.js`](./admin.spec.js) | **Admin User Workflow** | Verifies administrative features, navigation, and dashboard components. | - Operational Dashboard visibility & key metrics ("Active Jobs", "Total Clients").<br>- Jobs management page loading & "New Job" button.<br>- Clients management page loading via Settings & "Add Client" button.<br>- Documents list & "Create Document" button.<br>- System settings user list & user search input (`input[placeholder="Search users..."]`). |

---

## 4. How LLMs Should Execute Tests

### Command Reference

| Goal | Command | Description |
| :--- | :--- | :--- |
| **Run All Tests (Headless / E2E)** | `npm run test:e2e`<br>or `make test-e2e` | Runs Playwright tests headlessly in background. Ideal for CI and LLM automated verification. |
| **Run All Tests (Headed Mode)** | `npm test`<br>or `make test` | Runs tests with visible browser window and opens Playwright HTML report on completion. |
| **Run Tests in Interactive UI** | `npm run test:ui`<br>or `make test-ui` | Opens Playwright interactive UI runner for interactive debugging. |
| **Run Specific Test File** | `npx playwright test tests/auth.spec.js` | Runs only the specified test spec file. |
| **Run Single Test by Name** | `npx playwright test -g "should login successfully"` | Filters execution to test cases matching the string pattern. |
| **View Test HTML Report** | `npx playwright show-report` | Opens the generated HTML report from `playwright-report/`. |

---

## 5. Test Methodology & Standard Operating Procedures (SOP for LLMs)

When tasked with running, writing, or debugging tests in Easy-LIMS, LLMs must follow these operational rules:

### 1. Pre-Run Checks
1. Check if `test.env` exists and contains non-placeholder values for `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Ensure the dev server is stopped or clean before test execution, or rely on Playwright's automatic `webServer` configuration.
3. If ports `3000` or `8000` are blocked by stale processes, execute `make stop` before proceeding.

### 2. Standard Selector Strategy
- Prefer text-based selectors: `page.locator('button:has-text("...")')` or `page.locator('h1:has-text("...")')`.
- Prefer route-specific link selectors like `page.click('a[href*="settings/clients"]')` when dropdown descriptions contain the same text (e.g. "Send Email communication to clients").
- Prefer ARIA role / accessible selectors: `page.locator('button[role="tab"]:has-text("Users")')`.
- Fall back to clean CSS selectors or form field IDs: `#username`, `#password`.
- Avoid brittle XPath selectors.

### 3. Handling Asynchronous UI States
- Easy-LIMS UI components load asynchronously. Always await element state or navigation before asserting UI elements.
- Wait for loaders to disappear before asserting content visibility:
  ```js
  await page.waitForSelector('text=Initializing Admin Dashboard...', { state: 'hidden' });
  ```
- Default action and expect timeouts are configured to `15,000ms` in `playwright.config.js`.

### 4. Authoring New Test Suites
When creating a new test file under `tests/`:
1. Use standard naming convention: `<feature_name>.spec.js`.
2. Load environment variables using `dotenv.config({ path: 'test.env' })`.
3. Wrap test cases inside `test.describe('<Feature Category>', () => { ... })`.
4. Include credential validation and call `test.skip('No credentials provided in test.env')` if required environment variables are absent.
5. Update this `README.md` to document any newly added test suites or scenarios.

---

## 6. Troubleshooting & Diagnostics

- **Trace Viewer**: Traces are recorded automatically on first retry. View trace logs using:
  ```bash
  npx playwright show-trace test-results/<test-folder>/trace.zip
  ```
- **Test Artifacts**: Test artifacts, screenshots, and videos (if enabled) are located in `test-results/` and `playwright-report/`.
- **Server Shutdown**: To force kill running backend/frontend dev server processes:
  ```bash
  make stop
  ```
