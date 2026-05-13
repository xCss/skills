# Standard i18n Runtime Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `i18n-workflow` from a localization audit/image workflow into a generic standard-i18n-runtime workflow suitable for H5 games using providers such as `i18next`, `typesafe-i18n`, or a compatible project runtime.

**Architecture:** Keep the existing Skill + CLI boundary. The skill describes policy and routing; the CLI validates config, probes runtime readiness, audits locale/provider contracts, and writes JSON reports. Runtime implementation remains project-owned through adapter/config fields, so the workflow stays reusable across games.

**Tech Stack:** Node.js CommonJS CLI, project adapter config (`tools/i18n-workflow.config.cjs`), JSON reports, optional standard i18n providers (`i18next`, `typesafe-i18n`, or compatible custom runtime).

---

## File Structure

- Modify: `SKILL.md`
  - Add standard-runtime use cases, B-scheme policy, and command routing for runtime/provider audits.
- Modify: `README.md`
  - Document generic H5 standard i18n runtime workflow and startup-before-first-scene rule.
- Modify: `contracts.md`
  - Add `runtime`, `i18nRuntime`, `locales`, and runtime audit report schemas.
- Modify: `templates/config.example.cjs`
  - Add provider-neutral runtime configuration while preserving existing image/text hooks.
- Modify: `scripts/i18n-workflow-cli.cjs`
  - Add runtime checks to `doctor`/`probe`; add optional run step `runtime`.
- Modify: `scripts/i18n_workflow/common.cjs`
  - Add shared helpers for runtime config validation and browser language simulation.
- Create: `scripts/i18n_workflow/runtime.cjs`
  - Own standard i18n runtime audit logic.
- Modify: `tests/i18n-workflow-cli.test.cjs`
  - Add coverage for runtime config validation, fallback behavior, JSON output, and provider-neutral operation.
- Modify: `references/cli-usage.md`
  - Document `run --steps runtime` and report outputs.
- Create: `references/standard-runtime-workflow.md`
  - Human-readable reference for B-scheme provider binding and H5 startup requirements.

---

### Task 1: Add Runtime Contract to Docs and Template

**Files:**
- Modify: `contracts.md`
- Modify: `templates/config.example.cjs`
- Create: `references/standard-runtime-workflow.md`

- [ ] **Step 1: Write contract fields before code**

Add to `contracts.md`:

```js
runtime: {
  platform: 'h5',
  detector: 'browser-navigator',
  preferenceStorage: 'localStorage',
  preferenceKey: 'game.language',
  initBeforeFirstScene: true,
},

i18nRuntime: {
  provider: 'i18next', // or 'typesafe-i18n' / 'custom-compatible'
  initFile: 'assets/scripts/i18n/initI18n.ts',
  translateFunction: 't',
  setLanguageFunction: 'setLanguage',
  getLanguageFunction: 'getLanguage',
},

locales: {
  directory: 'assets/i18n',
  format: 'json',
  namespaceMode: 'optional',
},
```

- [ ] **Step 2: Update config template**

Add commented defaults matching the contract. Keep existing top-level fields (`supportedLanguages`, `baselineLanguage`, `fallbackChain`, `browserLanguageFallback`) for backward compatibility.

- [ ] **Step 3: Add standard runtime reference**

Create `references/standard-runtime-workflow.md` with:

- purpose of B-scheme runtime workflow
- supported provider contract
- H5 language detection order
- no-first-frame-source-language-flash requirement
- runtime fallback vs resource fallback distinction
- how adapters keep the workflow engine-agnostic

- [ ] **Step 4: Verify markdown/readability**

Run:

```bash
node scripts/i18n-workflow-cli.cjs --help
```

Expected: help prints normally; no docs-related syntax break is expected because docs are markdown/config comments only.

---

### Task 2: Implement Runtime Audit Module

**Files:**
- Create: `scripts/i18n_workflow/runtime.cjs`
- Modify: `scripts/i18n_workflow/common.cjs`

- [ ] **Step 1: Write failing tests for runtime helper behavior**

In `tests/i18n-workflow-cli.test.cjs`, add tests for:

- `zh-CN` resolves to `zh`
- `en-US` resolves to `en`
- unsupported browser language resolves to `en` when `en` is shipped
- unsupported browser language resolves to baseline/fallback when `en` is not shipped
- missing `runtime.initBeforeFirstScene` produces a warning or failure item

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
node --test tests/i18n-workflow-cli.test.cjs
```

Expected: FAIL because `runtime.cjs` and CLI integration do not exist yet.

- [ ] **Step 3: Add shared validation helpers**

In `common.cjs`, add:

```js
function runtimeConfig(config) { /* return normalized runtime block */ }
function i18nRuntimeConfig(config) { /* return normalized provider block */ }
function localeConfig(config) { /* return normalized locales block */ }
function simulateBrowserLanguageResolution(config, browserLanguages) { /* uses resolveRuntimeLanguage */ }
```

Do not use `as any`, suppressed errors, or hidden fallback to deleted files.

- [ ] **Step 4: Implement runtime audit module**

Create `runtime.cjs` exporting:

```js
function runRuntimeAudit(config, args) {
  return {
    generatedAt: new Date().toISOString(),
    summary: {},
    runtime: {},
    i18nRuntime: {},
    languageResolutionCases: [],
    warnings: [],
    problems: []
  };
}

module.exports = { runRuntimeAudit };
```

It should validate:

- H5 projects use browser navigator detection or explicitly document a custom detector
- `initBeforeFirstScene` is true for H5 runtime workflows
- provider exposes or documents `init`, `t`, `setLanguage`, and `getLanguage`
- locale directory is configured when provider expects file-backed locales
- fallback simulation includes common browser values: `zh-CN`, `zh-TW`, `en-US`, `ja-JP`, `fr-FR`, unsupported code

- [ ] **Step 5: Run tests**

Run:

```bash
node --test tests/i18n-workflow-cli.test.cjs
```

Expected: runtime helper tests pass or fail only because CLI has not wired the module yet.

---

### Task 3: Wire Runtime Step into CLI

**Files:**
- Modify: `scripts/i18n-workflow-cli.cjs`
- Modify: `references/cli-usage.md`

- [ ] **Step 1: Write CLI test for runtime step**

Add a test that runs:

```bash
node scripts/i18n-workflow-cli.cjs run --config <fixture-config> --steps runtime --dry-run
```

Expected JSON:

```json
{
  "ok": true,
  "command": "run",
  "data": {
    "steps": ["runtime"]
  }
}
```

And a report file:

```txt
<reportDirectory>/i18n-runtime-audit.json
```

- [ ] **Step 2: Confirm test fails**

Run:

```bash
node --test tests/i18n-workflow-cli.test.cjs
```

Expected: FAIL because `runtime` is not an accepted run step.

- [ ] **Step 3: Import and register runtime step**

In `scripts/i18n-workflow-cli.cjs`:

```js
const { runRuntimeAudit } = require(path.join(moduleDir, 'runtime.cjs'));
```

Add `runtime` to available/default steps only if it remains safe for existing users. Safer default: include it in docs but do not add it to `DEFAULT_STEPS` until compatibility is confirmed.

- [ ] **Step 4: Write runtime report**

When the `runtime` step runs, write `i18n-runtime-audit.json` via `common.writeReport`.

- [ ] **Step 5: Update `doctor` and `probe`**

`doctor` should report presence of `runtime.cjs` and whether runtime/i18nRuntime fields are configured. `probe` should report resolved locale languages and provider metadata without importing project runtime code.

- [ ] **Step 6: Run CLI tests**

Run:

```bash
node --test tests/i18n-workflow-cli.test.cjs
```

Expected: PASS.

---

### Task 4: Update Skill Routing and Human Workflow

**Files:**
- Modify: `SKILL.md`
- Modify: `README.md`

- [ ] **Step 1: Add B-scheme triggers**

Update `SKILL.md` “When to Use” with triggers:

- standard i18n runtime setup
- H5 browser language detection
- no first-frame source-language flash
- provider binding for `i18next`, `typesafe-i18n`, or compatible runtime
- runtime fallback behavior

- [ ] **Step 2: Update command routing**

Add:

| User intent | CLI command |
|---|---|
| “检查 H5 语言初始化/首屏防闪” | `run --steps runtime --dry-run` |
| “检查标准 i18n runtime 接入” | `doctor`, `probe`, then `run --steps runtime,extract,audit --dry-run` |

- [ ] **Step 3: Preserve current image workflow warnings**

Do not remove existing localized text-image rules. B-scheme text runtime and image asset localization must remain separate layers.

- [ ] **Step 4: Update README scope**

Add a section “Standard Runtime Workflow” summarizing:

1. Probe project/runtime/provider.
2. Resolve browser language before first scene.
3. Initialize locale provider.
4. Audit hardcoded text and key coverage.
5. Audit runtime fallback behavior.
6. Optionally audit/generate embedded text images.
7. Verify in H5 runtime.

---

### Task 5: Verification

**Files:**
- All modified files above

- [ ] **Step 1: Run self-test**

Run:

```bash
node scripts/i18n-workflow-cli.cjs self-test
```

Expected: JSON output with `ok: true`.

- [ ] **Step 2: Run unit tests**

Run:

```bash
node --test tests/i18n-workflow-cli.test.cjs
```

Expected: all tests pass.

- [ ] **Step 3: Run help**

Run:

```bash
node scripts/i18n-workflow-cli.cjs --help
```

Expected: help includes supported command shape and does not print JSON for help.

- [ ] **Step 4: Run doctor/probe against example config**

Run:

```bash
node scripts/i18n-workflow-cli.cjs doctor --config templates/config.example.cjs
node scripts/i18n-workflow-cli.cjs probe --config templates/config.example.cjs
```

Expected: valid JSON, no secrets, warnings are acceptable for missing project assets in template context.

- [ ] **Step 5: Run runtime dry-run against a fixture config**

Run:

```bash
node scripts/i18n-workflow-cli.cjs run --config <fixture-config> --steps runtime --dry-run
```

Expected: valid JSON and `i18n-runtime-audit.json` report.

---

## Notes for Implementation

- Keep stdout machine-readable JSON for operational commands.
- Do not import app runtime TypeScript from the config; inspect files or declared paths instead.
- Do not infer shipped languages from Git history or planned work.
- Prefer English fallback before baseline only when `en` is actually shipped.
- For H5, language resolution must happen before first real UI scene to avoid source-language flash.
- Do not commit automatically unless the human explicitly requests a git commit.
