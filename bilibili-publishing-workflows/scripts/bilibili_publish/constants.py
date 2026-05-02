from __future__ import annotations

import re
from pathlib import Path

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
SKILL_DIR = Path(__file__).resolve().parents[2]
TEMPLATE_DIR = SKILL_DIR / "templates"
DEFAULT_ICON_TEMPLATE = TEMPLATE_DIR / "bilibili-gradient-icon.png"
DEFAULT_WORDMARK_TEMPLATE = TEMPLATE_DIR / "bilibili-header-wordmark-transparent.png"
POSTER_HTML_TEMPLATE = TEMPLATE_DIR / "bilibili-poster.html"
POSTER_CSS_TEMPLATE = TEMPLATE_DIR / "bilibili-poster.css"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
WORDMARK_FONT = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
