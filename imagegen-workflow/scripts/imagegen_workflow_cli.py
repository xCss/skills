#!/usr/bin/env python3
"""Stable CLI for reference-image generation workflows."""

from __future__ import annotations

import argparse
import base64
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
    return base if base.endswith("/responses") else f"{base}/responses"


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


def extract_image_base64(value: Any) -> str | None:
    candidates: list[str] = []

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for key in ("image_base64", "b64_json"):
                if isinstance(item.get(key), str):
                    candidates.append(item[key])
            if isinstance(item.get("result"), str) and re.match(r"^[A-Za-z0-9+/=]+", item["result"][:80]):
                candidates.append(item["result"])
            if isinstance(item.get("url"), str) and item["url"].startswith("data:image/"):
                candidates.append(item["url"].split(",", 1)[1])
            for nested in item.values():
                visit(nested)
        elif isinstance(item, list):
            for nested in item:
                visit(nested)

    visit(value)
    return candidates[0] if candidates else None


def build_prompt(args: argparse.Namespace) -> str:
    extra = []
    if args.extra_prompt:
        extra.append(args.extra_prompt)
    if args.guidance_file:
        extra.append(Path(args.guidance_file).read_text(encoding="utf-8"))
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


def call_responses(provider: dict[str, str], source: Path, prompt: str) -> dict[str, Any]:
    import requests

    body = {
        "model": provider["model"],
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_data_url(source)},
                ],
            }
        ],
    }
    response = requests.post(
        responses_endpoint(provider["base_url"]),
        headers={"Authorization": f"Bearer {provider['api_key']}", "Content-Type": "application/json"},
        data=json.dumps(body),
        timeout=180,
    )
    if not response.ok:
        raise RuntimeError(f"Responses API failed {response.status_code}: {redact(response.text[:1000])}")
    return response_payload(response.text)


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
        for y in range(height):
            for x in range(width):
                r, g, b, a = px[x, y]
                if a > 0 and min(r, g, b) >= 232 and max(r, g, b) - min(r, g, b) <= 28:
                    px[x, y] = (r, g, b, 0)
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


def write_output(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)


def generation_plan(args: argparse.Namespace, provider: dict[str, str], source: Path, out: Path) -> dict[str, Any]:
    return {
        "source": str(source),
        "output": str(out),
        "language": args.language,
        "width": args.width,
        "height": args.height,
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
    source = Path(args.source).resolve()
    out = Path(args.out).resolve()
    if not source.exists():
        return fail("generate", "SOURCE_NOT_FOUND", "Source image does not exist", "Pass --source with a readable local image path.", {"source": str(source)}, 2)
    provider = provider_config(args)
    plan = generation_plan(args, provider, source, out)
    if args.dry_run or not args.execute:
        warnings = [] if args.execute else ["dry run only; pass --execute to consume provider API calls and write output"]
        return ok(
            "generate",
            {"model": provider["model"], "plan": plan},
            warnings,
            output=str(out),
            file=str(out),
            provider="responses-compatible",
            model=provider["model"],
            mime="image/png",
        )
    if not provider["base_url"] or not provider["api_key"]:
        return fail("generate", "NO_PROVIDER_CONFIGURED", "Provider configuration is incomplete", "Set CLI args, IMAGEGEN_BASE_URL/IMAGEGEN_API_KEY, BASE_URL/API_KEY, or Codex config/auth.", status=2)
    try:
        response = call_responses(provider, source, build_prompt(args))
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
        if args.size_limit and len(output) > args.size_limit:
            return fail("generate", "SIZE_LIMIT_EXCEEDED", "Generated image exceeds the configured size limit", detail={"bytes": len(output), "sizeLimit": args.size_limit})
        write_output(out, output)
        return ok(
            "generate",
            {"dimensions": dimensions, "bytes": len(output), "model": provider["model"], "plan": plan},
            [],
            output=str(out),
            file=str(out),
            media=str(out),
            provider="responses-compatible",
            model=provider["model"],
            mime="image/png",
        )
    except Exception as exc:
        return fail("generate", "GENERATION_FAILED", "Image generation failed", detail={"message": str(exc)})


def cmd_postprocess(args: argparse.Namespace) -> int:
    generated = Path(args.generated).resolve()
    out = Path(args.out).resolve()
    if not generated.exists():
        return fail("postprocess", "GENERATED_NOT_FOUND", "Generated image does not exist", detail={"generated": str(generated)}, status=2)
    try:
        output = postprocess_bytes(generated.read_bytes(), args)
        write_output(out, output)
        dimensions = image_dimensions(out)
        return ok("postprocess", {"dimensions": dimensions, "bytes": len(output)}, [], output=str(out), file=str(out), media=str(out), mime="image/png")
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
        base_url=job.get("base_url") or defaults.base_url,
        api_key=job.get("api_key") or defaults.api_key,
        model=job.get("model") or defaults.model,
        dry_run=bool(job.get("dry_run", defaults.dry_run)),
        execute=bool(job.get("execute", defaults.execute)),
        extra_prompt=job.get("extra_prompt"),
        guidance_file=job.get("guidance_file"),
        size_limit=int(job["size_limit"]) if job.get("size_limit") is not None else None,
        text_composite_spec=job.get("text_composite_spec"),
        preserve_source_alpha=bool(job.get("preserve_source_alpha")),
        transparent_edge_background=bool(job.get("transparent_edge_background")),
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
            write_output(out, output)
            return {
                "id": item_id,
                "command": command,
                "ok": True,
                "file": str(out),
                "mime": "image/png",
                "dimensions": image_dimensions(out),
                "bytes": len(output),
            }
        if command == "generate":
            source = Path(args.source).resolve()
            out = Path(args.out).resolve()
            provider = provider_config(args)
            if args.dry_run or not args.execute:
                return {
                    "id": item_id,
                    "command": command,
                    "ok": True,
                    "dryRun": True,
                    "file": str(out),
                    "plan": generation_plan(args, provider, source, out),
                }
            if not provider["base_url"] or not provider["api_key"]:
                raise RuntimeError("Provider environment is incomplete")
            response = call_responses(provider, source, build_prompt(args))
            image_b64 = extract_image_base64(response)
            if not image_b64:
                raise RuntimeError("No generated image base64 found in model response.")
            output = postprocess_bytes(base64.b64decode(image_b64), args)
            write_output(out, output)
            return {
                "id": item_id,
                "command": command,
                "ok": True,
                "file": str(out),
                "mime": "image/png",
                "dimensions": image_dimensions(out),
                "bytes": len(output),
            }
        raise ValueError(f"Unsupported batch command: {command}")
    except Exception as exc:
        return {"id": item_id, "command": command, "ok": False, "error": {"message": str(exc)}}


def cmd_batch(args: argparse.Namespace) -> int:
    jobs_path = Path(args.jobs).resolve()
    report_path = Path(args.out).resolve() if args.out else None
    try:
        payload = json.loads(jobs_path.read_text(encoding="utf-8"))
        jobs = payload.get("jobs", payload if isinstance(payload, list) else [])
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="imagegen-workflow-cli", description="Reference-image generation and postprocessing workflow CLI.")
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
    generate.add_argument("--source", required=True)
    generate.add_argument("--text", required=True)
    generate.add_argument("--language", required=True)
    generate.add_argument("--width", required=True, type=positive_int)
    generate.add_argument("--height", required=True, type=positive_int)
    generate.add_argument("--out", required=True)
    generate.add_argument("--base-url", dest="base_url")
    generate.add_argument("--api-key", dest="api_key")
    generate.add_argument("--model")
    generate.add_argument("--dry-run", action="store_true")
    generate.add_argument("--execute", action="store_true")
    generate.add_argument("--extra-prompt", dest="extra_prompt")
    generate.add_argument("--guidance-file", dest="guidance_file")
    generate.add_argument("--size-limit", dest="size_limit", type=positive_int)
    generate.add_argument("--text-composite-spec", dest="text_composite_spec")
    generate.add_argument("--preserve-source-alpha", dest="preserve_source_alpha", action="store_true")
    generate.add_argument("--transparent-edge-background", dest="transparent_edge_background", action="store_true")
    generate.set_defaults(func=cmd_generate)

    postprocess = subparsers.add_parser("postprocess")
    postprocess.add_argument("--generated", required=True)
    postprocess.add_argument("--width", required=True, type=positive_int)
    postprocess.add_argument("--height", required=True, type=positive_int)
    postprocess.add_argument("--out", required=True)
    postprocess.add_argument("--source")
    postprocess.add_argument("--text-composite-spec", dest="text_composite_spec")
    postprocess.add_argument("--preserve-source-alpha", dest="preserve_source_alpha", action="store_true")
    postprocess.add_argument("--transparent-edge-background", dest="transparent_edge_background", action="store_true")
    postprocess.set_defaults(func=cmd_postprocess)

    batch = subparsers.add_parser("batch")
    batch.add_argument("--jobs", required=True)
    batch.add_argument("--out")
    batch.add_argument("--base-url", dest="base_url")
    batch.add_argument("--api-key", dest="api_key")
    batch.add_argument("--model")
    batch.add_argument("--dry-run", action="store_true")
    batch.add_argument("--execute", action="store_true")
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
