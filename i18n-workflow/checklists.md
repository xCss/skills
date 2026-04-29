# i18n Workflow Checklists

Reusable human-review checklists. Not project-specific.

## New Language Launch Checklist

- [ ] Language code added to `supportedLanguages`.
- [ ] All locale text keys have entries for the new language.
- [ ] Locale audit passes with zero missing keys.
- [ ] Text-image manifest updated; all candidates classified.
- [ ] Generated images pass quality audit (dimensions, file size).
- [ ] Source/target comparison shows no outliers.
- [ ] Regeneration jobs list is empty or all retries complete.
- [ ] Runtime language detection picks the new language when the environment matches.
- [ ] Fallback chain works: removing the new language's resources falls back correctly.
- [ ] Language toggle/switch UI includes the new language.
- [ ] No missing sprite-frame or resource errors in console.

## Text Quality Checklist

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

## Source/Target Comparison Checklist

- [ ] Each target language image matches the source canvas size exactly.
- [ ] Visual text scale is comparable to the source.
- [ ] No extra decorative elements were added.
- [ ] No source-language text is visible in the target image.
- [ ] Background and non-text areas are unchanged.

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
