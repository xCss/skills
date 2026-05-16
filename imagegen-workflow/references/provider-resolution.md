# imagegen Workflow Provider Resolution

Provider credentials are required for real `edit`, `generate`, batch edit/generate jobs, and `probe --network`. Local commands such as `doctor`, `probe`, `edit --dry-run`, `generate --dry-run`, `postprocess`, dry-run/offline batch jobs, `cleanup`, and `self-test` must not make paid or external API calls.

## Resolution Order

The CLI resolves provider settings in this order:

1. Explicit CLI arguments: `--base-url`, `--api-key`, `--model`.
2. Skill-specific environment: `IMAGEGEN_BASE_URL`, `IMAGEGEN_API_KEY`, `IMAGEGEN_MODEL`.
3. Shared environment: `BASE_URL`, `API_KEY`, `I18N_IMAGE_MODEL`.
4. Codex provider/base_url files, which are commonly written by cc-switch: `$CODEX_HOME/config.toml` plus `$CODEX_HOME/auth.json`, or `~/.codex/config.toml` plus `~/.codex/auth.json` when `CODEX_HOME` is not set. The CLI reads the active `model_provider`, then `[model_providers.<name>].base_url`, and reads `OPENAI_API_KEY` from `auth.json`.
5. Model fallback: `gpt-image-2`.

`--base-url` may be either a root API URL or a `/responses` endpoint. The CLI appends `/responses` when needed for `generate` and `edit`; both commands send the official Responses `image_generation` tool, with `action: "generate"` or `action: "edit"`. `probe --network` checks the sibling `/models` endpoint and reports `modelVisible` when it can parse model IDs from `data[].id`.

Some codex/cc-switch backends expose text models reliably but only intermittent image support. If the same `/responses` image request flips between `200`, `502`, `503`, or empty-image-result payloads, treat the backend as image-capable-but-flaky and retry serially before changing prompts or source assets.

`doctor` and `probe` include a non-secret `source` field: `args`, `environment`, `codex-config`, `mixed`, or `none`. They report only whether a base URL and API key are present; they must never print the credential value.

This fallback follows whatever `base_url` is configured in Codex. If cc-switch writes a remote relay such as `https://...`, the CLI calls that remote relay. It does not auto-discover or rewrite to a local `127.0.0.1:<port>` proxy.

## Safety Rules

Do not store credentials in `SKILL.md`, references, generated reports, tests, or committed config files. Do not print API keys, tokens, cookies, passwords, full Authorization headers, `.env` contents, or connection strings. If a credential must be described, write `[REDACTED]`.

`edit` and `generate` execute by default; use `--dry-run` for previews. Treat the user's request for real image output as consent to execute, while still redacting credentials and reporting provider failures safely.
