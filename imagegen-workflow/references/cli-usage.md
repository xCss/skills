# imagegen Workflow CLI Usage

`scripts/imagegen_workflow_cli.py` is the stable execution surface for this skill. It returns JSON on stdout for all operational commands.

## Commands

```bash
uv run python scripts/imagegen_workflow_cli.py --help
uv run python scripts/imagegen_workflow_cli.py doctor
uv run python scripts/imagegen_workflow_cli.py probe
uv run python scripts/imagegen_workflow_cli.py probe --network --model gpt-image-2
uv run python scripts/imagegen_workflow_cli.py edit --source source.png --mask mask.png --prompt "Erase the old text and render Start in the same style; keep everything else unchanged" --width 240 --height 80 --out out.png --quality medium --output-format png --dry-run
uv run python scripts/imagegen_workflow_cli.py edit --source source.png --text "Start" --language en --width 240 --height 80 --out out.png --execute
uv run python scripts/imagegen_workflow_cli.py generate --source source.png --text "Start" --language en --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py generate --source source.png --text "Start" --language en --width 240 --height 80 --out out.png --execute
uv run python scripts/imagegen_workflow_cli.py postprocess --generated raw.png --source source.png --width 240 --height 80 --out out.png --preserve-source-alpha
uv run python scripts/imagegen_workflow_cli.py batch --jobs jobs.json --out report.json
uv run python scripts/imagegen_workflow_cli.py cleanup /tmp/imagegen-workflow-artifact.png
uv run python scripts/imagegen_workflow_cli.py self-test
```

## JSON Contract

Success:

```json
{
  "ok": true,
  "command": "generate",
  "output": "/tmp/out.png",
  "file": "/tmp/out.png",
  "provider": "responses-compatible",
  "model": "gpt-image-2",
  "mime": "image/png",
  "data": {},
  "warnings": []
}
```

Edit success uses the same JSON shape with `"command": "edit"`, `provider: "responses-compatible"`, and a `data.plan.endpoint` of `/v1/images/edits`. The endpoint field records the official edit semantics; the transport may be Responses-compatible when the configured provider does not expose the Images Edit endpoint directly.

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

Other skills should call this CLI for source-image edits, generation, and postprocessing instead of reimplementing provider calls or Pillow transforms. Prefer `edit` over `generate` when a current image should be modified. Pass project-specific visual requirements through `--prompt`, `--extra-prompt`, `--guidance-file`, `--mask`, `--background`, `--quality`, `--output-format`, `--output-compression`, `--input-fidelity`, `--text-composite-spec`, `--preserve-source-alpha`, and `--transparent-edge-background`.

`edit` maps to the official Images Edit style of request. Use `--mask` for regional changes; mask files must be compatible PNGs with an alpha channel and the same dimensions as the edited image. If the provider lacks `/v1/images/edits`, the CLI keeps edit semantics by sending the source image and mask through the Responses-compatible path. Do not promise pixel-perfect mask adherence: model masks are guidance and still need visual review. For `gpt-image-2`, avoid `--background transparent`; use `opaque` or `auto`, then postprocess if the final asset needs transparency.

The Responses image path may be intermittent on some providers: a successful run can be followed by transient `502` or `503` errors on the exact same payload. When that happens, retry serially with the same source, mask, and prompt before rewriting the job.

For localized text-image edits, always pass `--text` with the exact target string even when `--prompt` is present. The prompt should say: change only the masked/title area, keep everything else unchanged, and do not add rectangular patches, debris, extra punctuation, or new outlines.

Avoid local text drawing as a substitute for model edit. Local operations are acceptable for postprocessing (canvas normalization, alpha restoration, edge-connected black matte cleanup, compression), but typography changes should stay in the model edit path unless the user explicitly requests a local fallback.

When a Responses image call succeeds, inspect the returned `image_generation_call.result` (or equivalent edited image payload). A plain `200` is not enough if the response contains no image base64.

When cc-switch is managing Codex providers, the CLI does not call `cc-switch` directly. It follows the current Codex provider/base_url by reading `$CODEX_HOME/config.toml` and `$CODEX_HOME/auth.json`, or `~/.codex/config.toml` and `~/.codex/auth.json` when `CODEX_HOME` is unset. It does not auto-discover a local `127.0.0.1:<port>` proxy.

Batch input may be either a list or an object with `jobs`. Each job should include `id`, `command`, and the command-specific arguments. Example:

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

Existing-image modification batch jobs should use `command: "edit"`:

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
