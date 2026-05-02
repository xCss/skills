from __future__ import annotations

import hashlib
import importlib
import re
from pathlib import Path
from typing import Any

from .assets import download, make_qr, prepare_icon, prepare_wordmark
from .constants import FONT_B, FONT_R, POSTER_CSS_TEMPLATE, POSTER_HTML_TEMPLATE
from .runtime import esc, fmt_date, fmt_dur, render_template


def truncate_comment(text: str, limit: int) -> str:
    compact = " ".join(str(text or "").split())
    return compact if len(compact) <= limit else compact[: limit - 1] + "…"


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
