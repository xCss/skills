#!/usr/bin/env python3
"""
Image operations helper for the i18n workflow.
Called via: uv run --with pillow python tools/i18n/image-ops.py <command> [options]

Commands:
  inspect   --path <image>              Output JSON with width, height, mode, file_size.
  compare   --source <img> --target <img>  Output JSON with dimensional match and basic diff score.
  validate-spec --manifest <json>       Validate all target images in the manifest match source specs.

All output is JSON to stdout for CJS consumption.
"""

import argparse
import json
import sys
from pathlib import Path


def cmd_inspect(args):
    from PIL import Image
    p = Path(args.path)
    if not p.exists():
        json.dump({"error": f"File not found: {p}"}, sys.stdout)
        return
    img = Image.open(p)
    json.dump({
        "path": str(p),
        "width": img.width,
        "height": img.height,
        "mode": img.mode,
        "file_size": p.stat().st_size,
    }, sys.stdout, indent=2)


def cmd_compare(args):
    from PIL import Image
    src_path, tgt_path = Path(args.source), Path(args.target)
    result = {
        "source": str(src_path),
        "target": str(tgt_path),
        "dimensionMatch": False,
        "problems": [],
    }
    if not src_path.exists():
        result["problems"].append("missing_source")
        json.dump(result, sys.stdout, indent=2)
        return
    if not tgt_path.exists():
        result["problems"].append("missing_target")
        json.dump(result, sys.stdout, indent=2)
        return

    src = Image.open(src_path)
    tgt = Image.open(tgt_path)
    result["sourceWidth"] = src.width
    result["sourceHeight"] = src.height
    result["targetWidth"] = tgt.width
    result["targetHeight"] = tgt.height
    result["dimensionMatch"] = src.size == tgt.size

    if not result["dimensionMatch"]:
        result["problems"].append("size_mismatch")

    json.dump(result, sys.stdout, indent=2)


def cmd_validate_spec(args):
    from PIL import Image
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        json.dump({"error": f"Manifest not found: {manifest_path}"}, sys.stdout)
        return
    manifest = json.loads(manifest_path.read_text())
    items = []
    for candidate in manifest.get("candidates", []):
        for lang, target in (candidate.get("targets") or {}).items():
            tgt_path = target.get("generatedPath") or target.get("resourcesPath")
            if not tgt_path or not target.get("exists"):
                continue
            p = Path(tgt_path)
            problems = []
            if not p.exists():
                problems.append("missing_target")
            else:
                try:
                    img = Image.open(p)
                    if img.width != candidate.get("width") or img.height != candidate.get("height"):
                        problems.append("size_mismatch")
                except Exception:
                    problems.append("unreadable_image")
            items.append({
                "spriteFrameUuid": candidate.get("spriteFrameUuid"),
                "language": lang,
                "sourceImagePath": candidate.get("sourceImagePath"),
                "targetImagePath": str(tgt_path),
                "expectedWidth": candidate.get("width"),
                "expectedHeight": candidate.get("height"),
                "problems": problems,
                "pass": len(problems) == 0,
            })
    json.dump({"generatedAt": None, "items": items}, sys.stdout, indent=2)


def main():
    parser = argparse.ArgumentParser(description="i18n image operations")
    sub = parser.add_subparsers(dest="command")

    p_inspect = sub.add_parser("inspect")
    p_inspect.add_argument("--path", required=True)

    p_compare = sub.add_parser("compare")
    p_compare.add_argument("--source", required=True)
    p_compare.add_argument("--target", required=True)

    p_validate = sub.add_parser("validate-spec")
    p_validate.add_argument("--manifest", required=True)

    args = parser.parse_args()
    if args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "validate-spec":
        cmd_validate_spec(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
