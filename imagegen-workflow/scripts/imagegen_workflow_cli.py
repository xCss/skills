#!/usr/bin/env python3
"""Stable CLI for reference-image generation workflows."""

from __future__ import annotations

import argparse
import base64
import io
import json
import mimetypes
import os
import re
import shutil
import sys
import tempfile
import tomllib
from collections import deque
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "gpt-image-2"
SECRET_KEY_RE = re.compile(r"(api[_-]?key|token|cookie|password|passwd|secret|authorization|bearer|set-cookie|client[_-]?secret)", re.I)


class ResponsesApiError(RuntimeError):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
SECRET_VALUE_RES = [
    re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]+", re.I),
    re.compile(r"(Authorization\s*[:=]\s*)[^\s\r\n]+", re.I),
    re.compile(r"(API[_-]?KEY\s*[:=]\s*)[^\s\r\n]+", re.I),
    re.compile(r"(TOKEN\s*[:=]\s*)[^\s\r\n]+", re.I),
    re.compile(r"(COOKIE\s*[:=]\s*)[^\r\n]+", re.I),
    re.compile(r"(PASSWORD\s*[:=]\s*)[^\s\r\n]+", re.I),
]


def redact(value: Any, key: str | None = None) -> Any:
    if key and SECRET_KEY_RE.search(key):
        return "[REDACTED]"
    if isinstance(value, str):
        out = value
        for pattern in SECRET_VALUE_RES:
            out = pattern.sub(lambda m: f"{m.group(1)}[REDACTED]" if m.lastindex else "[REDACTED]", out)
        return out
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        return {k: redact(v, k) for k, v in value.items()}
    return value


def emit(payload: dict[str, Any], status: int = 0) -> int:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return status


def ok(command: str, data: dict[str, Any] | None = None, warnings: list[str] | None = None, **extra: Any) -> int:
    return emit({"ok": True, "command": command, **extra, "data": data or {}, "warnings": warnings or []})


def fail(command: str, code: str, message: str, hint: str | None = None, detail: Any = None, status: int = 1) -> int:
    error: dict[str, Any] = {"code": code, "message": message}
    if hint:
        error["hint"] = hint
    if detail is not None:
        error["detail"] = redact(detail)
    return emit({"ok": False, "command": command, "error": error}, status)


def codex_home_candidates() -> list[Path]:
    if os.environ.get("CODEX_HOME"):
        return [Path(os.environ["CODEX_HOME"]).expanduser().resolve()]
    candidates = [Path.home() / ".codex"]
    seen: set[Path] = set()
    out: list[Path] = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved not in seen:
            seen.add(resolved)
            out.append(resolved)
    return out


def load_codex_config_provider() -> dict[str, str]:
    for codex_home in codex_home_candidates():
        config_path = codex_home / "config.toml"
        auth_path = codex_home / "auth.json"
        if not config_path.exists():
            continue
        try:
            config = tomllib.loads(config_path.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError:
            continue
        active_provider = str(config.get("model_provider") or "")
        providers = config.get("model_providers") if isinstance(config.get("model_providers"), dict) else {}
        provider = providers.get(active_provider) or providers.get("OpenAI") or {}
        base_url = provider.get("base_url", "")
        api_key = ""
        if auth_path.exists():
            try:
                auth = json.loads(auth_path.read_text(encoding="utf-8"))
                api_key = auth.get("OPENAI_API_KEY") or auth.get("api_key") or ""
            except Exception:
                api_key = ""
        if base_url or api_key:
            return {"base_url": base_url, "api_key": api_key, "source": "codex-config"}
    return {"base_url": "", "api_key": "", "source": ""}


def provider_config(args: argparse.Namespace) -> dict[str, str]:
    explicit_base_url = getattr(args, "base_url", None)
    explicit_api_key = getattr(args, "api_key", None)
    env_base_url = os.environ.get("IMAGEGEN_BASE_URL") or os.environ.get("BASE_URL") or ""
    env_api_key = os.environ.get("IMAGEGEN_API_KEY") or os.environ.get("API_KEY") or ""
    codex_provider = {"base_url": "", "api_key": "", "source": ""}
    if not (explicit_base_url or env_base_url) or not (explicit_api_key or env_api_key):
        codex_provider = load_codex_config_provider()
    base_url = explicit_base_url or env_base_url or codex_provider["base_url"]
    api_key = explicit_api_key or env_api_key or codex_provider["api_key"]
    base_source = "args" if explicit_base_url else "environment" if env_base_url else "codex-config" if codex_provider["base_url"] else "none"
    api_source = "args" if explicit_api_key else "environment" if env_api_key else "codex-config" if codex_provider["api_key"] else "none"
    source = base_source if base_source == api_source else "mixed"
    return {
        "base_url": base_url,
        "api_key": api_key,
        "model": getattr(args, "model", None) or os.environ.get("IMAGEGEN_MODEL") or os.environ.get("I18N_IMAGE_MODEL") or DEFAULT_MODEL,
        "source": source,
    }


def responses_endpoint(base_url: str) -> str:
    base = base_url.rstrip("/")
    for suffix in ("/responses", "/images/generations", "/images/edits", "/images"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
            break
    return f"{base}/responses"


def images_edit_endpoint(base_url: str) -> str:
    base = base_url.rstrip("/")
    if base.endswith("/images/edits"):
        return base
    if base.endswith("/responses"):
        base = base.removesuffix("/responses")
    if base.endswith("/v1"):
        return f"{base}/images/edits"
    return f"{base}/v1/images/edits"


def images_generation_endpoint(base_url: str) -> str:
    base = base_url.rstrip("/")
    if base.endswith("/images/generations"):
        return base
    if base.endswith("/images"):
        return f"{base}/generations"
    if base.endswith("/responses"):
        base = base.removesuffix("/responses")
    if base.endswith("/v1"):
        return f"{base}/images/generations"
    return f"{base}/v1/images/generations"


def use_legacy_images_edit_api(base_url: str) -> bool:
    base = base_url.rstrip("/")
    return base.endswith("/images/edits") or base.endswith("/images")


def use_legacy_images_generation_api(base_url: str, source: Path | None) -> bool:
    if source is not None:
        return False
    base = base_url.rstrip("/")
    return base.endswith("/images/generations") or base.endswith("/images")


def command_available(command: str) -> bool:
    return shutil.which(command) is not None


def pillow_available() -> bool:
    try:
        from PIL import Image  # noqa: F401

        return True
    except Exception:
        return False


def can_write_temp() -> bool:
    try:
        with tempfile.TemporaryDirectory(prefix="imagegen-workflow-probe-") as tmp:
            probe = Path(tmp) / "probe.txt"
            probe.write_text("probe", encoding="utf-8")
            return probe.exists()
    except Exception:
        return False


def cmd_doctor(args: argparse.Namespace) -> int:
    provider = provider_config(args)
    data = {
        "python": {"available": True, "version": sys.version.split()[0]},
        "uv": {"available": command_available("uv")},
        "pillow": {"available": pillow_available()},
        "provider": {
            "hasBaseUrl": bool(provider["base_url"]),
            "hasApiKey": bool(provider["api_key"]),
            "model": provider["model"],
            "endpointConfigured": bool(provider["base_url"]),
            "source": provider["source"],
        },
    }
    warnings: list[str] = []
    if not data["pillow"]["available"]:
        warnings.append("Pillow is not importable; run through `uv run python scripts/imagegen_workflow_cli.py ...` from this skill directory.")
    if not data["provider"]["hasBaseUrl"] or not data["provider"]["hasApiKey"]:
        warnings.append("provider configuration is incomplete; API-backed generate requires CLI args, IMAGEGEN_BASE_URL/IMAGEGEN_API_KEY, BASE_URL/API_KEY, or Codex config/auth")
    return ok("doctor", data, warnings)


def cmd_probe(args: argparse.Namespace) -> int:
    provider = provider_config(args)
    data: dict[str, Any] = {
        "hasApiEnvironment": bool(provider["base_url"] and provider["api_key"]),
        "model": provider["model"],
        "endpointConfigured": bool(provider["base_url"]),
        "source": provider["source"],
        "pillowAvailable": pillow_available(),
        "tempDirectoryWritable": can_write_temp(),
    }
    warnings: list[str] = []
    if args.network:
        if not data["hasApiEnvironment"]:
            warnings.append("network probe skipped because provider configuration is incomplete")
        else:
            data["network"] = network_probe(provider)
            if not data["network"]["ok"]:
                warnings.append(data["network"]["message"])
    return ok("probe", data, warnings)


def network_probe(provider: dict[str, str]) -> dict[str, Any]:
    try:
        import requests

        models_url = responses_endpoint(provider["base_url"]).removesuffix("/responses") + "/models"
        response = requests.get(models_url, headers={"Authorization": f"Bearer {provider['api_key']}"}, timeout=15)
        model_ids: list[str] = []
        if response.ok:
            payload = response.json()
            if isinstance(payload.get("data"), list):
                model_ids = [str(item.get("id")) for item in payload["data"] if isinstance(item, dict) and item.get("id")]
        return {
            "ok": response.ok,
            "status": response.status_code,
            "modelVisible": provider["model"] in model_ids if response.ok else False,
            "modelCount": len(model_ids),
            "message": "provider models endpoint is reachable" if response.ok else f"provider models endpoint returned HTTP {response.status_code}",
        }
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


def mime_for(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    return mime or "image/png"


def image_data_url(path: Path) -> str:
    return f"data:{mime_for(path)};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def normalized_mask_png_bytes(path: Path) -> bytes:
    # OpenAI image-edit convention: only the alpha channel is read.
    # alpha = 0 marks the region to edit; alpha = 255 marks regions to preserve.
    # Input may be L/RGB (white = edit, black = preserve, by our docs) or RGBA
    # (assume caller already follows OpenAI alpha polarity).
    from PIL import Image

    with Image.open(path) as img:
        if img.mode == "RGBA":
            rgba = img.copy()
        else:
            mask_l = img.convert("L")
            edit_alpha = Image.eval(mask_l, lambda px: 255 - px)
            opaque_rgb = Image.new("RGB", mask_l.size, (255, 255, 255))
            rgba = Image.merge("RGBA", (*opaque_rgb.split(), edit_alpha))
        with io.BytesIO() as buffer:
            rgba.save(buffer, format="PNG")
            return buffer.getvalue()


def mask_data_url(path: Path) -> str:
    return f"data:image/png;base64,{base64.b64encode(normalized_mask_png_bytes(path)).decode('ascii')}"


def model_disallows_transparent_background(provider: dict[str, str]) -> bool:
    return provider.get("model", "").startswith("gpt-image-2")


def model_supports_input_fidelity(provider: dict[str, str]) -> bool:
    model = (provider.get("model") or "").lower()
    if model.startswith("gpt-image-1-mini"):
        return False
    if model.startswith("gpt-image-2"):
        return False
    return True


def gate_input_fidelity(args: argparse.Namespace, provider: dict[str, str], warnings: list[str]) -> None:
    value = getattr(args, "input_fidelity", None)
    if value is None:
        return
    if model_supports_input_fidelity(provider):
        return
    warnings.append(
        f"input_fidelity is not supported by {provider.get('model')}; dropping it from the request"
    )
    args.input_fidelity = None


def provider_background(args: argparse.Namespace, provider: dict[str, str]) -> str | None:
    value = getattr(args, "background", None)
    if value == "transparent" and model_disallows_transparent_background(provider):
        return None
    return value


def response_payload(text: str) -> dict[str, Any]:
    if not text.startswith("event:") and not text.startswith("data:"):
        return json.loads(text)
    data_lines = [
        line.removeprefix("data:").strip()
        for line in text.splitlines()
        if line.startswith("data:") and line.removeprefix("data:").strip() and line.removeprefix("data:").strip() != "[DONE]"
    ]
    for line in reversed(data_lines):
        parsed = json.loads(line)
        if parsed.get("response"):
            return parsed["response"]
        if parsed.get("type") == "response.completed" and parsed.get("response"):
            return parsed["response"]
        if any(k in parsed for k in ("output", "output_text", "result", "image_base64", "b64_json")):
            return parsed
    raise ValueError(f"No JSON response payload found in event stream: {text[:500]}")


def decode_response_body(response: Any) -> str:
    raw = response.content
    encoding = str(response.headers.get("Content-Encoding") or "").lower()
    if raw.lstrip()[:1] in (b"{", b"["):
        return raw.decode(response.encoding or "utf-8", errors="replace")
    if encoding == "zstd" or raw.startswith(b"\x28\xb5\x2f\xfd"):
        try:
            import zstandard as zstd
        except Exception as exc:
            raise RuntimeError("Response body is zstd-compressed but zstandard is not installed.") from exc
        raw = zstd.ZstdDecompressor().stream_reader(io.BytesIO(raw)).read()
    return raw.decode(response.encoding or "utf-8", errors="replace")


def extract_image_base64(value: Any) -> str | None:
    candidates: list[str] = []

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for key in ("image_base64", "b64_json"):
                if isinstance(item.get(key), str):
                    candidates.append(item[key])
            result = item.get("result")
            if isinstance(result, str) and len(result) >= 40 and re.fullmatch(r"[A-Za-z0-9+/=]+", result[:100]):
                candidates.append(result)
            if isinstance(item.get("url"), str) and item["url"].startswith("data:image/"):
                candidates.append(item["url"].split(",", 1)[1])
            for nested in item.values():
                visit(nested)
        elif isinstance(item, list):
            for nested in item:
                visit(nested)

    visit(value)
    return candidates[0] if candidates else None


def build_prompt(args: argparse.Namespace, source: Path | None = None) -> str:
    extra = []
    if args.extra_prompt:
        extra.append(args.extra_prompt)
    if args.guidance_file:
        extra.append(Path(args.guidance_file).read_text(encoding="utf-8"))
    if source is None:
        return "\n".join(
            part
            for part in [
                f"Create a new {args.language} image from this prompt/content request:",
                args.text,
                f"Output a PNG with exactly {args.width}x{args.height} pixels.",
                "Do not add extra text, decorations, borders, watermarks, or unintended UI chrome unless explicitly requested.",
                "\n".join(extra).strip(),
            ]
            if part
        )
    return "\n".join(
        part
        for part in [
            f"Create a {args.language} localized replacement image using the provided source image as reference.",
            f"Use this exact text: {args.text}",
            f"Output a PNG with exactly {args.width}x{args.height} pixels.",
            "Match the source canvas size, text bounding box, font weight, stroke/outline thickness, shadow, alignment, padding, and overall text scale.",
            "Remove the original source-language text before drawing the replacement text, while preserving non-text background, transparent areas, UI shape, button/ribbon/glow styling, and visual hierarchy.",
            "If the replacement text is longer than the source text, use a condensed font, tighter tracking, or multiple lines while keeping readable text at the original visual scale.",
            "Do not crop, resize, add decorations, change the resolution, or render tiny text centered in a large empty area.",
            "For Arabic or other right-to-left languages, render correctly shaped readable text in the proper direction.",
            "\n".join(extra).strip(),
        ]
        if part
    )


def build_edit_prompt(args: argparse.Namespace) -> str:
    if getattr(args, "prompt", None):
        base_prompt = args.prompt
    elif getattr(args, "text", None):
        language = getattr(args, "language", None) or "target language"
        base_prompt = "\n".join([
            f"Edit the provided image into a {language} localized version.",
            f"Use this exact replacement text: {args.text}",
            "Remove the old source-language text completely.",
        ])
    else:
        base_prompt = "Edit the provided image while preserving its existing composition and style."
    extra = []
    if getattr(args, "extra_prompt", None):
        extra.append(args.extra_prompt)
    if getattr(args, "guidance_file", None):
        extra.append(Path(args.guidance_file).read_text(encoding="utf-8"))
    exact_text = []
    if getattr(args, "language", None):
        exact_text.append(f"Target language: {args.language}.")
    if getattr(args, "text", None):
        exact_text.append(f"Use this exact replacement text: {args.text}")
    return "\n".join(
        part
        for part in [
            base_prompt,
            "\n".join(exact_text).strip(),
            "Change only the requested region or text. Keep everything else the same: canvas, composition, non-text artwork, colors, shadows, strokes, layout, and transparent/edge behavior unless explicitly requested otherwise.",
            f"Return an image suitable for a final {args.width}x{args.height} canvas.",
            "Do not add extra text, decorations, watermarks, white square backgrounds, or unintended borders/halos.",
            "\n".join(extra).strip(),
        ]
        if part
    )


def supported_tool_size(args: argparse.Namespace) -> str | None:
    size = f"{args.width}x{args.height}"
    return size if size in {"1024x1024", "1024x1536", "1536x1024"} else None


def image_generation_tool(provider: dict[str, str], args: argparse.Namespace, action: str, mask: Path | None = None, include_mask_data: bool = True, minimal_provider_tool: bool = False) -> dict[str, Any]:
    tool: dict[str, Any] = {
        "type": "image_generation",
        "action": action,
        "model": provider["model"],
        "output_format": resolve_output_format(args),
    }
    size = supported_tool_size(args)
    if size:
        tool["size"] = size
    if not minimal_provider_tool:
        background = provider_background(args, provider)
        if background is not None:
            tool["background"] = background
        for arg_name, field_name in [
            ("quality", "quality"),
            ("output_compression", "output_compression"),
            ("input_fidelity", "input_fidelity"),
            ("moderation", "moderation"),
        ]:
            value = getattr(args, arg_name, None)
            if value is not None:
                tool[field_name] = value
    if mask is not None and not minimal_provider_tool:
        tool["input_image_mask"] = {"image_url": mask_data_url(mask) if include_mask_data else "[MASK_DATA_URL_REDACTED]"}
    return tool


def call_responses(provider: dict[str, str], source: Path | None, prompt: str, args: argparse.Namespace, action: str, mask: Path | None = None, minimal_provider_tool: bool = False) -> dict[str, Any]:
    import requests

    content: list[dict[str, str]] = [
        {"type": "input_text", "text": prompt},
    ]
    if source is not None:
        content.append({"type": "input_image", "image_url": image_data_url(source)})
    tool = image_generation_tool(provider, args, action, mask, minimal_provider_tool=minimal_provider_tool)

    body = {
        "model": provider["model"],
        "input": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "tools": [tool],
        "tool_choice": {"type": "image_generation"},
    }
    response = requests.post(
        responses_endpoint(provider["base_url"]),
        headers={"Authorization": f"Bearer {provider['api_key']}", "Content-Type": "application/json"},
        data=json.dumps(body),
        timeout=180,
    )
    if not response.ok:
        raise ResponsesApiError(response.status_code, f"Responses API failed {response.status_code}: {redact(decode_response_body(response)[:1000])}")
    return response_payload(decode_response_body(response))


def call_images_edit(provider: dict[str, str], source: Path, prompt: str, args: argparse.Namespace, mask: Path | None = None) -> dict[str, Any]:
    import requests

    files: dict[str, tuple[str, bytes, str]] = {
        "image": (source.name, source.read_bytes(), mime_for(source)),
    }
    if mask is not None:
        files["mask"] = (mask.name, normalized_mask_png_bytes(mask), "image/png")

    data: dict[str, str] = {
        "prompt": prompt,
        "model": provider["model"],
        "size": f"{args.width}x{args.height}",
        "response_format": "b64_json",
    }
    background = provider_background(args, provider)
    if background is not None:
        data["background"] = str(background)
    for arg_name, field_name in [
        ("quality", "quality"),
        ("output_compression", "output_compression"),
        ("input_fidelity", "input_fidelity"),
        ("moderation", "moderation"),
    ]:
        value = getattr(args, arg_name, None)
        if value is not None:
            data[field_name] = str(value)

    response = requests.post(
        images_edit_endpoint(provider["base_url"]),
        headers={"Authorization": f"Bearer {provider['api_key']}"},
        data=data,
        files=files,
        timeout=180,
    )
    if not response.ok:
        raise RuntimeError(f"Images edit API failed {response.status_code}: {redact(decode_response_body(response)[:1000])}")
    return response.json()


def call_images_generate(provider: dict[str, str], prompt: str, args: argparse.Namespace) -> dict[str, Any]:
    import requests

    body: dict[str, Any] = {
        "prompt": prompt,
        "model": provider["model"],
        "size": f"{args.width}x{args.height}",
        "response_format": "b64_json",
    }
    background = provider_background(args, provider)
    if background is not None:
        body["background"] = background
    for arg_name, field_name in [
        ("quality", "quality"),
        ("output_compression", "output_compression"),
        ("moderation", "moderation"),
        ("user", "user"),
        ("n", "n"),
    ]:
        value = getattr(args, arg_name, None)
        if value is not None:
            body[field_name] = value

    response = requests.post(
        images_generation_endpoint(provider["base_url"]),
        headers={"Authorization": f"Bearer {provider['api_key']}", "Content-Type": "application/json"},
        data=json.dumps(body),
        timeout=180,
    )
    if not response.ok:
        raise RuntimeError(f"Images generation API failed {response.status_code}: {redact(decode_response_body(response)[:1000])}")
    return response.json()


def image_dimensions(path: Path) -> dict[str, int]:
    from PIL import Image

    with Image.open(path) as img:
        return {"width": img.width, "height": img.height}


def normalize_png_bytes(raw: bytes, width: int, height: int) -> bytes:
    from PIL import Image

    with tempfile.TemporaryDirectory(prefix="imagegen-workflow-") as tmp:
        src = Path(tmp) / "input.png"
        dst = Path(tmp) / "output.png"
        src.write_bytes(raw)
        with Image.open(src) as img:
            img = img.convert("RGBA")
            if img.size != (width, height):
                img.thumbnail((width, height), Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
                canvas.alpha_composite(img, ((width - img.width) // 2, (height - img.height) // 2))
                img = canvas
            img.save(dst, optimize=True)
        return dst.read_bytes()


def preserve_source_alpha(raw: bytes, source: Path) -> bytes:
    from PIL import Image

    with tempfile.TemporaryDirectory(prefix="imagegen-workflow-") as tmp:
        gen_path = Path(tmp) / "generated.png"
        out_path = Path(tmp) / "alpha.png"
        gen_path.write_bytes(raw)
        with Image.open(source) as src_img, Image.open(gen_path) as gen_img:
            src = src_img.convert("RGBA")
            gen = gen_img.convert("RGBA")
            if src.size != gen.size:
                src = src.resize(gen.size, Image.Resampling.LANCZOS)
            r, g, b, _a = gen.split()
            Image.merge("RGBA", (r, g, b, src.getchannel("A"))).save(out_path, optimize=True)
        return out_path.read_bytes()


def remove_edge_background(raw: bytes) -> bytes:
    from PIL import Image

    with tempfile.TemporaryDirectory(prefix="imagegen-workflow-") as tmp:
        src_path = Path(tmp) / "edge-input.png"
        out_path = Path(tmp) / "edge-output.png"
        src_path.write_bytes(raw)
        img = Image.open(src_path).convert("RGBA")
        px = img.load()
        width, height = img.size
        corners = [px[0, 0], px[width - 1, 0], px[0, height - 1], px[width - 1, height - 1]]
        threshold = 58

        def close_to_corner(color: tuple[int, int, int, int]) -> bool:
            if color[3] <= 8:
                return True
            return min(abs(color[0] - c[0]) + abs(color[1] - c[1]) + abs(color[2] - c[2]) for c in corners) <= threshold

        queue: deque[tuple[int, int]] = deque()
        seen: set[tuple[int, int]] = set()

        def add(x: int, y: int) -> None:
            if x < 0 or y < 0 or x >= width or y >= height or (x, y) in seen:
                return
            if close_to_corner(px[x, y]):
                seen.add((x, y))
                queue.append((x, y))

        for x in range(width):
            add(x, 0)
            add(x, height - 1)
        for y in range(height):
            add(0, y)
            add(width - 1, y)
        while queue:
            x, y = queue.popleft()
            r, g, b, _a = px[x, y]
            px[x, y] = (r, g, b, 0)
            add(x + 1, y)
            add(x - 1, y)
            add(x, y + 1)
            add(x, y - 1)
        img.save(out_path, optimize=True)
        return out_path.read_bytes()


def composite_text(raw: bytes, source: Path, spec_path: Path) -> bytes:
    from PIL import Image

    opt = json.loads(spec_path.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory(prefix="imagegen-workflow-") as tmp:
        gen_path = Path(tmp) / "generated.png"
        out_path = Path(tmp) / "composite.png"
        gen_path.write_bytes(raw)
        src = Image.open(source).convert("RGBA")
        gen = Image.open(gen_path).convert("RGBA")
        if gen.size != src.size:
            gen = gen.resize(src.size, Image.Resampling.LANCZOS)
        base = src.copy()
        px = base.load()
        src_px = src.load()
        gen_px = gen.load()

        def clear_rect(rect: list[int]) -> None:
            x, y, w, h = [int(v) for v in rect]
            x2, y2 = min(base.width - 1, x + w), min(base.height - 1, y + h)
            lx, rx = max(0, x - 8), min(base.width - 1, x2 + 8)
            for yy in range(max(0, y), min(base.height, y2 + 1)):
                left = src_px[lx, yy]
                right = src_px[rx, yy]
                span = max(1, x2 - x)
                for xx in range(max(0, x), min(base.width, x2 + 1)):
                    t = (xx - x) / span
                    px[xx, yy] = tuple(int(round(left[i] * (1 - t) + right[i] * t)) for i in range(4))

        def is_text_pixel(color: tuple[int, int, int, int]) -> bool:
            r, g, b, a = color
            if a <= 16:
                return False
            lum = (0.299 * r) + (0.587 * g) + (0.114 * b)
            chroma = max(r, g, b) - min(r, g, b)
            return lum <= opt.get("darkLum", 105) or (lum >= opt.get("lightLum", 155) and chroma <= opt.get("lightChroma", 110))

        for rect in opt.get("clearRects", []) or ([opt["clearRect"]] if opt.get("clearRect") else []):
            clear_rect(rect)
        for rect in opt.get("textRects", []) or ([opt["textRect"]] if opt.get("textRect") else []):
            x, y, w, h = [int(v) for v in rect]
            for yy in range(max(0, y), min(base.height, y + h + 1)):
                for xx in range(max(0, x), min(base.width, x + w + 1)):
                    if src_px[xx, yy][3] <= 8:
                        continue
                    gp = gen_px[xx, yy]
                    if is_text_pixel(gp):
                        px[xx, yy] = gp
        base.putalpha(src.getchannel("A"))
        base.save(out_path, optimize=True)
        return out_path.read_bytes()


def postprocess_bytes(raw: bytes, args: argparse.Namespace) -> bytes:
    output = normalize_png_bytes(raw, args.width, args.height)
    source = Path(args.source).resolve() if getattr(args, "source", None) else None
    if getattr(args, "text_composite_spec", None):
        if source is None:
            raise ValueError("--source is required with --text-composite-spec")
        output = composite_text(output, source, Path(args.text_composite_spec).resolve())
    if getattr(args, "preserve_source_alpha", False):
        if source is None:
            raise ValueError("--source is required with --preserve-source-alpha")
        output = preserve_source_alpha(output, source)
    if getattr(args, "transparent_edge_background", False):
        output = remove_edge_background(output)
    return output


def optional_source_error(args: argparse.Namespace, source: Path | None) -> tuple[str, str | None, dict[str, Any] | None]:
    if getattr(args, "text_composite_spec", None) and source is None:
        return "SOURCE_REQUIRED", "--source is required with --text-composite-spec", None
    if getattr(args, "preserve_source_alpha", False) and source is None:
        return "SOURCE_REQUIRED", "--source is required with --preserve-source-alpha", None
    if source is not None and not source.exists():
        return "SOURCE_NOT_FOUND", "Source image does not exist", {"source": str(source)}
    return "", None, None


def write_output(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)


def resolve_output_format(args: argparse.Namespace) -> str:
    fmt = (getattr(args, "output_format", None) or "").lower()
    if fmt:
        return "jpeg" if fmt == "jpg" else fmt
    ext = Path(args.out).suffix.lower().lstrip(".")
    return {"jpg": "jpeg", "jpeg": "jpeg", "webp": "webp", "png": "png"}.get(ext, "png")


def mime_for_format(fmt: str) -> str:
    return {"png": "image/png", "webp": "image/webp", "jpeg": "image/jpeg"}.get(fmt, "image/png")


def image_meta(out: Path, output_mime: str, *, with_media: bool = False, model: str | None = None, provider: str | None = "responses-compatible") -> dict[str, Any]:
    meta: dict[str, Any] = {"output": str(out), "file": str(out), "mime": output_mime}
    if with_media:
        meta["media"] = str(out)
    if provider is not None:
        meta["provider"] = provider
    if model is not None:
        meta["model"] = model
    return meta


def encode_image(raw: bytes, args: argparse.Namespace) -> tuple[bytes, str]:
    fmt = resolve_output_format(args)
    if fmt == "png":
        return raw, "image/png"
    from PIL import Image

    quality = getattr(args, "output_compression", None)
    img = Image.open(io.BytesIO(raw))
    buf = io.BytesIO()
    if fmt == "jpeg":
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        else:
            img = img.convert("RGB")
        img.save(buf, "JPEG", quality=quality if quality is not None else 90, optimize=True)
        return buf.getvalue(), "image/jpeg"
    if fmt == "webp":
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        img.save(buf, "WEBP", quality=quality if quality is not None else 85, method=6)
        return buf.getvalue(), "image/webp"
    return raw, "image/png"


def generation_plan(args: argparse.Namespace, provider: dict[str, str], source: Path | None, out: Path) -> dict[str, Any]:
    legacy_images = use_legacy_images_generation_api(provider["base_url"], source)
    return {
        "source": str(source) if source is not None else None,
        "output": str(out),
        "language": args.language,
        "text": args.text,
        "width": args.width,
        "height": args.height,
        "mode": "reference" if source is not None else "text-only",
        "prompt": build_prompt(args, source),
        "endpoint": "/v1/images/generations" if legacy_images else "/responses",
        "transport": "images-api" if legacy_images else "responses-image-generation-tool",
        "tool": None if legacy_images else image_generation_tool(provider, args, "generate"),
        "postprocess": {
            "textCompositeSpec": str(Path(args.text_composite_spec).resolve()) if args.text_composite_spec else None,
            "preserveSourceAlpha": bool(args.preserve_source_alpha),
            "transparentEdgeBackground": bool(args.transparent_edge_background),
            "sizeLimit": args.size_limit,
        },
        "provider": "responses-compatible",
        "model": provider["model"],
    }


def edit_plan(args: argparse.Namespace, provider: dict[str, str], source: Path, out: Path) -> dict[str, Any]:
    endpoint = "/v1/images/edits" if use_legacy_images_edit_api(provider["base_url"]) else "/responses"
    transport = "images-api" if endpoint == "/v1/images/edits" else "responses-image-generation-tool"
    return {
        "source": str(source),
        "mask": str(Path(args.mask).resolve()) if getattr(args, "mask", None) else None,
        "output": str(out),
        "language": getattr(args, "language", None),
        "text": getattr(args, "text", None),
        "width": args.width,
        "height": args.height,
        "endpoint": endpoint,
        "transport": transport,
        "tool": image_generation_tool(provider, args, "edit", Path(args.mask).resolve() if getattr(args, "mask", None) else None, include_mask_data=False),
        "editParameters": {
            "background": getattr(args, "background", None),
            "providerBackground": provider_background(args, provider),
            "quality": getattr(args, "quality", None),
            "outputFormat": getattr(args, "output_format", None),
            "outputCompression": getattr(args, "output_compression", None),
            "inputFidelity": getattr(args, "input_fidelity", None),
            "moderation": getattr(args, "moderation", None),
            "n": getattr(args, "n", None),
        },
        "postprocess": {
            "textCompositeSpec": str(Path(args.text_composite_spec).resolve()) if args.text_composite_spec else None,
            "preserveSourceAlpha": bool(args.preserve_source_alpha),
            "transparentEdgeBackground": bool(args.transparent_edge_background),
            "sizeLimit": args.size_limit,
        },
        "provider": "responses-compatible",
        "model": provider["model"],
    }


def cmd_generate(args: argparse.Namespace) -> int:
    source = Path(args.source).resolve() if args.source else None
    out = Path(args.out).resolve()
    error_code, error_message, error_detail = optional_source_error(args, source)
    if error_code:
        return fail("generate", error_code, error_message or "Invalid source configuration", "Pass --source with a readable local image path.", error_detail, 2)
    provider = provider_config(args)
    warnings: list[str] = []
    gate_input_fidelity(args, provider, warnings)
    plan = generation_plan(args, provider, source, out)
    output_mime = mime_for_format(resolve_output_format(args))
    if args.dry_run:
        return ok(
            "generate",
            {"model": provider["model"], "plan": plan},
            warnings,
            **image_meta(out, output_mime, model=provider["model"]),
        )
    if not provider["base_url"] or not provider["api_key"]:
        return fail("generate", "NO_PROVIDER_CONFIGURED", "Provider configuration is incomplete", "Set CLI args, IMAGEGEN_BASE_URL/IMAGEGEN_API_KEY, BASE_URL/API_KEY, or Codex config/auth.", status=2)
    try:
        if use_legacy_images_generation_api(provider["base_url"], source):
            response = call_images_generate(provider, build_prompt(args, source), args)
        else:
            response = call_responses(provider, source, build_prompt(args, source), args, "generate")
        image_b64 = extract_image_base64(response)
        if not image_b64:
            raise RuntimeError("No generated image base64 found in model response.")
        output = postprocess_bytes(base64.b64decode(image_b64), args)
        with tempfile.TemporaryDirectory(prefix="imagegen-workflow-dim-") as tmp:
            probe = Path(tmp) / "probe.png"
            probe.write_bytes(output)
            dimensions = image_dimensions(probe)
        if dimensions != {"width": args.width, "height": args.height}:
            return fail("generate", "DIMENSION_MISMATCH", "Generated image dimensions do not match the requested canvas", detail={"dimensions": dimensions, "width": args.width, "height": args.height})
        output, output_mime = encode_image(output, args)
        if args.size_limit and len(output) > args.size_limit:
            return fail("generate", "SIZE_LIMIT_EXCEEDED", "Generated image exceeds the configured size limit", detail={"bytes": len(output), "sizeLimit": args.size_limit})
        write_output(out, output)
        return ok(
            "generate",
            {"dimensions": dimensions, "bytes": len(output), "model": provider["model"], "plan": plan},
            [],
            **image_meta(out, output_mime, with_media=True, model=provider["model"]),
        )
    except Exception as exc:
        return fail("generate", "GENERATION_FAILED", "Image generation failed", detail={"message": str(exc)})


def cmd_edit(args: argparse.Namespace) -> int:
    source = Path(args.source).resolve()
    out = Path(args.out).resolve()
    if not source.exists():
        return fail("edit", "SOURCE_NOT_FOUND", "Source image does not exist", "Pass --source with a readable local image path.", {"source": str(source)}, 2)
    if args.mask and not Path(args.mask).resolve().exists():
        return fail("edit", "MASK_NOT_FOUND", "Mask image does not exist", "Pass --mask with a readable PNG mask path.", {"mask": str(Path(args.mask).resolve())}, 2)
    provider = provider_config(args)
    warnings: list[str] = []
    gate_input_fidelity(args, provider, warnings)
    plan = edit_plan(args, provider, source, out)
    output_mime = mime_for_format(resolve_output_format(args))
    if args.dry_run:
        return ok("edit", {"model": provider["model"], "plan": plan, "prompt": build_edit_prompt(args)}, warnings, **image_meta(out, output_mime, model=provider["model"]))
    if not provider["base_url"] or not provider["api_key"]:
        return fail("edit", "NO_PROVIDER_CONFIGURED", "Provider configuration is incomplete", "Set CLI args, IMAGEGEN_BASE_URL/IMAGEGEN_API_KEY, BASE_URL/API_KEY, or Codex config/auth.", status=2)
    try:
        mask = Path(args.mask).resolve() if args.mask else None
        retried_minimal_tool = False
        if use_legacy_images_edit_api(provider["base_url"]):
            response = call_images_edit(provider, source, build_edit_prompt(args), args, mask)
        else:
            try:
                response = call_responses(provider, source, build_edit_prompt(args), args, "edit", mask)
            except ResponsesApiError:
                retried_minimal_tool = True
                response = call_responses(provider, source, build_edit_prompt(args), args, "edit", mask, minimal_provider_tool=True)
        if retried_minimal_tool:
            warnings.append("provider rejected the full Responses image_generation edit tool; retried with a minimal provider-compatible tool")
        image_b64 = extract_image_base64(response)
        if not image_b64:
            raise RuntimeError("No edited image base64 found in model response.")
        output = postprocess_bytes(base64.b64decode(image_b64), args)
        with tempfile.TemporaryDirectory(prefix="imagegen-workflow-edit-dim-") as tmp:
            probe = Path(tmp) / "probe.png"
            probe.write_bytes(output)
            dimensions = image_dimensions(probe)
        if dimensions != {"width": args.width, "height": args.height}:
            return fail("edit", "DIMENSION_MISMATCH", "Edited image dimensions do not match the requested canvas", detail={"dimensions": dimensions, "width": args.width, "height": args.height})
        output, output_mime = encode_image(output, args)
        if args.size_limit and len(output) > args.size_limit:
            return fail("edit", "SIZE_LIMIT_EXCEEDED", "Edited image exceeds the configured size limit", detail={"bytes": len(output), "sizeLimit": args.size_limit})
        write_output(out, output)
        return ok(
            "edit",
            {"dimensions": dimensions, "bytes": len(output), "model": provider["model"], "plan": plan},
            warnings,
            **image_meta(out, output_mime, with_media=True, model=provider["model"]),
        )
    except Exception as exc:
        return fail("edit", "EDIT_FAILED", "Image edit failed", detail={"message": str(exc)})


def cmd_postprocess(args: argparse.Namespace) -> int:
    generated = Path(args.generated).resolve()
    out = Path(args.out).resolve()
    if not generated.exists():
        return fail("postprocess", "GENERATED_NOT_FOUND", "Generated image does not exist", detail={"generated": str(generated)}, status=2)
    try:
        output = postprocess_bytes(generated.read_bytes(), args)
        output, output_mime = encode_image(output, args)
        write_output(out, output)
        dimensions = image_dimensions(out)
        return ok("postprocess", {"dimensions": dimensions, "bytes": len(output)}, [], **image_meta(out, output_mime, with_media=True, provider=None))
    except Exception as exc:
        return fail("postprocess", "POSTPROCESS_FAILED", "Image postprocess failed", detail={"message": str(exc)})


def batch_job_namespace(job: dict[str, Any], defaults: argparse.Namespace) -> argparse.Namespace:
    return argparse.Namespace(
        source=job.get("source"),
        text=job.get("text"),
        language=job.get("language"),
        width=int(job["width"]) if job.get("width") is not None else None,
        height=int(job["height"]) if job.get("height") is not None else None,
        out=job.get("out"),
        generated=job.get("generated"),
        mask=job.get("mask"),
        prompt=job.get("prompt"),
        base_url=job.get("base_url") or defaults.base_url,
        api_key=job.get("api_key") or defaults.api_key,
        model=job.get("model") or defaults.model,
        dry_run=bool(job.get("dry_run", defaults.dry_run)),
        extra_prompt=job.get("extra_prompt"),
        guidance_file=job.get("guidance_file"),
        size_limit=int(job["size_limit"]) if job.get("size_limit") is not None else None,
        text_composite_spec=job.get("text_composite_spec"),
        preserve_source_alpha=bool(job.get("preserve_source_alpha")),
        transparent_edge_background=bool(job.get("transparent_edge_background")),
        background=job.get("background"),
        quality=job.get("quality"),
        output_format=job.get("output_format"),
        output_compression=int(job["output_compression"]) if job.get("output_compression") is not None else None,
        input_fidelity=job.get("input_fidelity"),
        moderation=job.get("moderation"),
        n=int(job["n"]) if job.get("n") is not None else None,
        user=job.get("user"),
    )


def run_batch_item(job: dict[str, Any], defaults: argparse.Namespace) -> dict[str, Any]:
    command = job.get("command") or job.get("type")
    item_id = job.get("id")
    try:
        args = batch_job_namespace(job, defaults)
        if command == "postprocess":
            generated = Path(args.generated).resolve()
            out = Path(args.out).resolve()
            output = postprocess_bytes(generated.read_bytes(), args)
            output, output_mime = encode_image(output, args)
            write_output(out, output)
            return {
                "id": item_id,
                "command": command,
                "ok": True,
                "file": str(out),
                "mime": output_mime,
                "dimensions": image_dimensions(out),
                "bytes": len(output),
            }
        if command == "generate":
            source = Path(args.source).resolve() if args.source else None
            out = Path(args.out).resolve()
            error_code, error_message, _error_detail = optional_source_error(args, source)
            if error_code:
                raise ValueError(error_message)
            provider = provider_config(args)
            warnings: list[str] = []
            gate_input_fidelity(args, provider, warnings)
            if args.dry_run:
                return {
                    "id": item_id,
                    "command": command,
                    "ok": True,
                    "dryRun": True,
                    "file": str(out),
                    "plan": generation_plan(args, provider, source, out),
                    "warnings": warnings,
                }
            if not provider["base_url"] or not provider["api_key"]:
                raise RuntimeError("Provider environment is incomplete")
            if use_legacy_images_generation_api(provider["base_url"], source):
                response = call_images_generate(provider, build_prompt(args, source), args)
            else:
                response = call_responses(provider, source, build_prompt(args, source), args, "generate")
            image_b64 = extract_image_base64(response)
            if not image_b64:
                raise RuntimeError("No generated image base64 found in model response.")
            output = postprocess_bytes(base64.b64decode(image_b64), args)
            output, output_mime = encode_image(output, args)
            write_output(out, output)
            return {
                "id": item_id,
                "command": command,
                "ok": True,
                "file": str(out),
                "mime": output_mime,
                "dimensions": image_dimensions(out),
                "bytes": len(output),
                "warnings": warnings,
            }
        if command == "edit":
            source = Path(args.source).resolve()
            out = Path(args.out).resolve()
            provider = provider_config(args)
            warnings: list[str] = []
            gate_input_fidelity(args, provider, warnings)
            if args.dry_run:
                return {
                    "id": item_id,
                    "command": command,
                    "ok": True,
                    "dryRun": True,
                    "file": str(out),
                    "plan": edit_plan(args, provider, source, out),
                    "warnings": warnings,
                }
            if not provider["base_url"] or not provider["api_key"]:
                raise RuntimeError("Provider environment is incomplete")
            mask = Path(args.mask).resolve() if args.mask else None
            if use_legacy_images_edit_api(provider["base_url"]):
                response = call_images_edit(provider, source, build_edit_prompt(args), args, mask)
            else:
                response = call_responses(provider, source, build_edit_prompt(args), args, "edit", mask)
            image_b64 = extract_image_base64(response)
            if not image_b64:
                raise RuntimeError("No edited image base64 found in model response.")
            output = postprocess_bytes(base64.b64decode(image_b64), args)
            output, output_mime = encode_image(output, args)
            write_output(out, output)
            return {
                "id": item_id,
                "command": command,
                "ok": True,
                "file": str(out),
                "mime": output_mime,
                "dimensions": image_dimensions(out),
                "bytes": len(output),
                "warnings": warnings,
            }
        raise ValueError(f"Unsupported batch command: {command}")
    except Exception as exc:
        return {"id": item_id, "command": command, "ok": False, "error": {"message": str(exc)}}


def cmd_batch(args: argparse.Namespace) -> int:
    jobs_path = Path(args.jobs).resolve()
    report_path = Path(args.out).resolve() if args.out else None
    try:
        payload = json.loads(jobs_path.read_text(encoding="utf-8-sig"))
        if isinstance(payload, list):
            jobs = payload
        elif isinstance(payload, dict):
            jobs = payload.get("jobs", [])
        else:
            jobs = []
        if not isinstance(jobs, list):
            return fail("batch", "INVALID_JOBS", "Batch jobs file must contain a list or a { jobs: [] } object", status=2)
        items = [run_batch_item(job, args) for job in jobs]
        summary = {
            "total": len(items),
            "ok": sum(1 for item in items if item.get("ok")),
            "failed": sum(1 for item in items if not item.get("ok")),
        }
        data = {"summary": summary, "items": items}
        if report_path:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return ok("batch", data, [], output=str(report_path) if report_path else None, file=str(report_path) if report_path else None)
    except Exception as exc:
        return fail("batch", "BATCH_FAILED", "Batch execution failed", detail={"message": str(exc)})


def cmd_cleanup(args: argparse.Namespace) -> int:
    removed: list[str] = []
    refused: list[dict[str, str]] = []
    cwd = Path.cwd().resolve()
    home = Path.home().resolve()
    for raw in args.paths:
        target = Path(raw).resolve()
        anchor = Path(target.anchor).resolve()
        if target == anchor or target == cwd or target == home:
            refused.append({"path": raw, "reason": "unsafe_root_or_workspace"})
            continue
        try:
            if target.is_dir():
                shutil.rmtree(target)
            elif target.exists():
                target.unlink()
            removed.append(raw)
        except Exception as exc:
            refused.append({"path": raw, "reason": str(exc)})
    warnings = [f"refused cleanup for {item['path']}: {item['reason']}" for item in refused]
    return ok("cleanup", {"removed": removed, "refused": refused}, warnings)


def cmd_self_test(_args: argparse.Namespace) -> int:
    fixture = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=")
    with tempfile.TemporaryDirectory(prefix="imagegen-workflow-self-test-") as tmp:
        generated = Path(tmp) / "generated.png"
        out = Path(tmp) / "out.png"
        generated.write_bytes(fixture)
        args = argparse.Namespace(width=2, height=2, source=None, text_composite_spec=None, preserve_source_alpha=False, transparent_edge_background=False)
        try:
            output = postprocess_bytes(generated.read_bytes(), args)
            write_output(out, output)
            return ok("self-test", {"postprocess": {"dimensions": image_dimensions(out), "bytes": len(output)}}, [])
        except Exception as exc:
            return fail("self-test", "SELF_TEST_FAILED", "Self-test failed", detail={"message": str(exc)})


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def compression_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0 or parsed > 100:
        raise argparse.ArgumentTypeError("must be between 0 and 100")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="imagegen-workflow-cli", description="Image generation, reference-image generation, editing, and postprocessing workflow CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor = subparsers.add_parser("doctor")
    doctor.add_argument("--base-url", dest="base_url")
    doctor.add_argument("--api-key", dest="api_key")
    doctor.add_argument("--model")
    doctor.set_defaults(func=cmd_doctor)

    probe = subparsers.add_parser("probe")
    probe.add_argument("--base-url", dest="base_url")
    probe.add_argument("--api-key", dest="api_key")
    probe.add_argument("--model")
    probe.add_argument("--network", action="store_true")
    probe.set_defaults(func=cmd_probe)

    generate = subparsers.add_parser("generate")
    generate.add_argument("--source")
    generate.add_argument("--text", required=True)
    generate.add_argument("--language", required=True)
    generate.add_argument("--width", required=True, type=positive_int)
    generate.add_argument("--height", required=True, type=positive_int)
    generate.add_argument("--out", required=True)
    generate.add_argument("--base-url", dest="base_url")
    generate.add_argument("--api-key", dest="api_key")
    generate.add_argument("--model")
    generate.add_argument("--dry-run", action="store_true")
    generate.add_argument("--extra-prompt", dest="extra_prompt")
    generate.add_argument("--guidance-file", dest="guidance_file")
    generate.add_argument("--size-limit", dest="size_limit", type=positive_int)
    generate.add_argument("--text-composite-spec", dest="text_composite_spec")
    generate.add_argument("--preserve-source-alpha", dest="preserve_source_alpha", action="store_true")
    generate.add_argument("--transparent-edge-background", dest="transparent_edge_background", action="store_true")
    generate.add_argument("--background", choices=["transparent", "opaque", "auto"])
    generate.add_argument("--quality", choices=["low", "medium", "high", "auto", "standard"])
    generate.add_argument("--output-format", dest="output_format", choices=["png", "webp", "jpeg"])
    generate.add_argument("--output-compression", dest="output_compression", type=compression_int)
    generate.set_defaults(func=cmd_generate)

    edit = subparsers.add_parser("edit")
    edit.add_argument("--source", required=True)
    edit.add_argument("--mask")
    edit.add_argument("--prompt")
    edit.add_argument("--text")
    edit.add_argument("--language")
    edit.add_argument("--width", required=True, type=positive_int)
    edit.add_argument("--height", required=True, type=positive_int)
    edit.add_argument("--out", required=True)
    edit.add_argument("--base-url", dest="base_url")
    edit.add_argument("--api-key", dest="api_key")
    edit.add_argument("--model")
    edit.add_argument("--dry-run", action="store_true")
    edit.add_argument("--extra-prompt", dest="extra_prompt")
    edit.add_argument("--guidance-file", dest="guidance_file")
    edit.add_argument("--size-limit", dest="size_limit", type=positive_int)
    edit.add_argument("--text-composite-spec", dest="text_composite_spec")
    edit.add_argument("--preserve-source-alpha", dest="preserve_source_alpha", action="store_true")
    edit.add_argument("--transparent-edge-background", dest="transparent_edge_background", action="store_true")
    edit.add_argument("--background", choices=["transparent", "opaque", "auto"])
    edit.add_argument("--quality", choices=["low", "medium", "high", "auto", "standard"])
    edit.add_argument("--output-format", dest="output_format", choices=["png", "webp", "jpeg"])
    edit.add_argument("--output-compression", dest="output_compression", type=compression_int)
    edit.add_argument("--input-fidelity", dest="input_fidelity", choices=["low", "high"])
    edit.add_argument("--moderation")
    edit.add_argument("--n", type=positive_int)
    edit.add_argument("--user")
    edit.set_defaults(func=cmd_edit)

    postprocess = subparsers.add_parser("postprocess")
    postprocess.add_argument("--generated", required=True)
    postprocess.add_argument("--width", required=True, type=positive_int)
    postprocess.add_argument("--height", required=True, type=positive_int)
    postprocess.add_argument("--out", required=True)
    postprocess.add_argument("--source")
    postprocess.add_argument("--text-composite-spec", dest="text_composite_spec")
    postprocess.add_argument("--preserve-source-alpha", dest="preserve_source_alpha", action="store_true")
    postprocess.add_argument("--transparent-edge-background", dest="transparent_edge_background", action="store_true")
    postprocess.add_argument("--output-format", dest="output_format", choices=["png", "webp", "jpeg"])
    postprocess.add_argument("--output-compression", dest="output_compression", type=compression_int)
    postprocess.set_defaults(func=cmd_postprocess)

    batch = subparsers.add_parser("batch")
    batch.add_argument("--jobs", required=True)
    batch.add_argument("--out")
    batch.add_argument("--base-url", dest="base_url")
    batch.add_argument("--api-key", dest="api_key")
    batch.add_argument("--model")
    batch.add_argument("--dry-run", action="store_true")
    batch.set_defaults(func=cmd_batch)

    cleanup = subparsers.add_parser("cleanup")
    cleanup.add_argument("paths", nargs="+")
    cleanup.set_defaults(func=cmd_cleanup)

    self_test = subparsers.add_parser("self-test")
    self_test.set_defaults(func=cmd_self_test)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
