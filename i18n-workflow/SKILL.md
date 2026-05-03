---
name: i18n-workflow
description: Use when a game project needs multilingual text, locale coverage auditing, localized text-image assets, i18n regression checks, or repeatable language launch workflows.
license: MIT
metadata:
  hermes:
    tags: [i18n, localization, game-assets, cli, workflow]
    related_skills: []
---

# i18n Workflow

## Overview

This skill routes game localization work through a stable CLI instead of ad-hoc scripts. Use the skill for judgment, workflow selection, fallback policy, and review requirements; use the CLI for repeatable execution and JSON output.

The current-worktree boundary is strict: audits describe files that exist now. Do not infer supported languages or localized assets from Git history, deleted files, old branches, or planned work unless the user explicitly asks for a history/regression audit.

## When to Use

Use this skill when the user asks to:

- audit i18n, locale keys, fallback coverage, or missing translations
- add or verify a language such as English, Arabic, Vietnamese, Japanese, or Korean
- find hardcoded user-facing strings in game UI files
- identify, generate, audit, compare, or regenerate localized text-image assets
- build human review sheets or language-launch checklists
- diagnose runtime language detection or resource fallback behavior

Do not use this skill when:

- the user only asks for a general i18n explanation
- the work is unrelated to text, localization, or localized assets
- a project-specific localization skill supersedes this generic workflow

## CLI

Primary command from this skill directory:

```bash
node scripts/i18n-workflow-cli.cjs --help
```

Required health checks:

```bash
node scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs self-test
```

Common execution:

```bash
node scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps extract,audit,jobs,review --dry-run
node scripts/i18n-workflow-cli.cjs cleanup tools/reports/.tmp-i18n-images
```

The agent should call this CLI instead of writing temporary Node, Python, or shell scripts for core i18n workflow behavior.

## Recommended Workflow

1. Read `README.md`, `contracts.md`, and `checklists.md` for the latest workflow contract.
2. Run `doctor` before assuming a project is bound to the workflow.
3. Run `probe` before expensive or multi-step work.
4. Use `run` for workflow stages; pass `--steps` to limit scope.
5. Use existing report JSON from the configured `reportDirectory` for conclusions.
6. Use `cleanup` only for explicit temporary paths.
7. For API-backed image generation, explain that `--execute` consumes API calls before running it.

Migration rationale and the complete CLI boundary are recorded in [references/migration-assessment.md](references/migration-assessment.md). Provider and credential handling for image generation are documented in [references/provider-resolution.md](references/provider-resolution.md).

## Command Routing

| User intent | CLI command |
|---|---|
| “检查配置 / 能不能跑” | `doctor` then `probe` |
| “跑 i18n 审计” | `run --steps extract,audit --dry-run` |
| “提取硬编码文本” | `run --steps extract --dry-run` |
| “生成复核表” | `run --steps review --dry-run` |
| “提取失败重生成任务” | `run --steps jobs --dry-run` |
| “新增语言” | update project config/runtime, then `run --steps extract,audit,generate,jobs,review` |
| “清理临时文件” | `cleanup <path>` |

## Output Contract

The CLI prints one JSON object to stdout for operational commands. Logs and diagnostics are returned in structured fields or written to stderr; API keys, tokens, cookies, passwords, full Authorization headers, and `.env` contents must never appear in output.

Successful output:

```json
{
  "ok": true,
  "command": "doctor",
  "data": {},
  "warnings": []
}
```

Failure output:

```json
{
  "ok": false,
  "command": "doctor",
  "error": {
    "code": "CONFIG_NOT_FOUND",
    "message": "i18n workflow config not found"
  }
}
```

Never print API keys, tokens, cookies, passwords, full Authorization headers, or `.env` contents.

## Common Pitfalls

- Do not add `en`, `ar`, `vi`, or any language to `supportedLanguages` unless the current worktree actually ships that language.
- Do not use Git history to fill current-worktree audits unless the user requested a historical audit.
- Do not make the agent reconstruct locale coverage or image manifests manually when the CLI can run the workflow.
- Do not mix debug noise into stdout; the CLI must keep stdout machine-readable JSON.
- Do not recreate deleted skill-level `tools/*.cjs` entry points; `scripts/i18n-workflow-cli.cjs` is the only supported execution surface.
- Project-local paths such as `tools/i18n-workflow.config.cjs` and `tools/reports/` are user-project configuration/report locations, not skill implementation tools.

## Verification Checklist

- [ ] `SKILL.md` starts with valid YAML frontmatter.
- [ ] `scripts/i18n-workflow-cli.cjs --help` works.
- [ ] `doctor` returns JSON and does not call external APIs.
- [ ] `probe` returns JSON and checks local workflow readiness.
- [ ] `run` returns JSON with native CLI step results.
- [ ] `cleanup` removes only explicitly supplied paths.
- [ ] No command prints secrets.
- [ ] No direct calls to removed skill-level `tools/*.cjs` entries are introduced.
- [ ] Migration score, caller search, and deprecation/removal policy are documented.
