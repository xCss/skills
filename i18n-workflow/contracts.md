# i18n Workflow Contracts

Defines the interfaces that a project adapter/config must satisfy, and the schemas for data exchanged between workflow stages.

## Adapter/Config Required Fields

```js
module.exports = {
  // --- Language ---
  supportedLanguages: [],       // e.g. ["zh", "en", "ar", "vi"]
  baselineLanguage: '',         // e.g. "zh"
  fallbackChain: [],            // e.g. ["zh", "en"]

  // --- Runtime ---
  // Description of how runtime language is detected.
  // Implementations may export a function or just document the strategy.
  runtimeLanguageDetector: 'browser-navigator',

  // --- Locale ---
  // Returns an object { [lang]: { [key]: string } }
  getLocales: () => ({}),

  // --- Text-Image Source ---
  // Returns an array of { imagePath, width, height, spriteFrameUuid, resourcesPath }
  enumerateSourceTextImages: () => [],

  // --- Localized Image Target ---
  // Given a source resources path and a language, returns the target resources path.
  resolveTargetPath: (sourceResourcesPath, language) => '',

  // --- Sprite-Frame Mapping ---
  // Returns { [spriteFrameUuid]: { [lang]: targetResourcesPath } }
  getSpriteFrameMap: () => ({}),

  // --- Reports ---
  reportDirectory: '',          // e.g. "tools/reports"
};
```

All paths are project-relative using POSIX separators.

## Failure Reason Enum

Shared across quality audit, comparison audit, and regeneration jobs.

| Code | Meaning |
|---|---|
| `missing_target` | Target image file does not exist. |
| `size_mismatch` | Target image dimensions differ from source. |
| `unreadable_image` | Target file is not a valid image. |
| `text_overflow` | Translated text exceeds the source bounding box. |
| `low_contrast` | Text contrast is below the readability threshold. |
| `compare_outlier` | Visual comparison score exceeds the acceptable delta. |
| `missing_sprite_map` | Sprite-frame UUID has no mapping for the language. |
| `missing_meta` | Target image exists but has no `.meta` sidecar. |
| `fallback_missing` | The key/resource is missing in all fallback-chain languages. |

## Manifest Schema

```jsonc
{
  "generatedAt": "ISO-8601",
  "summary": { /* counts */ },
  "candidates": [
    {
      "spriteFrameUuid": "uuid",
      "sourceImagePath": "relative/path.png",
      "sourceResourcesPath": "resources-relative/path",
      "width": 200,
      "height": 80,
      "sourceBytes": 12345,
      "detectionStatus": "text | non_text | uncertain",
      "embeddedText": "string | null",
      "targets": {
        "<lang>": {
          "resourcesPath": "i18n_text_sprites/<lang>/...",
          "exists": true,
          "generationNeeded": false,
          "proposedText": "string | null",
          "status": "pending_review | generated | skipped_non_text | ..."
        }
      }
    }
  ]
}
```

## Asset Audit Report Schema

```jsonc
{
  "generatedAt": "ISO-8601",
  "summary": { /* counts */ },
  "missingLocalizedImages": [
    {
      "spriteFrameUuid": "uuid",
      "language": "en",
      "sourceImagePath": "path",
      "expectedResourcePath": "path",
      "sourceWidth": 200,
      "sourceHeight": 80
    }
  ],
  "textImageCandidatesWithoutI18nMap": [ /* ... */ ],
  "localeCoverage": {
    "<lang>": { "total": 100, "present": 98, "missing": ["key1"] }
  }
}
```

## Quality Audit Report Schema

```jsonc
{
  "generatedAt": "ISO-8601",
  "items": [
    {
      "spriteFrameUuid": "uuid",
      "language": "en",
      "sourceImagePath": "path",
      "targetImagePath": "path",
      "expectedWidth": 200,
      "expectedHeight": 80,
      "actualWidth": 200,
      "actualHeight": 80,
      "fileSize": 12345,
      "problems": ["size_mismatch"],
      "pass": false
    }
  ]
}
```

## Compare Audit Report Schema

```jsonc
{
  "generatedAt": "ISO-8601",
  "items": [
    {
      "spriteFrameUuid": "uuid",
      "language": "en",
      "sourceImagePath": "path",
      "targetImagePath": "path",
      "compareScore": 0.12,
      "problems": [],
      "pass": true
    }
  ]
}
```

## Regeneration Jobs Schema

```jsonc
[
  {
    "spriteFrameUuid": "uuid",
    "language": "en",
    "sourceImagePath": "path",
    "targetImagePath": "path",
    "expectedWidth": 200,
    "expectedHeight": 80,
    "reason": "size_mismatch",
    "severity": "error",
    "suggestedAction": "regenerate at correct dimensions"
  }
]
```

## Review Sheet Convention

Review sheets are generated into `<reportDirectory>/i18n-review-sheets/`. Each sheet shows source and target images side-by-side with metadata: language, dimensions, compare score, failure reasons, and whether regeneration is needed.
