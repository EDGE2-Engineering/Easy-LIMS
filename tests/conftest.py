import os
from pathlib import Path
import pytest
from dotenv import load_dotenv
from playwright.sync_api import Page

ROOT_DIR = Path(__file__).resolve().parent.parent


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
    load_dotenv(dotenv_path=env_path, override=True)


@pytest.fixture(scope="session")
def base_url(base_url):
    """
    Returns the base URL for tests.
    Defaults to APP_URL from env config, then BASE_URL, then http://localhost:3000.
    """
    if base_url:
        return base_url
    return os.getenv("APP_URL") or os.getenv("BASE_URL") or "http://localhost:3000"


@pytest.fixture(autouse=True)
def configure_timeouts(page: Page):
    """
    Sets default action and navigation timeouts to 15,000ms,
    matching Playwright configuration.
    """
    page.set_default_timeout(15000)
    page.set_default_navigation_timeout(15000)
    yield
