#!/usr/bin/env python3
"""Stable CLI for Bilibili publishing workflows.

The CLI owns repeatable execution for Bilibili poster generation. It emits JSON
on stdout for every subcommand so skills can call it without ad-hoc scripts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import importlib
import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.parse
from io import BytesIO
from pathlib import Path
from typing import Any


BVID_RE = re.compile(r"(BV[0-9A-Za-z]{10})")
AVID_RE = re.compile(r"(?:av|AV)(\d+)")
B23_RE = re.compile(r"https?://b23\.tv/[0-9A-Za-z]+")
HEADERS = {
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
}
ALLOWED_ASSET_HOST_SUFFIXES = (
    ".hdslb.com",
    ".bilibili.com",
    ".bilivideo.com",
    ".biliimg.com",
)
SKILL_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = SKILL_DIR / "templates"
DEFAULT_ICON_TEMPLATE = TEMPLATE_DIR / "bilibili-gradient-icon.png"
DEFAULT_WORDMARK_TEMPLATE = TEMPLATE_DIR / "bilibili-header-wordmark-transparent.png"
POSTER_HTML_TEMPLATE = TEMPLATE_DIR / "bilibili-poster.html"
POSTER_CSS_TEMPLATE = TEMPLATE_DIR / "bilibili-poster.css"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
WORDMARK_FONT = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"


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


def load_font(size: int, bold: bool = False):
    ImageFont = importlib.import_module("PIL.ImageFont")

    candidates = [WORDMARK_FONT if bold else FONT_B, FONT_B, FONT_R]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
    return ImageFont.load_default()


def crop_nonwhite(src: Path, pad: int = 8):
    Image = importlib.import_module("PIL.Image")

    im = Image.open(src).convert("RGBA")
    rgb = im.convert("RGB")
    pix = rgb.load()
    if pix is None:
        return im
    xs: list[int] = []
    ys: list[int] = []
    for y in range(rgb.height):
        for x in range(rgb.width):
            pixel = rgb.getpixel((x, y))
            if not isinstance(pixel, tuple):
                continue
            r, g, b = int(pixel[0]), int(pixel[1]), int(pixel[2])
            if not (r > 245 and g > 245 and b > 245):
                xs.append(x)
                ys.append(y)
    if not xs:
        return im
    return im.crop((max(0, min(xs) - pad), max(0, min(ys) - pad), min(im.width, max(xs) + pad + 1), min(im.height, max(ys) + pad + 1)))


def default_icon(out: Path) -> str:
    Image = importlib.import_module("PIL.Image")
    ImageDraw = importlib.import_module("PIL.ImageDraw")

    if DEFAULT_ICON_TEMPLATE.exists():
        Image.open(DEFAULT_ICON_TEMPLATE).convert("RGB").save(out)
        return out.as_uri()
    im = Image.new("RGB", (240, 240), (251, 114, 153))
    d = ImageDraw.Draw(im)
    font = load_font(44, bold=True)
    d.rounded_rectangle((28, 58, 212, 182), radius=28, fill="white")
    d.line((80, 58, 58, 30), fill="white", width=13)
    d.line((160, 58, 182, 30), fill="white", width=13)
    d.ellipse((82, 103, 104, 125), fill=(251, 114, 153))
    d.ellipse((136, 103, 158, 125), fill=(251, 114, 153))
    d.text((48, 184), "bilibili", font=font, fill="white")
    im.save(out)
    return out.as_uri()


def prepare_icon(src: Path | None, out: Path) -> str:
    Image = importlib.import_module("PIL.Image")
    ImageDraw = importlib.import_module("PIL.ImageDraw")

    if src and src.exists():
        im = crop_nonwhite(src, 10).convert("RGB")
        side = max(im.size)
        bg = Image.new("RGB", (side, side), "white")
        bg.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        bg = bg.resize((240, 240), Image.Resampling.LANCZOS)
        mask = Image.new("L", (240, 240), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 240, 240), radius=44, fill=255)
        final = Image.new("RGB", (240, 240), "white")
        final.paste(bg, (0, 0), mask)
        final.save(out)
        return out.as_uri()
    return default_icon(out)


def prepare_wordmark(src: Path | None, icon_uri: str, out: Path) -> str:
    Image = importlib.import_module("PIL.Image")
    ImageDraw = importlib.import_module("PIL.ImageDraw")

    if src and src.exists():
        im = crop_nonwhite(src, 12)
        target_h = 120
        nw = int(im.width * target_h / im.height)
        im = im.resize((nw, target_h), Image.Resampling.LANCZOS)
        if nw > 560:
            im = im.crop((0, 0, 560, target_h))
        im.save(out)
        return out.as_uri()
    if DEFAULT_WORDMARK_TEMPLATE.exists():
        Image.open(DEFAULT_WORDMARK_TEMPLATE).save(out)
        return out.as_uri()
    icon_path = Path(icon_uri.replace("file://", ""))
    icon = Image.open(icon_path).convert("RGBA").resize((104, 104), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (560, 126), (255, 255, 255, 0))
    canvas.paste(icon, (0, 11), icon)
    draw = ImageDraw.Draw(canvas)
    font = load_font(64, bold=True)
    x = 126
    for ch in "哔哩哔哩":
        draw.text((x + 2, 24), ch, font=font, fill=(251, 114, 153, 130))
        draw.text((x, 22), ch, font=font, fill=(17, 24, 39, 255))
        x += int(draw.textlength(ch, font=font)) + 4
    canvas.save(out)
    return out.as_uri()


def safe_error_message(exc: Exception) -> str:
    return exc.__class__.__name__


def is_allowed_asset_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or host == "localhost":
        return False
    if re.fullmatch(r"\d+(?:\.\d+){3}", host) or ":" in host:
        return False
    return any(host.endswith(suffix) or host == suffix.removeprefix(".") for suffix in ALLOWED_ASSET_HOST_SUFFIXES)


def download(url: str | None, out: Path, *, allow_network: bool) -> str:
    if not url:
        return ""
    if not allow_network:
        return ""
    url = url.replace("http://", "https://")
    if not is_allowed_asset_url(url):
        return ""
    requests = importlib.import_module("requests")

    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    out.write_bytes(r.content)
    return out.as_uri()


def make_qr(text: str, out: Path, icon_path: Path) -> str:
    qrcode = importlib.import_module("qrcode")
    qrcode_constants = importlib.import_module("qrcode.constants")
    Image = importlib.import_module("PIL.Image")
    ImageDraw = importlib.import_module("PIL.ImageDraw")

    qr = qrcode.QRCode(error_correction=qrcode_constants.ERROR_CORRECT_H, box_size=8, border=5)
    qr.add_data(text)
    qr.make(fit=True)
    raw_qr = qr.make_image(fill_color="#111827", back_color="white")
    qr_buffer = BytesIO()
    raw_qr.save(qr_buffer)
    qr_buffer.seek(0)
    qr_img = Image.open(qr_buffer).convert("RGB")
    qr_img.thumbnail((276, 276), Image.Resampling.LANCZOS)
    img = Image.new("RGB", (320, 320), "white")
    img.paste(qr_img, ((320 - qr_img.width) // 2, (320 - qr_img.height) // 2))
    logo = Image.open(icon_path).convert("RGB").resize((62, 62), Image.Resampling.LANCZOS)
    logo_mask = Image.new("L", (62, 62), 0)
    ImageDraw.Draw(logo_mask).rounded_rectangle((0, 0, 62, 62), radius=14, fill=255)
    bg = Image.new("RGB", (78, 78), "white")
    bg_mask = Image.new("L", (78, 78), 0)
    ImageDraw.Draw(bg_mask).rounded_rectangle((0, 0, 78, 78), radius=18, fill=255)
    img.paste(bg, (121, 121), bg_mask)
    img.paste(logo, (129, 129), logo_mask)
    img.save(out)
    return out.as_uri()


def truncate_comment(text: str, limit: int) -> str:
    compact = " ".join(str(text or "").split())
    return compact if len(compact) <= limit else compact[: limit - 1] + "…"


def extract_bvid(text: str) -> str | None:
    match = BVID_RE.search(text)
    return match.group(1) if match else None


def resolve_input_url(text: str) -> tuple[str, str | None]:
    b23_match = B23_RE.search(text)
    display_url = b23_match.group(0) if b23_match else None
    if display_url and not BVID_RE.search(text):
        requests = importlib.import_module("requests")

        resp = requests.get(display_url, headers=HEADERS, timeout=20, allow_redirects=True)
        return resp.url, display_url
    return text, display_url


def fetch_view(bvid: str, aid: str | None = None) -> dict[str, Any]:
    requests = importlib.import_module("requests")

    params = {"bvid": bvid} if bvid else {"aid": aid}
    resp = requests.get("https://api.bilibili.com/x/web-interface/view", params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("code") != 0:
        raise RuntimeError(str(payload.get("message") or "Bilibili view API error"))
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("Bilibili view API returned no data")
    return data


def fetch_comments(aid: int, limit: int) -> list[dict[str, Any]]:
    requests = importlib.import_module("requests")

    resp = requests.get("https://api.bilibili.com/x/v2/reply", params={"oid": aid, "type": 1, "sort": 2, "ps": limit}, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = (resp.json().get("data") or {}).get("replies") or []
    return data if isinstance(data, list) else []


def render_html(view: dict[str, Any], comments: list[dict[str, Any]], assets: Path, icon: Path | None, wordmark: Path | None, out_file: Path, comment_limit: int, display_url: str | None, *, allow_network_assets: bool) -> Path:
    bvid = str(view.get("bvid") or "")
    link_url = display_url or f"https://b23.tv/{bvid}"
    qr_text = link_url if link_url.startswith("http") else f"https://{link_url}"
    short = re.sub(r"^https?://", "", link_url).rstrip("/")
    images = assets / "images"
    images.mkdir(parents=True, exist_ok=True)

    icon_path = images / "bilibili-icon.jpg"
    icon_uri = prepare_icon(icon, icon_path)
    wordmark_uri = prepare_wordmark(wordmark, icon_uri, images / "bilibili-wordmark.png")
    qr_uri = make_qr(qr_text, images / f"qr-{hashlib.md5(qr_text.encode()).hexdigest()[:16]}.png", icon_path)
    cover_uri = download(str(view.get("pic") or ""), images / (hashlib.md5(str(view.get("pic", "")).encode()).hexdigest()[:16] + ".jpg"), allow_network=allow_network_assets)

    cards: list[str] = []
    for reply in comments[:2]:
        member = reply.get("member") or {}
        content = reply.get("content") or {}
        face = str(member.get("avatar") or "")
        try:
            avatar = download(face, images / (hashlib.md5(face.encode()).hexdigest()[:16] + ".jpg"), allow_network=allow_network_assets) if face else icon_uri
            avatar = avatar or icon_uri
        except Exception:
            avatar = icon_uri
        badge = "UP主赞过" if (reply.get("up_action") or {}).get("like") else ""
        loc = str((reply.get("reply_control") or {}).get("location", "未知属地")).replace("IP属地：", "")
        badge_html = f'<span class="badge">{esc(badge)}</span>' if badge else ""
        cards.append(
            f"""<section class="comment-card"><div><img class="avatar" src="{avatar}"></div><div><div class="comment-head"><div class="comment-head-left"><span class="nickname">{esc(member.get('uname', '匿名用户'))}</span>{badge_html}</div><span class="like-inline">♡ {esc(reply.get('like', 0))}</span></div><div class="comment-body">{esc(truncate_comment(content.get('message', ''), comment_limit))}</div><div class="comment-meta">{esc(fmt_date(reply.get('ctime')))}发布 · {esc(loc)}　共{esc(reply.get('rcount', 0))}条回复</div></div></section>"""
        )

    stat = view.get("stat") or {}
    owner = view.get("owner") or {}
    css = render_template(POSTER_CSS_TEMPLATE.read_text(encoding="utf-8"), {"FONT_R": FONT_R, "FONT_B": FONT_B})
    html_text = render_template(
        POSTER_HTML_TEMPLATE.read_text(encoding="utf-8"),
        {
            "TITLE": esc(view.get("title")),
            "CSS": css,
            "WORDMARK_URI": wordmark_uri,
            "REPLY_COUNT": esc(stat.get("reply")),
            "DANMAKU_COUNT": esc(stat.get("danmaku")),
            "DURATION": fmt_dur(int(view.get("duration") or 0)),
            "OWNER_NAME": esc(owner.get("name")),
            "QR_URI": qr_uri,
            "AID": esc(view.get("aid")),
            "BVID": esc(bvid),
            "SHORT_LINK": esc(short),
            "COVER_URI": cover_uri,
            "COMMENTS_HTML": "".join(cards),
        },
    )
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(html_text, encoding="utf-8")
    return out_file


def screenshot_html(html_path: Path, out_png: Path) -> None:
    playwright_sync_api = importlib.import_module("playwright.sync_api")
    sync_playwright = playwright_sync_api.sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1080, "height": 3600}, device_scale_factor=1)
        page.goto(html_path.resolve().as_uri(), wait_until="networkidle")
        box = page.locator(".poster").bounding_box()
        if not box:
            raise RuntimeError("poster bounding box not found")
        page.screenshot(path=str(out_png), clip={"x": 0, "y": 0, "width": 1080, "height": int(box["height"]) + 2}, omit_background=False)
        browser.close()


def command_doctor(_: argparse.Namespace) -> int:
    deps = {name: dependency_available(name) for name in ["requests", "PIL", "qrcode", "playwright"]}
    missing_templates = [str(path) for path in required_templates() if not path.exists()]
    warnings: list[str] = []
    if not all(deps.values()):
        missing = ", ".join(name for name, ok in deps.items() if not ok)
        warnings.append(f"missing optional runtime dependencies: {missing}")
    if missing_templates:
        warnings.append("missing templates/assets")
    return success(
        "doctor",
        data={
            "skill_dir": str(SKILL_DIR),
            "templates_ok": not missing_templates,
            "missing_templates": missing_templates,
            "dependencies": deps,
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


def command_self_test(_: argparse.Namespace) -> int:
    with tempfile.TemporaryDirectory(prefix="bilibili-publish-self-test-") as td:
        tmp = Path(td)
        out = tmp / "poster.html"
        view = {"bvid": "BV1Ai9eBKEU4", "aid": 123456, "title": "自检视频", "pic": "https://example.com/blocked.jpg", "duration": 83, "stat": {"reply": 1, "danmaku": 2}, "owner": {"name": "自检UP"}}
        comments = [{"member": {"uname": "自检用户", "avatar": "https://example.com/avatar.jpg"}, "content": {"message": "自检评论"}, "like": 1, "ctime": 1700000000, "rcount": 0}]
        try:
            render_html(view, comments, tmp / "assets", None, None, out, 128, None, allow_network_assets=False)
        except Exception as exc:
            print(f"self-test failed: {exc.__class__.__name__}: {exc}", file=sys.stderr)
            return failure("self-test", "SELF_TEST_FAILED", safe_error_message(exc), None, 1)
        return success("self-test", data={"output_exists": out.exists()}, output=str(out)) if out.exists() else failure("self-test", "SELF_TEST_FAILED", "HTML fixture generation failed", None, 1)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Stable CLI for Bilibili poster publishing workflows")
    sub = parser.add_subparsers(dest="command", required=True)
    doctor = sub.add_parser("doctor", help="Check local templates, dependencies, and writable temp directory")
    doctor.set_defaults(func=command_doctor)
    probe = sub.add_parser("probe", help="Check templates and optionally parse/resolve an input URL")
    probe.add_argument("--url", help="Optional Bilibili URL, BV/AV text, or b23.tv shortlink to inspect")
    probe.set_defaults(func=command_probe)
    self_test = sub.add_parser("self-test", help="Run a local fixture-based smoke test")
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


if __name__ == "__main__":
    raise SystemExit(main())
