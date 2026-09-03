#!/usr/bin/env python3
"""
Python Playwright Test Runner for Easy-LIMS.
Provides a unified CLI for running E2E tests, headed tests, HTML reporting, and UI debugging.
Uses APP_URL from the configured .env file to access the target UI.
"""

import argparse
import os
import subprocess
import sys
import webbrowser
from pathlib import Path
from dotenv import load_dotenv


def load_env_file_robustly(env_file_path: Path) -> dict:
    """
    Robustly loads environment variables from a file into os.environ.
    Handles UTF-8, UTF-8 with BOM, UTF-16 LE/BE, and Latin-1 encodings,
    as well as stripping quotes, trailing carriage returns, and whitespace.
    """
    parsed = {}
    content = ""

    # Try reading with multiple encodings
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
        help="Application base URL (defaults to APP_URL in env config)",
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
    parsed_env = load_env_file_robustly(env_file_path)
    os.environ["TEST_ENV_FILE"] = str(env_file_path)

    # Base URL: check APP_URL, case-insensitive, or fallback to BASE_URL / API_URL
    base_url = (
        args.base_url
        or os.getenv("APP_URL")
        or os.getenv("app_url")
        or parsed_env.get("APP_URL")
        or parsed_env.get("app_url")
        or os.getenv("BASE_URL")
        or parsed_env.get("BASE_URL")
        or os.getenv("API_URL")
        or parsed_env.get("API_URL")
    )

    if not base_url:
        found_keys = list(parsed_env.keys())
        print(
            f"\n[ERROR] 'APP_URL' is not defined in '{env_file_path.name}'.",
            file=sys.stderr,
        )
        if found_keys:
            print(f"[DEBUG] Keys found in '{env_file_path.name}': {found_keys}", file=sys.stderr)
        else:
            print(f"[DEBUG] No environment variables could be parsed from '{env_file_path.name}' (file may be empty or use unsupported encoding).", file=sys.stderr)
        print("Please configure APP_URL to access the UI (e.g. APP_URL=http://test-easy-lims.onrender.com).\n", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Target application UI URL: {base_url}")

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
