# i18n Workflow Provider Resolution

This reference explains how `i18n-workflow` handles optional API-backed image classification and generation. Model-backed image generation is delegated to the sibling `imagegen-workflow` CLI; `i18n-workflow` keeps manifest, language, quality, and Cocos import orchestration.

## When Provider Configuration Is Needed

Provider credentials are only needed for workflow stages that classify or generate localized text-image assets. Local checks such as `doctor`, `probe`, `extract`, `audit`, `jobs`, `review`, and `cleanup` must work without making paid or external API calls.

## Configuration Sources

The workflow uses environment variables for provider access:

| Variable | Purpose |
|---|---|
| `BASE_URL` | Shared API base URL for classification and image generation. |
| `API_KEY` | Shared API credential for classification and image generation. |
| `I18N_CLASSIFY_BASE_URL` | Optional classification-specific API base URL. |
| `I18N_CLASSIFY_API_KEY` | Optional classification-specific credential. |
| `I18N_CLASSIFY_MODEL` | Optional classification model; otherwise `gpt-5.5`. |
| `IMAGEGEN_BASE_URL` | Optional image-generation-specific API base URL used by `imagegen-workflow`. |
| `IMAGEGEN_API_KEY` | Optional image-generation-specific credential used by `imagegen-workflow`. |
| `IMAGEGEN_MODEL` | Optional default model for `imagegen-workflow`; otherwise `I18N_IMAGE_MODEL` or `gpt-image-2`. |
| `IMAGEGEN_WORKFLOW_CLI` | Optional absolute path to `scripts/imagegen_workflow_cli.py` if the sibling skill is installed elsewhere. |
| `CODEX_HOME` | Optional Codex config directory. The workflow reads `config.toml` and `auth.json` here before falling back to `~/.codex`. |

For both classification and image generation, provider resolution follows explicit command options where available, domain-specific environment variables, `BASE_URL` / `API_KEY`, then Codex provider/base_url and auth files commonly written by cc-switch. `CODEX_HOME` overrides the Codex directory; if unset, the workflow reads `~/.codex`. This follows the configured URL; it does not auto-discover or rewrite to a local `127.0.0.1:<port>` proxy.

Do not store credentials in `SKILL.md`, `README.md`, `references/`, committed config files, or generated reports. If a credential must be mentioned, write `[REDACTED]`.

## Command Behavior

Recommended readiness checks:

```bash
node scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
```

Expected behavior:

- `doctor` checks local config, paths, required tools, and declared language settings. It does not call external APIs.
- `probe` checks local workflow readiness and reports `hasApiEnvironment` from the classification provider resolver. It also reports non-secret provider metadata under `data.provider.classify`.
- `run --dry-run` must not consume API calls.
- `run --execute` may consume API calls when classification or image generation is included. Explain this before running it.
- The `classify` step calls the Responses API with provider settings from `I18N_CLASSIFY_*`, `BASE_URL` / `API_KEY`, or Codex config/auth files.
- The `generate` step invokes `imagegen-workflow/scripts/imagegen_workflow_cli.py generate --execute` for model-backed images. Image generation resolves provider settings through `--base-url` / `--api-key`, `IMAGEGEN_*`, `BASE_URL` / `API_KEY`, then Codex config/auth files.
- Generated image postprocessing is delegated to `imagegen-workflow/scripts/imagegen_workflow_cli.py postprocess`; `i18n-workflow` keeps i18n-specific size checks, output placement, manifest updates, and Cocos `.meta` creation.

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
    "hasApiEnvironment": true,
    "provider": {
      "classify": {
        "hasBaseUrl": true,
        "hasApiKey": true,
        "model": "gpt-5.5",
        "source": "codex-config"
      }
    }
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

If API-backed generation is requested but provider configuration is missing:

1. Run `probe` and inspect `data.hasApiEnvironment` and `data.provider.classify.source`.
2. For classification, ask the project owner to configure `I18N_CLASSIFY_BASE_URL` / `I18N_CLASSIFY_API_KEY`, `BASE_URL` / `API_KEY`, or cc-switch/Codex provider/base_url files outside the repository.
3. For image generation, run `imagegen-workflow/scripts/imagegen_workflow_cli.py doctor`; if cc-switch is configured for Codex, this should report `data.provider.source: "codex-config"` without printing secrets.
4. Use `run --execute` only after confirming the user accepts API usage.
