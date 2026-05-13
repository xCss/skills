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
- [ ] Non-zh language risk checklist is complete for every target language: all non-zh languages use the expansion/glyph/runtime checklist; RTL languages additionally use the RTL checklist.
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

- [ ] Arabic (`ar`) or other RTL text renders right-to-left in labels, buttons, popups, toasts, and generated text images.
- [ ] Letter shaping and ligatures are correct.
- [ ] Text alignment is mirrored where appropriate.
- [ ] UI layout direction is handled by the runtime (if applicable).
- [ ] Numbers and Latin fragments remain LTR within RTL flow.
- [ ] Icon order, back/next arrows, progress indicators, and horizontal lists are mirrored only when the product UX requires mirroring.
- [ ] Runtime verification covers Arabic in actual H5/browser output, not only static prefab/scene files.

## Non-zh Language Expansion/Glyph Checklist

- [ ] Every non-zh language is tested against realistic long strings, not only short placeholder translations.
- [ ] Text overflow/clipping is checked for every non-zh language in labels, buttons, popups, settings rows, reward panels, and generated text images.
- [ ] Dynamic strings with placeholders (`{count}`, `{level}`, `{time}`) are tested with large values and natural translated word order.
- [ ] Font coverage includes all target-language glyphs, diacritics, accents, punctuation, and currency/number symbols; missing glyph boxes are treated as blocking defects.
- [ ] Auto-fit, wrapping, truncation, or alternate copy is explicitly chosen for each constrained UI area; silent clipping is not accepted.
- [ ] Language-specific casing, punctuation, spacing, plural/quantity forms, and word order are verified when the target language needs them.

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
- [ ] Every non-zh screen is checked with realistic strings and dynamic values in the actual runtime.
