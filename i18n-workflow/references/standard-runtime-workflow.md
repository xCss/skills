# Standard i18n Runtime Workflow

This reference covers the generic B-scheme workflow for H5 games that use `i18next`, `typesafe-i18n`, or a compatible project-owned runtime.

## Runtime Contract

Projects declare runtime behavior in `tools/i18n-workflow.config.cjs` instead of making the workflow import game code. The required public surface is:

- `initI18n()` or an equivalent init function.
- `t(key, params?)` or an equivalent translate function.
- `setLanguage(language)`.
- `getLanguage()`.

The workflow audits the declared paths and function names; the game still owns the actual runtime implementation.

## H5 Language Decision Order

Use this order before entering the first real UI scene:

1. User preference from storage, such as `localStorage[preferenceKey]`.
2. `navigator.languages`.
3. `navigator.language`.
4. `browserLanguageFallback` when that language is shipped.
5. `fallbackChain`, then `baselineLanguage`.

Normalize browser codes before lookup: `zh-CN`/`zh-Hans-CN` -> `zh`, `en-US` -> `en`, `ja-JP` -> `ja`.

## No First-Frame Source-Language Flash

H5 games must initialize i18n before the first user-facing scene or label render. A loading scene is acceptable; rendering Chinese first and switching to English after async locale loading is not acceptable for this workflow.

## Fallback Layers

- **Detection fallback:** decides the active language when browser detection misses.
- **Locale key fallback:** resolves missing text keys through the fallback chain.
- **Asset fallback:** resolves missing localized text-image sprites.

Keep these layers separate in reports so missing text keys are not hidden by image fallback, and image gaps are not summarized as text coverage.

## CLI Usage

```bash
node scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps runtime --dry-run
```

The runtime step writes `i18n-runtime-audit.json` and can be combined with text audits:

```bash
node scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps runtime,extract,audit --dry-run
```
