from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

from .api import AVID_RE, extract_bvid, fetch_comments, fetch_view, resolve_input_url
from .constants import SKILL_DIR
from .rendering import render_html, screenshot_html
from .runtime import chromium_status, dependency_available, failure, is_safe_cleanup_path, load_json_file, required_templates, safe_error_message, success


def command_doctor(_: argparse.Namespace) -> int:
    deps = {name: dependency_available(name) for name in ["requests", "PIL", "qrcode", "playwright"]}
    chromium = chromium_status()
    missing_templates = [str(path) for path in required_templates() if not path.exists()]
    warnings: list[str] = []
    if not all(deps.values()):
        missing = ", ".join(name for name, ok in deps.items() if not ok)
        warnings.append(f"missing optional runtime dependencies: {missing}")
    if missing_templates:
        warnings.append("missing templates/assets")
    if not chromium["installed"]:
        warnings.append("playwright chromium is not installed or cannot launch")
    return success(
        "doctor",
        data={
            "skill_dir": str(SKILL_DIR),
            "templates_ok": not missing_templates,
            "missing_templates": missing_templates,
            "dependencies": deps,
            "chromium": chromium,
            "tmp_writable": os.access(tempfile.gettempdir(), os.W_OK),
        },
        warnings=warnings,
    )


def command_probe(args: argparse.Namespace) -> int:
    data: dict[str, Any] = {"templates": {path.name: path.exists() for path in required_templates()}}
    warnings: list[str] = []
    if args.url:
        resolved, display_url = resolve_input_url(args.url)
        data["input"] = {"resolved": resolved, "display_url": display_url, "bvid": extract_bvid(resolved)}
        if not data["input"]["bvid"]:
            warnings.append("no BV id detected in probed input")
    return success("probe", data=data, warnings=warnings)


def command_generate(args: argparse.Namespace) -> int:
    try:
        resolved_text, detected_display_url = resolve_input_url(args.url)
        display_url = args.display_url or detected_display_url
        bvid = extract_bvid(resolved_text)
        aid_match = AVID_RE.search(resolved_text)
        if not bvid and not aid_match:
            return failure("generate", "NO_VIDEO_ID", "No BV or AV id found in input", "Pass --url with a Bilibili URL, BV id, AV id, or b23.tv shortlink", 2)
        view = load_json_file(Path(args.view_json)) if args.view_json else fetch_view(bvid or "", aid_match.group(1) if aid_match else None)
        if not bvid:
            bvid = str(view.get("bvid") or "")
        if not bvid:
            return failure("generate", "NO_BVID", "Video metadata did not include a BV id", None, 2)
        comments = load_json_file(Path(args.comments_json)) if args.comments_json else fetch_comments(int(view.get("aid") or 0), args.comment_count)
        if isinstance(comments, dict):
            comments = (comments.get("data") or {}).get("replies") or []
        if not isinstance(comments, list):
            comments = []
        out = Path(args.out)
        assets = Path(args.assets_dir) if args.assets_dir else Path(tempfile.gettempdir()) / f"bilibili-poster-{bvid}_assets"
        html_out = out if args.format == "html" else out.with_suffix(".html")
        fixture_mode = bool(args.view_json or args.comments_json)
        html_path = render_html(view, comments, assets, Path(args.icon) if args.icon else None, Path(args.wordmark) if args.wordmark else None, html_out, args.comment_limit, display_url, allow_network_assets=args.allow_remote_assets and not fixture_mode)
        if args.format == "png":
            screenshot_html(html_path, out)
            if not args.keep_html:
                html_path.unlink(missing_ok=True)
            return success("generate", output=str(out), media=str(out), file=str(out), mime="image/png", data={"bvid": bvid, "html": str(html_path) if args.keep_html else None})
        return success("generate", output=str(html_path), file=str(html_path), mime="text/html", data={"bvid": bvid, "assets": str(assets)})
    except Exception as exc:
        print(f"generate failed: {exc.__class__.__name__}: {exc}", file=sys.stderr)
        return failure("generate", "GENERATE_FAILED", safe_error_message(exc), "Run `bilibili_publish_cli.py doctor` and verify network/runtime dependencies", 1)


def command_cleanup(args: argparse.Namespace) -> int:
    removed: list[str] = []
    warnings: list[str] = []
    for raw in args.paths:
        path = Path(raw)
        if not is_safe_cleanup_path(path):
            warnings.append(f"refused unsafe cleanup path: {path}")
            continue
        try:
            if path.is_dir():
                shutil.rmtree(path)
                removed.append(str(path))
            elif path.exists():
                path.unlink()
                removed.append(str(path))
        except Exception as exc:
            warnings.append(f"failed to remove {path}: {exc}")
    return success("cleanup", removed=removed, warnings=warnings)


def command_self_test(args: argparse.Namespace) -> int:
    with tempfile.TemporaryDirectory(prefix="bilibili-publish-self-test-") as td:
        tmp = Path(td)
        out = tmp / ("poster.png" if args.png else "poster.html")
        html_out = out.with_suffix(".html") if args.png else out
        view = {"bvid": "BV1Ai9eBKEU4", "aid": 123456, "title": "自检视频", "pic": "https://example.com/blocked.jpg", "duration": 83, "stat": {"reply": 1, "danmaku": 2}, "owner": {"name": "自检UP"}}
        comments = [{"member": {"uname": "自检用户", "avatar": "https://example.com/avatar.jpg"}, "content": {"message": "自检评论"}, "like": 1, "ctime": 1700000000, "rcount": 0}]
        try:
            render_html(view, comments, tmp / "assets", None, None, html_out, 128, None, allow_network_assets=False)
            if args.png:
                screenshot_html(html_out, out)
        except Exception as exc:
            print(f"self-test failed: {exc.__class__.__name__}: {exc}", file=sys.stderr)
            return failure("self-test", "SELF_TEST_FAILED", safe_error_message(exc), None, 1)
        if not out.exists():
            return failure("self-test", "SELF_TEST_FAILED", "Fixture generation failed", None, 1)
        return success("self-test", data={"output_exists": True}, output=str(out), file=str(out), mime="image/png" if args.png else "text/html")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Stable CLI for Bilibili poster publishing workflows")
    sub = parser.add_subparsers(dest="command", required=True)
    doctor = sub.add_parser("doctor", help="Check local templates, dependencies, and writable temp directory")
    doctor.set_defaults(func=command_doctor)
    probe = sub.add_parser("probe", help="Check templates and optionally parse/resolve an input URL")
    probe.add_argument("--url", help="Optional Bilibili URL, BV/AV text, or b23.tv shortlink to inspect")
    probe.set_defaults(func=command_probe)
    self_test = sub.add_parser("self-test", help="Run a local fixture-based smoke test")
    self_test.add_argument("--png", action="store_true", help="Also launch Playwright Chromium and render a PNG fixture")
    self_test.set_defaults(func=command_self_test)
    generate = sub.add_parser("generate", help="Generate a Bilibili poster as PNG or HTML")
    generate.add_argument("--url", required=True, help="Bilibili URL, BV/AV text, share text, or b23.tv shortlink")
    generate.add_argument("--out", required=True, help="Output .png or .html path")
    generate.add_argument("--format", choices=["png", "html"], default="png")
    generate.add_argument("--view-json", help="Local Bilibili view fixture JSON for offline/test generation")
    generate.add_argument("--comments-json", help="Local comments fixture JSON for offline/test generation")
    generate.add_argument("--icon", help="Optional Bilibili icon image supplied by the user")
    generate.add_argument("--wordmark", help="Optional Bilibili wordmark/header image supplied by the user")
    generate.add_argument("--display-url", help="Optional real display/QR URL, e.g. user-supplied https://b23.tv/<token>")
    generate.add_argument("--comment-limit", type=int, default=128)
    generate.add_argument("--comment-count", type=int, default=2)
    generate.add_argument("--assets-dir", help="Optional asset cache directory")
    generate.add_argument("--allow-remote-assets", action="store_true", help="Allow downloading whitelisted Bilibili/CDN cover and avatar assets. Disabled for fixture mode.")
    generate.add_argument("--keep-html", action="store_true")
    generate.set_defaults(func=command_generate)
    cleanup = sub.add_parser("cleanup", help="Remove generated files or asset directories")
    cleanup.add_argument("paths", nargs="*")
    cleanup.set_defaults(func=command_cleanup)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)
