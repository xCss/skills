# i18n Workflow Migration Assessment

This document records why `i18n-workflow` was migrated to a Skill + CLI shape and what remains intentionally compatible.

## Classification

`i18n-workflow` is a **workflow / orchestration skill** with script-heavy execution helpers.

- The Skill layer should keep routing, language policy, current-worktree boundaries, fallback strategy, and review guidance.
- The CLI layer should handle repeatable execution, config loading, diagnostics, structured JSON output, cleanup, and safe error reporting.
- The existing `tools/*.cjs` and `tools/image-ops.py` files are retained as implementation/compatibility tools during the migration window.

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

Decision: **Migrate to Skill + CLI.** The score is above the 9+ threshold from `AGENTS.md`, so the workflow needs an executable CLI and should not remain documentation-only.

## Caller Search Summary

Searched for `i18n-workflow` and legacy tool names in:

- `D:\Project\skills`
- `D:\GameProjects\EscapeRoomPuzzle2.4.10`

Findings:

- The skills repository now references the new `scripts/i18n-workflow-cli.cjs` facade in `SKILL.md`, `README.md`, `references/cli-usage.md`, and the legacy compatibility note.
- `D:\GameProjects\EscapeRoomPuzzle2.4.10` still contains active old-path references in tests and project-local skill docs, including direct calls to `tools/audit-i18n-assets.cjs`, `tools/generate-i18n-images.cjs`, and `tools/i18n/*` wrappers.
- Because active external callers still exist, old `tools/*` entry points must remain available for at least one migration cycle.

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
- legacy tool orchestration through a stable facade
- captured legacy output and secret redaction

## Legacy Entry Policy

This migration is **Phase 1: facade-first compatibility**.

- Do not delete `tools/*.cjs` or `tools/image-ops.py`.
- Do not convert every legacy tool into a wrapper yet; existing tests and project-local callers may depend on their native output and mode flags.
- New automation must call `scripts/i18n-workflow-cli.cjs`.
- Direct legacy tool calls are fallback/debug paths only.

Legacy entries can be converted to deprecation wrappers in Phase 2 after known callers migrate. Wrapper warnings must go to stderr, and stdout must remain compatible with the legacy command's expected output until the removal window ends.

Removal is allowed only after:

1. `scripts/i18n-workflow-cli.cjs doctor`, `probe`, `self-test`, and relevant `run` commands pass.
2. Repository and project searches find no active direct callers except historical notes.
3. Project-local docs such as `.claude/skills/i18n-workflow.md` have migrated to the CLI facade.
4. At least one real task or release cycle has passed with the CLI facade as the documented entry point.
5. The final removal report lists deleted legacy entries and replacement commands.
