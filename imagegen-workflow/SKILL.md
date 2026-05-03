---
name: imagegen-workflow
description: Use when Codex needs repeatable reference-image generation, localized text-image replacement, PNG postprocessing, model/provider readiness checks, or cleanup through a stable JSON CLI instead of ad-hoc image generation scripts.
---

# imagegen Workflow

## Overview

Use this skill to route reusable image-generation execution through `scripts/imagegen_workflow_cli.py`. The skill layer decides whether model-backed generation is appropriate; the CLI handles provider resolution, Responses-compatible API calls, image extraction, PNG normalization, postprocessing, JSON output, and cleanup.

Prefer this skill when a workflow needs a source/reference image, target text, exact output dimensions, provider credentials, or repeatable postprocessing. Do not use it for one-off visual brainstorming that is better handled by the native image tool, or for pure SVG/code-native assets.

## CLI

Run commands from this skill directory:

```bash
uv run python scripts/imagegen_workflow_cli.py --help
uv run python scripts/imagegen_workflow_cli.py doctor
uv run python scripts/imagegen_workflow_cli.py probe
uv run python scripts/imagegen_workflow_cli.py probe --network
uv run python scripts/imagegen_workflow_cli.py generate --source source.png --text "Start" --language en --width 240 --height 80 --out out.png --dry-run
uv run python scripts/imagegen_workflow_cli.py postprocess --generated raw.png --width 240 --height 80 --out out.png
uv run python scripts/imagegen_workflow_cli.py batch --jobs jobs.json --out report.json
uv run python scripts/imagegen_workflow_cli.py cleanup /tmp/imagegen-workflow-artifact.png
```

The CLI prints one JSON object to stdout. Diagnostics and human-readable logs must go to stderr. Never write API keys, tokens, cookies, passwords, full Authorization headers, `.env` contents, or connection strings to output.

## Routing

Use `doctor` before assuming local dependencies or credentials exist. Use `probe` for lightweight readiness checks; add `--network` only when the user accepts a real provider call. Network probe checks the provider models endpoint and reports whether the selected model is visible when the provider exposes a model list.

Use `generate --dry-run` to inspect the prompt plan without spending API calls. Use `generate --execute` when the task requires real model generation. Default provider resolution is `--base-url` / `--api-key`, then `IMAGEGEN_BASE_URL` / `IMAGEGEN_API_KEY`, then `BASE_URL` / `API_KEY`, then Codex provider/base_url files written by tools such as cc-switch: `$CODEX_HOME/config.toml` plus `$CODEX_HOME/auth.json`, or `~/.codex/config.toml` plus `~/.codex/auth.json`. This follows the configured URL; it does not auto-discover a local `127.0.0.1:<port>` proxy. Default model is `IMAGEGEN_MODEL`, then `I18N_IMAGE_MODEL`, then `gpt-image-2`.

Use `postprocess` when a generated PNG already exists and needs exact canvas normalization, source-alpha preservation, edge-background transparency cleanup, or text compositing from a JSON spec.

Use `batch` when another skill has multiple JSON-described jobs. Batch supports `postprocess` jobs offline and `generate` jobs in dry-run or execute mode, returning per-job JSON results and an optional report file.

## References

- [references/cli-usage.md](references/cli-usage.md) - command examples and JSON contract.
- [references/provider-resolution.md](references/provider-resolution.md) - provider, credential, and paid-call rules.

## Verification Checklist

- [ ] `uv run python scripts/imagegen_workflow_cli.py --help` works.
- [ ] `doctor` returns JSON and does not call external APIs.
- [ ] `probe` returns JSON and does not call external APIs unless `--network` is passed.
- [ ] `generate --dry-run` returns a reusable plan and writes no image.
- [ ] `postprocess` can normalize PNG dimensions offline.
- [ ] `batch` runs JSON-described jobs and writes a report when requested.
- [ ] `cleanup` removes only explicit non-root paths.
- [ ] No command prints secrets.
