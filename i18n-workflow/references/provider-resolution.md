# i18n Workflow Provider Resolution

This reference explains how `i18n-workflow` handles optional API-backed image classification and generation.

## When Provider Configuration Is Needed

Provider credentials are only needed for workflow stages that classify or generate localized text-image assets. Local checks such as `doctor`, `probe`, `extract`, `audit`, `jobs`, `review`, and `cleanup` must work without making paid or external API calls.

## Configuration Sources

The workflow uses environment variables for provider access:

| Variable | Purpose |
|---|---|
| `BASE_URL` | API base URL for the selected image/model provider. |
| `API_KEY` | API credential for the selected provider. |

Do not store credentials in `SKILL.md`, `README.md`, `references/`, committed config files, or generated reports. If a credential must be mentioned, write `[REDACTED]`.

## Command Behavior

Recommended readiness checks:

```bash
node scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
```

Expected behavior:

- `doctor` checks local config, paths, required tools, and declared language settings. It does not call external APIs.
- `probe` checks local workflow readiness and reports `hasApiEnvironment` based on whether both `BASE_URL` and `API_KEY` are present.
- `run --dry-run` must not consume API calls.
- `run --execute` may consume API calls when image generation is included. Explain this before running it.

## Safe Output Rules

The CLI redacts sensitive fields and values before returning JSON. Output must not include:

- API keys
- tokens
- cookies
- passwords
- full Authorization headers
- `.env` contents
- full connection strings

Safe example:

```json
{
  "ok": true,
  "command": "probe",
  "data": {
    "hasApiEnvironment": true
  },
  "warnings": []
}
```

Unsafe example:

```json
{
  "apiKey": "[REDACTED]"
}
```

Even redacted credentials should be avoided unless needed for diagnostics.

## Failure Guidance

If API-backed generation is requested but provider environment is missing:

1. Run `probe` and inspect `data.hasApiEnvironment`.
2. Ask the project owner to configure credentials outside the repository.
3. Re-run `probe`.
4. Use `run --execute` only after confirming the user accepts API usage.
