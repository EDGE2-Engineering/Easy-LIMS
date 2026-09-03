import html
import inspect
import os
from pathlib import Path
import pytest
from dotenv import load_dotenv
from playwright.sync_api import Page

ROOT_DIR = Path(__file__).resolve().parent.parent


def load_env_file_robustly(env_file_path: Path) -> dict:
    """
    Robustly loads environment variables from a file into os.environ.
    Handles UTF-8, UTF-8 with BOM, UTF-16 LE/BE, and Latin-1 encodings,
    as well as stripping quotes, trailing carriage returns, and whitespace.
    """
    parsed = {}
    content = ""

    for encoding in ("utf-8-sig", "utf-8", "utf-16", "utf-16-le", "utf-16-be", "cp1252", "latin-1"):
        try:
            with open(env_file_path, "r", encoding=encoding) as f:
                text = f.read()
                if "\x00" not in text:
                    content = text
                    break
        except Exception:
            continue

    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, val = line.split("=", 1)
            key = key.strip().lstrip("\ufeff\xef\xbb\xbf")
            val = val.strip().strip("\r\n")
            if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
                val = val[1:-1]
            if key:
                parsed[key] = val
                os.environ[key] = val

    try:
        load_dotenv(dotenv_path=env_file_path, override=True)
    except Exception:
        pass

    return parsed


def pytest_addoption(parser):
    parser.addoption(
        "--env-file",
        action="store",
        default=os.getenv("TEST_ENV_FILE", "test.env"),
        help="Path to .env file to load (default: test.env)",
    )


def pytest_configure(config):
    env_file_opt = config.getoption("--env-file", default=None) or os.getenv("TEST_ENV_FILE", "test.env")
    env_path = Path(env_file_opt)
    if not env_path.is_absolute():
        env_path = ROOT_DIR / env_file_opt

    if not env_path.exists():
        raise pytest.UsageError(
            f"'{env_path.name}' file is missing. Please create '{env_path.name}' using example file 'test.env.example'."
        )

    print(f"\n[INFO] Loaded environment configuration from: {env_path}")
    load_env_file_robustly(env_path)


@pytest.fixture(scope="session")
def base_url(base_url):
    """
    Returns the target application URL for tests from APP_URL.
    """
    if base_url:
        return base_url
    app_url = (
        os.getenv("APP_URL")
        or os.getenv("app_url")
        or os.getenv("BASE_URL")
        or os.getenv("API_URL")
    )
    if not app_url:
        raise pytest.UsageError("APP_URL is not set in the environment file.")
    return app_url


@pytest.fixture(autouse=True)
def configure_timeouts(page: Page):
    """
    Sets default action and navigation timeouts for tests.
    """
    page.set_default_timeout(20000)
    page.set_default_navigation_timeout(30000)
    yield


def get_headless_setting():
    val = os.getenv("HEADLESS") or os.getenv("headless")
    if val is not None:
        v = val.strip().lower()
        if v in ("true", "1", "yes", "on"):
            return True
        elif v in ("false", "0", "no", "off"):
            return False
    return None


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    """
    Overrides Playwright launch options to respect headless=true/false
    from the environment configuration file.
    """
    launch_args = dict(browser_type_launch_args)
    headless_setting = get_headless_setting()
    if headless_setting is not None:
        launch_args["headless"] = headless_setting
    return launch_args


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Captures the test function's docstring (pydoc) and stores it on the test report.
    """
    outcome = yield
    report = outcome.get_result()
    test_fn = getattr(item, "function", None) or getattr(item, "_obj", None)
    doc = getattr(test_fn, "__doc__", "") or ""
    report.description = inspect.cleandoc(doc) if doc else ""


def pytest_html_results_table_header(cells):
    """
    Inserts a 'Description' column header into the HTML report results table.
    """
    cells.insert(
        2,
        '<th class="sortable" data-column-type="description">Description</th>',
    )


def pytest_html_results_table_row(report, cells):
    """
    Populates the 'Description' column cell using the test function's pydoc.
    """
    description = getattr(report, "description", "") or ""
    escaped_desc = html.escape(description)
    cells.insert(2, f'<td class="col-description">{escaped_desc}</td>')

