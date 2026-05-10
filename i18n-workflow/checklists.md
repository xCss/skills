# i18n Workflow Checklists

Reusable human-review checklists. Not project-specific.

## New Language Launch Checklist

- [ ] Language code added to `supportedLanguages`.
- [ ] All locale text keys have entries for the new language.
- [ ] Locale audit passes with zero missing keys.
- [ ] Cocos/static UI extraction keys match runtime canonical keys; `runtimeKeyCoverage.missing` is empty or explicitly waived.
- [ ] Text-image manifest updated; all candidates classified.
- [ ] Every `textImageCandidatesWithoutI18nMap` item is reported to a human as text/non-text/uncertain before claiming image coverage.
- [ ] Generated images pass quality audit (dimensions, file size).
- [ ] Generated images have completed post-processing for canvas normalization, alpha cleanup, and fringe/residue cleanup.
- [ ] Source/target comparison shows no outliers.
- [ ] Regeneration jobs list is empty or all retries complete.
- [ ] Visual contact sheets or side-by-side review images were inspected for every target language.
- [ ] Runtime language detection picks the new language when the environment matches.
- [ ] Fallback chain works: removing the new language's resources falls back correctly.
- [ ] Language toggle/switch UI includes the new language.
- [ ] No missing sprite-frame or resource errors in console.
- [ ] Default and alternate UI states are checked: popups, settings, hidden labels, off/on toggles, disabled states, and dynamic runtime labels.

## Text Quality Checklist

- [ ] Translations are as short and accurate as possible without losing the intended meaning, while still sounding natural in the target language.
- [ ] Translations are grammatically correct and contextually appropriate.
- [ ] UI copy fits the target canvas without overflow.
- [ ] Placeholder tokens (`{level}`, `{count}`, etc.) are preserved.
- [ ] Rich-text tags (`<color>`, etc.) are preserved and balanced.
- [ ] No untranslated source-language text remains.

## Text-Image Readability Checklist

- [ ] Text is legible at the generated resolution.
- [ ] Font weight and stroke match the source image.
- [ ] Text alignment matches the source (centered, left, etc.).
- [ ] Background, transparency, and button/ribbon style are preserved.
- [ ] Text does not clip at canvas edges.
- [ ] Final integrated image uses the source canvas dimensions after any crop/pad/scale normalization.
- [ ] No source-language ghost text or residue remains.
- [ ] No white square background was introduced for transparent sprites.
- [ ] No white/gray fringe or low-saturation halo remains around text, strokes, signs, or icons.
- [ ] Generated text is not visibly too small, off-center, or stylistically inconsistent with the source.

## Model Generation Retry Checklist

- [ ] Provider/model/quality/concurrency constraints match the user request and workflow config.
- [ ] Raw output is valid, non-empty, and traceable to source asset, language, prompt, and attempt number.
- [ ] Wrong dimensions, malformed output, provider errors, white backgrounds, alpha clipping, and style drift are retried or converted into regeneration jobs.
- [ ] Local crop/pad/scale is used only to normalize acceptable output; regenerate when local edits would damage the artwork.
- [ ] Final accepted asset has passed both automated audit and visual review.

## Source/Target Comparison Checklist

- [ ] Each target language image matches the source canvas size exactly.
- [ ] Visual text scale is comparable to the source.
- [ ] No extra decorative elements were added.
- [ ] No source-language text is visible in the target image.
- [ ] Background and non-text areas are unchanged.
- [ ] Transparent edge pixels do not contain visible white/gray artifacts when composited over dark and light backgrounds.

## RTL Language Checklist

- [ ] Arabic (or other RTL) text renders right-to-left.
- [ ] Letter shaping and ligatures are correct.
- [ ] Text alignment is mirrored where appropriate.
- [ ] UI layout direction is handled by the runtime (if applicable).
- [ ] Numbers and Latin fragments remain LTR within RTL flow.

## Fallback Behavior Checklist

- [ ] When the current language key is missing, the primary fallback language is used.
- [ ] When the primary fallback also misses, the secondary fallback is used.
- [ ] When a sprite-frame mapping is missing for the current language, the baseline sprite frame is displayed.
- [ ] No blank or broken UI elements appear due to missing resources.

## Runtime Visual-State Checklist

- [ ] Scene-level labels hidden by icons/sprites do not leak source-language text.
- [ ] Popup open/close variants are localized.
- [ ] Toggle/switch off and on tracks are localized or text-free as intended.
- [ ] Dynamic messages, rank/name fields, unlock prompts, and toast text use runtime i18n keys.
- [ ] Arabic/RTL screens are checked in the actual runtime, not only in static files.
