# i18n Workflow Playbook

Generic, project-agnostic workflow for managing multilingual text and localized text-image assets in game projects.

## Install

Copy and paste the following command to your agent (Claude Code, etc.):

```
git clone git@github.com:xCss/skills.git /tmp/_skills_repo && mkdir -p skills && cp -r /tmp/_skills_repo/i18n-workflow skills/i18n-workflow && rm -rf /tmp/_skills_repo && mkdir -p tools && cp skills/i18n-workflow/templates/config.example.cjs tools/i18n-workflow.config.cjs && echo "Done. Edit tools/i18n-workflow.config.cjs to bind your project."
```

After installation, edit `tools/i18n-workflow.config.cjs` to match your project structure, then tell your agent to read `skills/i18n-workflow/README.md` for the full workflow.

## Current Worktree Boundary

Audits describe the current working tree by default. Do not add languages or sprite mappings from Git history, deleted files, old branches, or `git show HEAD:<path>` unless the user explicitly asks for a history/regression audit. If the current project only ships the source language, keep `supportedLanguages` and `fallbackChain` source-language-only until a new language is actually added.

## Scope

This playbook covers:

- Runtime language detection and fallback.
- Locale text key coverage auditing.
- Text-image resource generation at source-spec dimensions.
- Quality auditing of generated images.
- Source/target image comparison review.
- Failed-item extraction and regeneration jobs.
- Adding a new language end-to-end.

It does **not** assume any specific engine, directory layout, or runtime configuration file. Project-specific bindings are declared in an adapter/config (see `contracts.md`).

## Language Model

Every project must declare these via its adapter/config:

| Concept | Description |
|---|---|
| `supportedLanguages` | All languages the project ships (e.g. `["zh","en","ar","vi"]`). |
| `runtimeLanguage` | Resolved at runtime from the user environment (e.g. browser `navigator.languages`). |
| `baselineLanguage` | The language whose assets serve as the visual baseline for image generation and comparison. Configurable; commonly `zh`. |
| `fallbackChain` | Ordered list used when a resource is missing for the current language. Example: `[runtimeLanguage, "zh", "en"]`. |

### Runtime Language Detection

Recommended detection order:

1. User-persisted preference (e.g. localStorage).
2. Environment language (browser: `navigator.languages` / `navigator.language`; native: OS locale).
3. First entry in `fallbackChain` that has full locale coverage.

Language codes from the environment must be normalized to the project's canonical codes before lookup (e.g. `zh-CN` / `zh-Hans-CN` -> `zh`, `en-US` -> `en`, `vi-VN` -> `vi`).

### Resource Fallback

When a text key, sprite-frame mapping, or image resource is missing for the current language:

1. Try the current language.
2. Walk `fallbackChain` in order until a hit is found.
3. If the entire chain misses, use the raw key or default sprite frame.

## Workflow Stages

```
[1] Locale audit
 |
[2] Text-image identification & manifest
 |
[3] Image generation (baseline -> target languages)
 |
[4] Quality audit (dimensions, readability, size)
 |
[5] Source/target comparison audit
 |
[6] Regeneration job extraction
 |
[7] Human review (review sheets, checklists)
 |
[8] Regression verification in runtime
```

### 1. Locale Audit

Compare text keys across all `supportedLanguages`. Report missing keys per language. The baseline language must also be audited for completeness.

### 2. Text-Image Identification & Manifest

Enumerate sprite frames used in scenes/prefabs. Classify which ones contain embedded text. Build a manifest recording: source image path, dimensions, target languages, generation status.

### 3. Image Generation

For each target language needing a localized text image:

- Use the baseline language image as the visual reference.
- Generate a target-language image at the **exact same pixel dimensions**.
- Preserve background, transparency, button/ribbon style.
- Replace embedded text with the translated string.

Model-backed classification and generation use `BASE_URL` and `API_KEY`. Requests run with concurrency 10 by default and can be capped with `--concurrency=<1-10>`.

### 4. Quality Audit

Validate generated images against the manifest:

- Pixel dimensions match source.
- File is a valid image.
- File size is within the configured limit.

### 5. Source/Target Comparison

For each generated image, compare against the baseline:

- Visual scale of text vs. source.
- Text overflow or clipping.
- Background/style drift.

### 6. Regeneration Jobs

Extract failed items from quality and comparison audits. Classify failure reasons using the standard enum (see `contracts.md`). Output a structured job list for retry.

### 7. Human Review

Use review sheets and checklists (`checklists.md`) for manual verification.

### 8. Regression Verification

Run the game in the target environment. Confirm:

- Runtime language detection picks the correct language.
- Fallback chain works when resources are missing.
- No missing sprite-frame or resource errors.
- RTL layout is correct for applicable languages.

## Adding a New Language

1. Add the language code to `supportedLanguages` in the project adapter/config and runtime.
2. Add locale text entries for all keys.
3. Run locale audit to confirm coverage.
4. Run image generation for the new language.
5. Run quality audit and comparison.
6. Extract and retry any failures.
7. Complete human review checklist.
8. Verify in runtime.
