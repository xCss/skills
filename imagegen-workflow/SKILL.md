---
name: imagegen-workflow
description: Use when Codex needs repeatable image generation, image editing, localized text-image replacement, PNG postprocessing, readiness checks, or cleanup through a stable JSON CLI.
---

# imagegen Workflow

## Overview

Use this skill to route reusable image generation, image editing, and PNG postprocessing through `scripts/imagegen_workflow_cli.py`. The skill chooses the operation; the CLI handles provider resolution, API calls, normalization, JSON output, and cleanup.

Prefer this skill when a workflow needs exact dimensions, source/reference images, masks, target text, provider credentials, or repeatable postprocessing. Do not use it for one-off visual brainstorming or pure SVG/code-native assets.

Core rule: when modifying an existing image, prefer `edit` over full `generate`. Use full generation only when there is no usable source image, the user explicitly wants a fresh image, or the requested change is effectively a full replacement.

## CLI

Run commands from this skill directory:

```bash
uv run python scripts/imagegen_workflow_cli.py --help
uv run python scripts/imagegen_workflow_cli.py doctor
uv run python scripts/imagegen_workflow_cli.py probe
uv run python scripts/imagegen_workflow_cli.py probe --network
uv run python scripts/imagegen_workflow_cli.py edit --source source.png --mask mask.png --prompt "Erase the old text and render Start in the same style; keep everything else unchanged" --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py generate --text "fresh-blue-icon" --language en --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py generate --source reference.png --text "Start" --language en --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py generate --text "" --language en --width 768 --height 480 --extra-prompt "isometric cartoon scene" --out cover.webp
uv run python scripts/imagegen_workflow_cli.py postprocess --generated raw.png --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py batch --jobs jobs.json --out report.json
uv run python scripts/imagegen_workflow_cli.py cleanup /tmp/imagegen-workflow-artifact.png
```

The CLI prints one JSON object to stdout. Diagnostics and human-readable logs must go to stderr. Never write API keys, tokens, cookies, passwords, full Authorization headers, `.env` contents, or connection strings to output.

`generate` and `edit` execute by default and consume provider API calls. Pass `--dry-run` to inspect the plan without spending API calls. The legacy `--execute` flag is still accepted for backwards compatibility but is a no-op.

Output format follows `--out` unless overridden by `--output-format`; see `references/cli-usage.md` for compression and JSON details.

## Routing

Use `doctor` before assuming local dependencies or credentials exist. Use `probe` for lightweight readiness checks; add `--network` only when the user accepts a real provider call. Network probe checks the provider models endpoint and reports whether the selected model is visible when the provider exposes a model list.

Use `edit --dry-run` when a source image exists and the task is to replace text, remove artifacts, adjust a region, extend an image, or preserve layout/style. Add `--mask` for localized edits when the region is known. For `gpt-image-2`, avoid `--background transparent`; use `opaque`/`auto` plus postprocessing.

When the configured provider does not expose `/v1/images/edits`, keep the `edit` command and mask workflow: the CLI falls back to a Responses-compatible edit prompt with the source image plus mask image. Do not silently switch to `generate` just because Images Edit is unavailable.

If the Responses image path is flaky, retry the same edit/generate job serially before changing the prompt or mask. Treat repeated `502`, `503`, or empty-image-result responses as transport instability, not as proof that the prompt is wrong.

Use `generate --dry-run` to inspect the prompt plan. Omit `--source` for fresh images; pass it only when the model should use a reference image or source-dependent postprocessing. Provider and model resolution are documented in `references/provider-resolution.md`.

Use `postprocess` when a generated PNG already exists and needs exact canvas normalization, source-alpha preservation, edge-background transparency cleanup, or text compositing from a JSON spec.

Use `batch` when another skill has multiple JSON-described jobs. Batch supports `edit`, `postprocess`, and `generate` jobs; prefer edit jobs for existing source images.

## Edit-First Decision Rules

| Situation | Use |
|---|---|
| Existing image needs text replacement, artifact cleanup, small style fix, extension, or localized region change | `edit` |
| Existing image has a known change area | `edit --mask mask.png` |
| Existing image only needs canvas/alpha/fringe cleanup after model output | `postprocess` |
| No useful source image exists, or the user asks for a brand-new concept | `generate` without `--source` |
| A fresh image should loosely follow a reference without editing it in-place | `generate --source reference.png` |

Prompt edits with explicit invariants: “change only X; keep canvas, composition, non-text art, colors, stroke, shadow, transparency, and layout unchanged.” Avoid vague “replace text” prompts; require “erase the original text completely, reconstruct the underlying surface/background in the same style, then render the new text as native artwork.”

For text localization, pass the target text through `--text` even when also using a custom `--prompt`. The CLI injects `Use this exact replacement text: ...`; without it, the model may preserve or invent the wrong language.

Do not fall back to local text drawing/compositing for model-edit requests unless the user explicitly allows it. If model edits drift, tighten the prompt, add/adjust a mask, or retry only the failed image. Local postprocessing is for alpha/matte/canvas cleanup, not replacing the model's typography.

## Acceptance Gate

- Do not accept an image because a PNG exists. Inspect dimensions, alpha, white/gray fringe, white square backgrounds, source-text residue, spelling, and style drift.
- For logos/signboards/text art, default to **not** preserving source alpha when translated text changes shape; preserving old alpha can crop new text into source-language fragments.
- For icon/button silhouettes, source-alpha preservation may be useful, but run edge-alpha and white-box checks afterward.
- If a concurrent batch returns empty/non-JSON/502 failures, retry failed items serially before changing prompts.
- If the provider intermittently succeeds on the same request, keep the exact same prompt/mask and retry serially; do not “fix” a working prompt because of one transient failure.
- For tiny text, prefer short readable text or approved abbreviations over full strings that become illegible.
- For black matte artifacts, verify with RGBA pixel counts and gray-background composites; viewer previews may show transparent pixels as black. Remove only edge-connected black matte pixels, not legitimate interior shadows/text.

## References

- [references/cli-usage.md](references/cli-usage.md) - command examples and JSON contract.
- [references/provider-resolution.md](references/provider-resolution.md) - provider, credential, and paid-call rules.

## Verification Checklist

- [ ] `uv run python scripts/imagegen_workflow_cli.py --help` works.
- [ ] `doctor` returns JSON and does not call external APIs.
- [ ] `probe` returns JSON and does not call external APIs unless `--network` is passed.
- [ ] `edit --dry-run` returns a reusable Images Edit plan and writes no image.
- [ ] `generate --dry-run` returns a reusable plan and writes no image.
- [ ] `generate` without `--dry-run` executes the API call and writes the output.
- [ ] `generate --out cover.webp` writes a WebP file (mime `image/webp`).
- [ ] `postprocess` can normalize PNG dimensions offline.
- [ ] `batch` runs JSON-described edit/postprocess/generate jobs and writes a report when requested.
- [ ] `cleanup` removes only explicit non-root paths.
- [ ] No command prints secrets.
