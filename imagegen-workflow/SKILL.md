---
name: imagegen-workflow
description: Use when Codex needs repeatable image generation, image editing, localized text-image replacement, PNG postprocessing, readiness checks, or cleanup through a stable JSON CLI.
---

# imagegen Workflow

## Overview

Use this skill to route reusable image generation, image editing, and PNG postprocessing through `scripts/imagegen_workflow_cli.py`. The skill chooses the operation; the CLI handles provider resolution, API calls, normalization, JSON output, and cleanup.

Prefer this skill when a workflow needs exact dimensions, source/reference images, masks, target text, provider credentials, or repeatable postprocessing. Do not use it for one-off visual brainstorming or pure SVG/code-native assets.

Core rule: when modifying an existing image, prefer `edit` over full `generate`. Use full generation only when there is no usable source image, the user explicitly wants a fresh image, or the requested change is effectively a full replacement.

Two documents define this workflow: **SKILL.md** (this file) for workflow guidance and routing, and `references/cli-usage.md` for the JSON contract and command examples. The i18n workflow at `../i18n-workflow/SKILL.md` delegates text-image generation, editing, and postprocessing to this skill.

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

`generate` and `edit` execute by default and consume provider API calls. Pass `--dry-run` to inspect the plan without spending API calls.

Output format follows `--out` unless overridden by `--output-format`; see `references/cli-usage.md` for compression and JSON details.

## Routing

Use `doctor` before assuming local dependencies or credentials exist. Use `probe` for lightweight readiness checks; add `--network` only when the user accepts a real provider call. Network probe checks the provider models endpoint and reports whether the selected model is visible when the provider exposes a model list.

Use `edit --dry-run` when a source image exists and the task is to replace text, remove artifacts, adjust a region, extend an image, or preserve layout/style. For H5 localized text sprites, omit `--mask` by default and pass `--text`; add `--mask` only when the project adapter provides one or a targeted retry needs a constrained region. The CLI sends edits through `/responses` with the official `image_generation` tool and `action: "edit"`; masks, when supplied, are passed as `input_image_mask`. For `gpt-image-2`, avoid `--background transparent` (use `opaque`/`auto` plus postprocessing) and skip `--input-fidelity` — the model forces high fidelity automatically; the CLI drops the flag and surfaces a warning.

Keep the `edit` command for existing-image changes. Do not silently switch to `generate` just because the configured provider lacks a separate `/v1/images/edits` endpoint; `edit` is a Responses image-generation-tool action.

If the Responses image path is flaky, retry the same edit/generate job serially before changing the prompt or mask setting. Treat repeated `502`, `503`, or empty-image-result responses as transport instability, not as proof that the prompt is wrong.

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

## Failure Recovery by Stage

| Stage | Typical failure | Recovery step |
|------|----------------|---------------|
| `doctor` | Missing dependencies or credentials | Check Python version, uv availability, and credential resolution (provider-resolution.md) |
| `probe` | Provider env incomplete | Inspect `data.hasApiEnvironment`; if missing, configure `IMAGEGEN_*` or Codex auth |
| `edit` / `generate` | Provider 502/503 / empty response | Keep exact same source, mask setting, and prompt, then retry serially; flaky backend, not wrong prompt |
| `edit` / `generate` | Style drift / wrong language / ghost text | Tighten prompt, add explicit invariants; for text, ensure `--text` is passed |
| `postprocess` | Canvas mismatch / alpha corruption | Verify `--width`/`--height` match source; use `--preserve-source-alpha` only when source alpha is valid |
| `batch` | Partial job failures | Re-run failed jobs individually with same config; check per-job provider limits |
| `edit` (mask stage) | Mask size mismatch | Verify mask dimensions match source exactly; use `postprocess` or Pillow to resize mask before re-invoking |
| `edit` (mask stage) | Mask content wrong (missing alpha / color mask) | Convert mask to grayscale PNG; white = edit region, black = preserved. Confirm foreground is pure white and background pure black |
| `edit` (mask stage) | No explicit mask available | This is the normal case. Omit `--mask`; rely on `--text` + edit prompt, then use `--text-composite-spec` postprocess to replace only text pixels. See Mask Source Priority → P2 |

### Mask Source Priority (H5 game projects)

For i18n H5 game projects where source images are only in Chinese and no designer-produced masks exist, the practical priority is:

**P1 (default / mainstay): No-mask edit** – Omit `--mask`, pass only `--source` + `--text`. The edit prompt explicitly instructs the model to remove old text and draw new text while preserving non-text background. Suitable for buttons, banners, titles with complex gradients/textures. Most robust in practice.

**P2 (cleanup): text-composite postprocess** – After a P1 edit, if the model altered background pixels near text, run `--text-composite-spec` with known text bounding boxes from i18n extract. `composite_text()` copies only the model-generated text pixels onto original background. Requires i18n pipeline to record `textRects` or `clearRects`.

**P3 (fallback): generate replacement** – Abandon `edit`, regenerate the entire image via `generate` if `edit` consistently changes composition/color palette or degrades beyond 3 retries.

**P4 (precise): explicit mask** – Only applicable when a project adapter explicitly provides `mask` files. Rare in H5 game i18n.

### Optional Explicit Mask Method (P4 only)

Use this section only after P1 no-mask edit and P2 text-composite cleanup fail, or when a project adapter already provides an explicit mask. Do not synthesize masks as the first-pass H5 i18n path.

**From textComposite geometry:**
- Input: source image dimensions + `textComposite` object with `{ x, y, width, height }` (or polygon `{ points: [{x,y},...] }`).
- Create a same-size black/white mask PNG. The CLI accepts L/RGB/RGBA input masks and normalizes them to RGBA PNG before provider upload.
- Fill the target region with `#FFFFFF` (white = edit region).
- Fill everything else with `#000000` (black = preserved).
- If the composite describes a polygon, use Pillow `ImageDraw.polygon`.
- Save as PNG and pass as `--mask`. If bypassing the CLI and posting directly to a provider endpoint, send a PNG with an alpha channel; L/RGB masks can fail with `mask image missing alpha channel`.

**From source-image auto-detection (last resort):**
- Use OCR or Pillow contour analysis only when no project mask/geometry exists and a constrained P4 retry is still preferable to full regeneration.
- Merge adjacent bounding boxes, expand by 4–8px to avoid clipping glyph edges.
- Render white rectangles on a black canvas of the same dimensions.
- Fall back to full-canvas edit if detection yields no region or covers >80 % of the image.

**Important:** After any explicit mask is prepared, verify it covers the full target text. A partial mask leaves ghost characters in the preserved region.

For localized text-image failures (ghost source text, clipped translated text, wrong-language rendering), see `../i18n-workflow/SKILL.md` for text-audit retry guidance.

## Common Pitfalls

- Do not call `edit` without `--text` when replacing text in an image; the prompt alone often preserves original language.
- Do not retry a failed provider call by rewriting the prompt if the failure was 502/503/timeout; retry the exact same request.
- Do not assume `batch` output is valid without checking each job's `ok` field.
- Do not use `--preserve-source-alpha` for logos/signboards/text art when translated text changes shape; old alpha may crop new glyphs.
- Do not call `probe --network` without user consent; it fires a real provider call.
- Do not store credentials in SKILL.md, references, reports, tests, or committed config.
- Do not accept generated images because the file exists; always inspect dimensions, alpha, fringe, residue, and style.
- Do not use full `generate` when `edit --source source.png` can modify the existing image.
- Do not create an `edit` mask that is smaller than the source image; the mask must have identical dimensions. Resize or pad before passing.
- Do not rely on raw L/RGB mask bytes when bypassing this CLI; some provider endpoints require mask PNGs to include an alpha channel. Through this CLI, `--mask` input is normalized to RGBA PNG automatically.
- Do not call `edit --mask` with a mask that does not cover the full target text; partial masks often leave ghost characters.
- For H5 game i18n, no-mask edit is the default (P1). Mask synthesis from geometry is P4 and rarely used. See Mask Source Priority above.

## References

- [references/cli-usage.md](references/cli-usage.md) - command examples and JSON contract.
- [references/provider-resolution.md](references/provider-resolution.md) - provider, credential, and paid-call rules.

## Verification Checklist

- [ ] `uv run python scripts/imagegen_workflow_cli.py --help` works.
- [ ] `doctor` returns JSON and does not call external APIs.
- [ ] `probe` returns JSON and does not call external APIs unless `--network` is passed.
- [ ] `edit --dry-run` returns a reusable Responses image-generation-tool edit plan and writes no image.
- [ ] `generate --dry-run` returns a reusable plan and writes no image.
- [ ] `generate` without `--dry-run` executes the API call and writes the output.
- [ ] `generate --out cover.webp` writes a WebP file (mime `image/webp`).
- [ ] `postprocess` can normalize PNG dimensions offline.
- [ ] `batch` runs JSON-described edit/postprocess/generate jobs and writes a report when requested.
- [ ] `cleanup` removes only explicit non-root paths.
- [ ] No command prints secrets.
