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

Translation quality rule: keep translations as short and accurate as possible without losing the original meaning, while still sounding natural in the target language.

Localized text-image rule: model output is only the first draft. Before accepting it, post-process and visually verify alpha edges, white/gray fringes, source-language residue, canvas fit, and UI-state coverage. If a project does not ship an explicit mask for a text sprite, derive a temporary edit mask from the source image and any available text geometry before calling image edit.

Runtime language rule: when browser auto-detection (`navigator.languages` / `navigator.language`) fails to match a shipped language, fall back to English (`en`) before the baseline/source language. If `en` is not shipped in the current worktree, keep the configured fallback chain/baseline.

The current-worktree boundary is strict: audits describe files that exist now. Do not infer supported languages or localized assets from Git history, deleted files, old branches, or planned work unless the user explicitly asks for a history/regression audit.

## When to Use

Use this skill when the user asks to:

- audit i18n, locale keys, fallback coverage, or missing translations
- set up or audit a standard i18n runtime for H5 games, including i18next, typesafe-i18n, or a compatible project runtime
- diagnose browser language detection, localStorage language preference, runtime fallback, or first-frame source-language flash
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

If the skill was copied/installed during the current agent session but cannot be hot-loaded, run the CLI directly from the copied skill path or a temporary checkout. The CLI does not require the skill body to be loaded. Use an absolute `--config` when the current working directory is not the user project root.

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
5. For H5 standard-runtime work, run `run --steps runtime --dry-run` before text/image audits. Language must be resolved before the first real UI scene.
6. Use existing report JSON from the configured `reportDirectory` for conclusions. After `extract`, inspect `runtimeKeyCoverage`; after `audit`, report exact `textImageCandidatesWithoutI18nMap` candidates, not only counts.
7. Use `cleanup` only for explicit temporary paths.
8. Use `--dry-run` for previews. When the user asks for real classification or image generation, execute without a second API-usage confirmation.
9. For generated text-images, run a retry loop before acceptance: generate/edit -> normalize/crop to the source canvas -> clean alpha/white/gray fringe artifacts -> inspect source/target contact sheet -> regenerate or patch failures.
10. For runtime UI, verify language coverage in every visible state, not just the default state: hidden labels, off/on toggles, popups, buttons, and embedded-text sprites must all be checked in-game.

Migration rationale and the complete CLI boundary are recorded in [references/migration-assessment.md](references/migration-assessment.md). Provider and credential handling for image generation are documented in [references/provider-resolution.md](references/provider-resolution.md).

## Command Routing

| User intent | CLI command |
|---|---|
| “检查配置 / 能不能跑” | `doctor` then `probe` |
| “检查 H5 语言初始化 / 首屏防闪” | `run --steps runtime --dry-run` |
| “检查标准 i18n runtime 接入” | `doctor`, `probe`, then `run --steps runtime,extract,audit --dry-run` |
| “跑 i18n 审计” | `run --steps extract,audit --dry-run` |
| “提取硬编码文本” | `run --steps extract --dry-run` |
| “检查 Cocos prefab key 覆盖” | configure `sourceTextToKey`/`getRuntimeTextKeyMap`, then `run --steps extract --dry-run` |
| “生成复核表” | `run --steps review --dry-run` |
| “提取失败重生成任务” | `run --steps jobs --dry-run` |
| “新增语言” | update project config/runtime, then `run --steps extract,audit,generate,jobs,review` |
| “模型图有白边/残影/裁切” | post-process generated assets, then rerun `run --steps audit,jobs,review --dry-run` and visual review |
| “清理临时文件” | `cleanup <path>` |

## Text-Image Generation Gate

When using a model-backed image skill/provider for localized sprites:

- Respect user constraints such as provider/model, concurrency, quality range, and allowed dimension tolerance. If unspecified, prefer exact source dimensions; if the provider returns drifted dimensions, crop/pad/scale locally back to the source canvas before integration.
- Keep generation concurrency within the configured cap. A user cap such as `10` is a maximum, not permission to exceed provider limits.
- Treat provider failure, malformed output, wrong background, white square backgrounds, clipped alpha, or wrong dimensions as retryable job failures.
- Do not accept assets with visible white/gray fringe, source-language residue, ghost text, clipped strokes, or unexpected decoration. Clean edge pixels and alpha first; regenerate when cleanup would damage the artwork.
- Build a side-by-side/contact-sheet review for source plus every target language before claiming image coverage.

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
- Do not launch any non-zh language without checking realistic text length, glyph/diacritic coverage, placeholder word order, punctuation/spacing, and constrained UI overflow in runtime.
- Do not launch Arabic (`ar`) or other RTL languages without the additional RTL runtime checks for direction, shaping, mixed LTR fragments, and mirrored UI states.
- Do not use Git history to fill current-worktree audits unless the user requested a historical audit.
- Do not make the agent reconstruct locale coverage or image manifests manually when the CLI can run the workflow.
- Do not accept synthetic extracted keys as final runtime keys when the project has canonical runtime keys; bind `sourceTextToKey` or `getRuntimeTextKeyMap` and review `runtimeKeyCoverage.missing`.
- Do not let H5 games render the first real UI scene before runtime language resolution and locale provider initialization; use a loading scene if async locale loading is required.
- Do not mix runtime fallback, locale key fallback, and text-image asset fallback into one summary; report them as separate layers.
- Do not summarize image localization as a count only; list candidates from `candidateReport` or `i18n-asset-audit.json` that need human decision.
- Do not treat model-generated images as final just because the file exists; inspect alpha, white/gray edges, residue, style drift, and actual runtime state.
- Do not require project-side mask assets for text sprites; when explicit masks are absent, synthesize a temporary mask from source geometry or source-image heuristics and then call image edit.
- Do not leave source-language UI labels hidden under sprites or inside off/on toggle tracks; remove, hide, or map them deliberately and verify in the running UI.
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
