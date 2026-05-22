# imagegen Workflow CLI Usage

`scripts/imagegen_workflow_cli.py` is the stable execution surface for this skill. It returns JSON on stdout for all operational commands.

## Commands

```bash
uv run python scripts/imagegen_workflow_cli.py --help
uv run python scripts/imagegen_workflow_cli.py doctor
uv run python scripts/imagegen_workflow_cli.py probe
uv run python scripts/imagegen_workflow_cli.py probe --network --model gpt-image-2
uv run python scripts/imagegen_workflow_cli.py edit --source source.png --text "Start" --language en --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py edit --source source.png --mask mask.png --prompt "Erase the old text and render Start in the same style; keep everything else unchanged" --width 240 --height 80 --out out.png --quality medium --output-format png --dry-run
uv run python scripts/imagegen_workflow_cli.py generate --text "fresh-blue-icon" --language en --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py generate --source reference.png --text "Start" --language en --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py generate --text "" --language en --width 768 --height 480 --extra-prompt "isometric cartoon scene" --out cover.webp
uv run python scripts/imagegen_workflow_cli.py postprocess --generated raw.png --source source.png --width 240 --height 80 --out out.png --preserve-source-alpha
uv run python scripts/imagegen_workflow_cli.py batch --jobs jobs.json --out report.json
uv run python scripts/imagegen_workflow_cli.py cleanup /tmp/imagegen-workflow-artifact.png
uv run python scripts/imagegen_workflow_cli.py self-test
```

`generate` and `edit` execute by default; pass `--dry-run` to inspect the plan without spending API calls.

The output format is detected from the `--out` extension (`.png`, `.webp`, `.jpg`/`.jpeg`). To override or set quality, pass `--output-format png|webp|jpeg` and `--output-compression 0..100`. `generate` and `edit` both apply local re-encoding for non-PNG targets, since the underlying Responses-compatible transport always returns PNG bytes.

## JSON Contract

Success (representative shape; field set varies by command):

```json
{
  "ok": true,
  "command": "generate",
  "output": "/tmp/out.png",
  "file": "/tmp/out.png",
  "media": "/tmp/out.png",
  "provider": "responses-compatible",
  "model": "gpt-image-2",
  "mime": "image/png",
  "data": {
    "dimensions": { "width": 256, "height": 96 },
    "bytes": 16384,
    "model": "gpt-image-2",
    "plan": { "...": "command-specific" }
  },
  "warnings": []
}
```

`generate`, `edit`, `postprocess`, and successful `batch` items include `data.dimensions` and `data.bytes`. Dry-runs include `data.plan` (and `data.prompt` for `edit`) but no `dimensions`/`bytes`. `batch` itself returns `data.summary` plus a `data.items` list; each item carries the per-job shape above.

Edit success uses the same JSON shape with `"command": "edit"`, `provider: "responses-compatible"`, and a `data.plan.endpoint` of `/responses`. The plan includes a `tool` object with `type: "image_generation"` and `action: "edit"`. If `--mask` is supplied, it is sent through the tool's `input_image_mask`; otherwise the edit is maskless.

Failure:

```json
{
  "ok": false,
  "command": "generate",
  "error": {
    "code": "NO_PROVIDER_CONFIGURED",
    "message": "Provider environment is incomplete",
    "hint": "Set CLI args, IMAGEGEN_BASE_URL/IMAGEGEN_API_KEY, BASE_URL/API_KEY, or Codex config/auth."
  }
}
```

## Cross-Skill Use

Other skills should call this CLI for source-image edits, generation, and postprocessing instead of reimplementing provider calls or Pillow transforms. The i18n-workflow skill delegates localized text-image generation, editing, and postprocessing to this CLI; see `../SKILL.md` and `../../i18n-workflow/SKILL.md` for the cross-skill routing flow. Prefer `edit` over `generate` when a current image should be modified. For H5 text-sprite edits, omit `--mask` by default and pass `--text` plus `--language`; use `--mask` only when the project adapter supplies one or a targeted retry requires it. For `generate`, omit `--source` for text-only/fresh image generation and pass `--source` only when the model should use a reference image. Pass project-specific visual requirements through `--prompt`, `--extra-prompt`, `--guidance-file`, `--mask`, `--background`, `--quality`, `--output-format`, `--output-compression`, `--input-fidelity`, `--text-composite-spec`, `--preserve-source-alpha`, and `--transparent-edge-background`.

`edit` maps to the official Responses image-generation-tool edit request. By default, omit `--mask` and pass only `--source` + `--text` / `--prompt`; the model handles text-region replacement without a mask. Use `--mask` for regional changes only when an explicit mask file is available. Mask files must be compatible PNGs with an alpha channel and the same dimensions as the edited image. Do not promise pixel-perfect mask adherence: model masks are guidance and still need visual review. For `gpt-image-2`, avoid `--background transparent`; use `opaque` or `auto`, then postprocess if the final asset needs transparency.

The Responses image path may be intermittent on some providers: a successful run can be followed by transient `502` or `503` errors on the exact same payload. When that happens, retry serially with the same source, mask setting, and prompt before rewriting the job.

For localized text-image edits, always pass `--text` with the exact target string even when `--prompt` is present. For maskless H5 edits, the prompt should say: replace only the source text with the target text, keep the canvas/background/non-text artwork unchanged, and do not add rectangular patches, debris, extra punctuation, or new outlines. If a project mask is supplied, constrain the same instruction to the masked/title area.

Avoid local text drawing as a substitute for model edit. Local operations are acceptable for postprocessing (canvas normalization, alpha restoration, edge-connected black matte cleanup, compression), but typography changes should stay in the model edit path unless the user explicitly requests a local fallback.

Text-only `generate` jobs send only text content to the Responses-compatible provider. Reference-backed `generate --source reference.png` jobs add one input image. `--source` remains required when using `--preserve-source-alpha` or `--text-composite-spec`, because those postprocessing modes need a source canvas/alpha channel.

When a Responses image call succeeds, inspect the returned `image_generation_call.result` (or equivalent edited image payload). A plain `200` is not enough if the response contains no image base64.

When cc-switch is managing Codex providers, the CLI does not call `cc-switch` directly. It follows the current Codex provider/base_url by reading `$CODEX_HOME/config.toml` and `$CODEX_HOME/auth.json`, or `~/.codex/config.toml` and `~/.codex/auth.json` when `CODEX_HOME` is unset. It does not auto-discover a local `127.0.0.1:<port>` proxy.

Batch input may be either a bare list or an object with `jobs`. Each job should include `id`, `command`, and the command-specific arguments. Use `out` (not `output`) for the per-job destination path; `--out` on the top-level `batch` command writes the aggregate report. Example using the object form:

```json
{
  "jobs": [
    {
      "id": "button-en",
      "command": "postprocess",
      "generated": "/tmp/raw.png",
      "source": "/tmp/source.png",
      "width": 240,
      "height": 80,
      "out": "/tmp/out.png",
      "preserve_source_alpha": true
    }
  ]
}
```

Fresh-image batch jobs can omit `source`:

```json
{
  "jobs": [
    {
      "id": "fresh-icon",
      "command": "generate",
      "text": "fresh-blue-icon",
      "language": "en",
      "width": 240,
      "height": 80,
      "out": "/tmp/out.png",
      "dry_run": true
    }
  ]
}
```

Existing-image modification batch jobs should use `command: "edit"`.

For H5 game i18n (default, no-mask) omit `mask`:

```json
{
  "jobs": [
    {
      "id": "button-zh-en",
      "command": "edit",
      "source": "/tmp/source.png",
      "text": "Start",
      "language": "en",
      "width": 240,
      "height": 80,
      "out": "/tmp/out.png",
      "quality": "medium",
      "output_format": "png",
      "dry_run": true
    }
  ]
}
```

Explicit mask (P4, rare). The mask path may point to an L/RGB/RGBA PNG; the CLI normalizes it to a same-size RGBA PNG before sending provider requests. If you bypass the CLI and call a provider endpoint directly, include an alpha channel in the mask PNG or the provider may reject it as missing alpha:

```json
{
  "jobs": [
    {
      "id": "button-en-edit",
      "command": "edit",
      "source": "/tmp/source.png",
      "mask": "/tmp/text-mask.png",
      "text": "Start",
      "language": "en",
      "width": 240,
      "height": 80,
      "out": "/tmp/out.png",
      "quality": "medium",
      "output_format": "png",
      "dry_run": true
    }
  ]
}
```

The bare-list form is also accepted (no `jobs` wrapper). Use it when the caller already builds a job array:

```json
[
  {
    "id": "fresh-icon",
    "command": "generate",
    "text": "fresh-blue-icon",
    "language": "en",
    "width": 240,
    "height": 80,
    "out": "/tmp/out.png",
    "dry_run": true
  }
]
```
