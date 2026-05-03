# imagegen Workflow CLI Usage

`scripts/imagegen_workflow_cli.py` is the stable execution surface for this skill. It returns JSON on stdout for all operational commands.

## Commands

```bash
uv run python scripts/imagegen_workflow_cli.py --help
uv run python scripts/imagegen_workflow_cli.py doctor
uv run python scripts/imagegen_workflow_cli.py probe
uv run python scripts/imagegen_workflow_cli.py probe --network --model gpt-image-2
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

Other skills should call this CLI for source-image generation and postprocessing instead of reimplementing provider calls or Pillow transforms. Pass project-specific visual requirements through `--extra-prompt`, `--guidance-file`, `--text-composite-spec`, `--preserve-source-alpha`, and `--transparent-edge-background`.

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
