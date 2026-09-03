#!/usr/bin/env python3
"""
Python Playwright Test Runner for Easy-LIMS.
Provides a unified CLI for running E2E tests, headed tests, HTML reporting, and UI debugging.
"""

import argparse
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from dotenv import load_dotenv


def check_server_available(url: str, timeout: float = 3.0) -> bool:
    """Checks if the web server URL is responsive."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Easy-LIMS-Test-Runner"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status in (200, 301, 302, 304, 404)
    except Exception:
        return False


def wait_for_server(url: str, timeout: float = 30.0) -> bool:
    """Polls until the server is ready or timeout is reached."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if check_server_available(url, timeout=1.0):
            return True
        time.sleep(0.5)
    return False


def is_local_url(url: str) -> bool:
    """Checks if a URL points to localhost or a local IP."""
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()
        return hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1")
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Easy-LIMS Playwright Python Test Runner",
        add_help=True,
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run tests in headed browser mode (visible UI)",
    )
    parser.add_argument(
        "--ui",
        action="store_true",
        help="Run tests in interactive UI/headed mode with tracing enabled",
    )
    parser.add_argument(
        "--e2e",
        action="store_true",
        help="Run headless end-to-end tests",
    )
    parser.add_argument(
        "--browser",
        default="chromium",
        choices=["chromium", "firefox", "webkit"],
        help="Browser engine to use (default: chromium)",
    )
    parser.add_argument(
        "-k",
        "--filter",
        dest="filter_expr",
        help="Run only tests matching the given substring expression",
    )
    parser.add_argument(
        "--env-file",
        default=os.getenv("TEST_ENV_FILE", "test.env"),
        help="Path to .env configuration file (default: test.env)",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Application base URL (defaults to APP_URL in env config, or BASE_URL)",
    )
    parser.add_argument(
        "--report-dir",
        default="playwright-report",
        help="Directory to save the HTML test report (default: playwright-report)",
    )
    parser.add_argument(
        "--show-report",
        action="store_true",
        help="Automatically open the HTML report in the browser after tests finish",
    )
    parser.add_argument(
        "--auto-server",
        action="store_true",
        default=True,
        help="Automatically spawn the dev server if it is local and not running (default: True)",
    )
    parser.add_argument(
        "--no-auto-server",
        dest="auto_server",
        action="store_false",
        help="Do not attempt to start the dev server automatically",
    )

    args, unknown_args = parser.parse_known_args()

    project_root = Path(__file__).resolve().parent.parent

    # Resolve and validate env file
    env_file_path = Path(args.env_file)
    if not env_file_path.is_absolute():
        env_file_path = project_root / args.env_file

    if not env_file_path.exists():
        print(
            f"\n[ERROR] '{env_file_path.name}' file is missing. Please create '{env_file_path.name}' using example file 'test.env.example'.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"[INFO] Using environment file: {env_file_path}")
    load_dotenv(dotenv_path=env_file_path, override=True)
    os.environ["TEST_ENV_FILE"] = str(env_file_path)

    # Base URL defaults to APP_URL from env config (e.g. http://test-easy-lims.onrender.com)
    base_url = (
        args.base_url
        or os.getenv("APP_URL")
        or os.getenv("BASE_URL")
        or "http://localhost:3000"
    )

    dev_proc = None
    if is_local_url(base_url):
        server_ready = check_server_available(base_url)
        if not server_ready and args.auto_server:
            print(f"[INFO] Local server at '{base_url}' is not running. Starting UI dev server via 'npm run dev'...", file=sys.stderr)
            try:
                dev_proc = subprocess.Popen(
                    ["npm", "run", "dev"],
                    cwd=str(project_root),
                    shell=(os.name == "nt"),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                print("[INFO] Waiting for dev server to start...", file=sys.stderr)
                if wait_for_server(base_url, timeout=25.0):
                    server_ready = True
                    print(f"[INFO] UI dev server started and responding at '{base_url}'!", file=sys.stderr)
                else:
                    print(f"[WARNING] UI dev server did not respond at '{base_url}' in time.", file=sys.stderr)
            except Exception as e:
                print(f"[WARNING] Could not automatically spawn dev server: {e}", file=sys.stderr)

        if not server_ready:
            print(
                f"[WARNING] Target server at '{base_url}' is not reachable.",
                file=sys.stderr,
            )
    else:
        print(f"[INFO] Target remote application URL: {base_url}")

    # Setup report path
    report_dir = project_root / args.report_dir
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / "index.html"

    pytest_cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(project_root / "tests"),
        f"--browser={args.browser}",
        f"--base-url={base_url}",
        f"--env-file={str(env_file_path)}",
        f"--html={str(report_file)}",
        "--self-contained-html",
    ]

    if args.headed or args.ui:
        pytest_cmd.append("--headed")

    if args.ui:
        pytest_cmd.extend(["--tracing=on"])

    if args.filter_expr:
        pytest_cmd.extend(["-k", args.filter_expr])

    if unknown_args:
        pytest_cmd.extend(unknown_args)

    print(f"[RUNNING] {' '.join(pytest_cmd)}")
    exit_code = 1
    try:
        result = subprocess.run(pytest_cmd, cwd=str(project_root))
        exit_code = result.returncode
    except KeyboardInterrupt:
        print("\n[INFO] Tests interrupted by user.", file=sys.stderr)
        exit_code = 130
    finally:
        if dev_proc is not None:
            print("[INFO] Terminating auto-spawned dev server...", file=sys.stderr)
            dev_proc.terminate()
            try:
                dev_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                dev_proc.kill()

    # Display report location
    if report_file.exists():
        report_url = report_file.as_uri()
        print("\n" + "=" * 70)
        print(f"[REPORT] HTML Report generated: {report_file}")
        print(f"[REPORT] Open in browser: {report_url}")
        print("=" * 70)

        if (args.show_report or args.headed or args.ui) and exit_code != 130:
            print("[INFO] Opening HTML report in your browser...")
            try:
                webbrowser.open(report_url)
            except Exception as e:
                print(f"[WARNING] Could not open browser automatically: {e}")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
