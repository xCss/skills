---
name: imagegen-workflow
description: Use when Codex needs repeatable image generation with optional references, localized text-image replacement, PNG postprocessing, model/provider readiness checks, or cleanup through a stable JSON CLI instead of ad-hoc image generation scripts.
---

# imagegen Workflow

## Overview

Use this skill to route reusable image-generation and image-edit execution through `scripts/imagegen_workflow_cli.py`. The skill layer decides whether model-backed editing, generation, or offline postprocessing is appropriate; the CLI handles provider resolution, Images/Responses-compatible API calls, image extraction, PNG normalization, postprocessing, JSON output, and cleanup.

Prefer this skill when a workflow needs a new generated image, optional source/reference image, target text or prompt, exact output dimensions, provider credentials, image edit/mask behavior, or repeatable postprocessing. Do not use it for one-off visual brainstorming that is better handled by the native image tool, or for pure SVG/code-native assets.

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
uv run python scripts/imagegen_workflow_cli.py generate --source reference.png --text "Start" --language en --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py postprocess --generated raw.png --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py batch --jobs jobs.json --out report.json
uv run python scripts/imagegen_workflow_cli.py cleanup /tmp/imagegen-workflow-artifact.png
```

The CLI prints one JSON object to stdout. Diagnostics and human-readable logs must go to stderr. Never write API keys, tokens, cookies, passwords, full Authorization headers, `.env` contents, or connection strings to output.

## Routing

Use `doctor` before assuming local dependencies or credentials exist. Use `probe` for lightweight readiness checks; add `--network` only when the user accepts a real provider call. Network probe checks the provider models endpoint and reports whether the selected model is visible when the provider exposes a model list.

Use `edit --dry-run` when a source image exists and the task is to replace text, remove artifacts, adjust a region, extend an image, or preserve layout/style. Add `--mask` for localized edits when you can identify the region to change. Official image edit parameters exposed by the CLI include `--background`, `--quality`, `--output-format`, `--output-compression`, `--input-fidelity`, `--moderation`, `--n`, and `--user`. For `gpt-image-2`, do not request `--background transparent`; use `opaque`/`auto` plus postprocessing or background removal because official docs say transparent backgrounds are not supported for that model.

When the configured provider does not expose `/v1/images/edits`, keep the `edit` command and mask workflow: the CLI falls back to a Responses-compatible edit prompt with the source image plus mask image. Do not silently switch to `generate` just because Images Edit is unavailable.

If the Responses image path is flaky, retry the same edit/generate job serially before changing the prompt or mask. Treat repeated `502`, `503`, or empty-image-result responses as transport instability, not as proof that the prompt is wrong.

Use `generate --dry-run` to inspect the prompt plan without spending API calls. `generate --source` is optional: omit it for text-only/fresh image generation, and pass it only when the model should use a reference image. Use `generate --execute` only when the task requires a fresh model image rather than editing a source. `--source` is still required with source-dependent postprocessing such as `--preserve-source-alpha` or `--text-composite-spec`. Default provider resolution is `--base-url` / `--api-key`, then `IMAGEGEN_BASE_URL` / `IMAGEGEN_API_KEY`, then `BASE_URL` / `API_KEY`, then Codex provider/base_url files written by tools such as cc-switch: `$CODEX_HOME/config.toml` plus `$CODEX_HOME/auth.json`, or `~/.codex/config.toml` plus `~/.codex/auth.json`. This follows the configured URL; it does not auto-discover a local `127.0.0.1:<port>` proxy. Default model is `IMAGEGEN_MODEL`, then `I18N_IMAGE_MODEL`, then `gpt-image-2`.

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
- [ ] `postprocess` can normalize PNG dimensions offline.
- [ ] `batch` runs JSON-described edit/postprocess/generate jobs and writes a report when requested.
- [ ] `cleanup` removes only explicit non-root paths.
- [ ] No command prints secrets.
