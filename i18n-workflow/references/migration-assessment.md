# i18n Workflow Migration Assessment

This document records why `i18n-workflow` was migrated to a complete Skill + CLI shape.

## Classification

`i18n-workflow` is a **workflow / orchestration skill** that previously had script-heavy execution helpers.

- The Skill layer should keep routing, language policy, current-worktree boundaries, fallback strategy, and review guidance.
- The CLI layer should handle repeatable execution, config loading, diagnostics, structured JSON output, cleanup, and safe error reporting.
- The previous `tools/*.cjs` and `tools/image-ops.py` entries were absorbed into `scripts/i18n_workflow/`; `scripts/i18n-workflow-cli.cjs` is the only supported execution surface.

## Migration Value Score

| Dimension | Score | Reason |
|---|---:|---|
| Repeated use frequency | 2 | The workflow is reused across game localization audits, language launches, text-image generation, and review tasks. |
| Execution complexity | 2 | Existing execution spans extraction, asset audit, generation, regeneration jobs, review sheets, Python image helpers, and config adapters. |
| Failure cost | 2 | Mistakes can waste API calls, generate bad assets, corrupt reports, or misstate shipped languages. |
| Cross-skill reuse | 2 | Other game, asset, QA, and localization skills can reuse the CLI for audit, generation, review, and cleanup primitives. |
| Testability benefit | 2 | `doctor`, `probe`, `self-test`, JSON parsing, and redaction checks catch environment and output-contract failures early. |
| Security / credential handling | 2 | Image generation may use `BASE_URL`, `API_KEY`, provider configuration, and model/API diagnostics. |
| Current confusion level | 2 | Multiple direct tool entry points required agents to choose and chain scripts manually. |

**Total: 14 / 14**

Decision: **Complete Skill + CLI migration.** The score is above the 13+ threshold from `AGENTS.md`, so the stable CLI now owns the core execution capability.

## Caller Search Summary

Searched for `i18n-workflow` and legacy tool names in:

- `D:\Project\skills`
- `D:\GameProjects\EscapeRoomPuzzle2.4.10`

Findings:

- The skills repository now references `scripts/i18n-workflow-cli.cjs` as the only execution entry in `SKILL.md`, `README.md`, `references/cli-usage.md`, and the compatibility note.
- Historical external callers should migrate to the CLI commands listed below. Skill-level `tools/*` entries are intentionally removed to prevent new automation from bypassing the JSON contract.

## Skill / CLI Boundary

Skill keeps:

- when to use the workflow
- current-worktree language boundary
- command routing
- fallback and review guidance
- common pitfalls and verification checklist

CLI handles:

- config loading and diagnostics
- `doctor`, `probe`, `run`, `cleanup`, and `self-test`
- JSON stdout for operational commands
- native step orchestration through `scripts/i18n_workflow/`
- structured step results and secret redaction

## Removed Legacy Entries

This migration is **complete**.

- Removed skill-level `tools/run-i18n-workflow.cjs` → use `node scripts/i18n-workflow-cli.cjs run --steps ...`.
- Removed skill-level `tools/extract-hardcoded-text.cjs` → use `run --steps extract`.
- Removed skill-level `tools/audit-i18n-assets.cjs` → use `run --steps audit`.
- Removed skill-level `tools/generate-i18n-images.cjs` → use `run --steps generate` plus generation flags.
- Removed skill-level `tools/extract-i18n-regeneration-jobs.cjs` → use `run --steps jobs`.
- Removed skill-level `tools/build-i18n-review-sheets.cjs` → use `run --steps review`.
- Removed skill-level `tools/image-ops.py`; image inspection/quality behavior is owned by native CLI modules.

Do not recreate one-off wrappers for these removed entries. If a project needs compatibility, update its project-local docs/scripts to call `scripts/i18n-workflow-cli.cjs`.

Verification requirements for this complete migration:

1. `scripts/i18n-workflow-cli.cjs doctor`, `probe`, `self-test`, and relevant `run` commands pass.
2. Repository docs contain no direct skill-level `tools/*.cjs` execution instructions.
3. `node --test tests/i18n-workflow-cli.test.cjs` passes.
4. Markdown link validation passes.
