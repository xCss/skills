from __future__ import annotations

import importlib
import re
import urllib.parse
from io import BytesIO
from pathlib import Path

from .constants import ALLOWED_ASSET_HOST_SUFFIXES, DEFAULT_ICON_TEMPLATE, DEFAULT_WORDMARK_TEMPLATE, FONT_B, FONT_R, HEADERS, WORDMARK_FONT


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
