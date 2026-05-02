from __future__ import annotations

import importlib
from typing import Any

from .constants import AVID_RE, B23_RE, BVID_RE, HEADERS


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
