from __future__ import annotations

import datetime as dt
import html
import importlib
import importlib.util
import json
import os
import tempfile
from pathlib import Path
from typing import Any

from .constants import DEFAULT_ICON_TEMPLATE, DEFAULT_WORDMARK_TEMPLATE, POSTER_CSS_TEMPLATE, POSTER_HTML_TEMPLATE, SKILL_DIR


def emit(payload: dict[str, Any], code: int = 0) -> int:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return code


def success(command: str, **fields: Any) -> int:
    payload: dict[str, Any] = {"ok": True, "command": command, "warnings": []}
    payload.update(fields)
    payload.setdefault("warnings", [])
    return emit(payload)


def failure(command: str, code: str, message: str, hint: str | None = None, exit_code: int = 1) -> int:
    error: dict[str, str] = {"code": code, "message": message}
    if hint:
        error["hint"] = hint
    return emit({"ok": False, "command": command, "error": error}, exit_code)


def dependency_available(module: str) -> bool:
    return importlib.util.find_spec(module) is not None


def chromium_status() -> dict[str, Any]:
    if not dependency_available("playwright"):
        return {"installed": False, "error": "PLAYWRIGHT_MISSING"}
    try:
        playwright_sync_api = importlib.import_module("playwright.sync_api")
        sync_playwright = playwright_sync_api.sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            browser.close()
        return {"installed": True}
    except Exception as exc:
        return {"installed": False, "error": exc.__class__.__name__, "hint": "Run `python -m playwright install chromium` in this uv environment"}


def required_templates() -> list[Path]:
    return [POSTER_HTML_TEMPLATE, POSTER_CSS_TEMPLATE, DEFAULT_ICON_TEMPLATE, DEFAULT_WORDMARK_TEMPLATE]


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def render_template(template: str, values: dict[str, object]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace("{{" + key + "}}", str(value))
    return rendered


def fmt_date(ts: int | None) -> str:
    return dt.datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""


def fmt_dur(seconds: int) -> str:
    seconds = int(seconds or 0)
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def load_json_file(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_error_message(exc: Exception) -> str:
    return exc.__class__.__name__


def is_safe_cleanup_path(path: Path) -> bool:
    try:
        resolved = path.resolve()
    except OSError:
        return False
    temp_root = Path(tempfile.gettempdir()).resolve()
    if resolved == temp_root:
        return False
    try:
        resolved.relative_to(temp_root)
        return True
    except ValueError:
        return False
