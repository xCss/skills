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

  // --- Runtime Text-Key Mapping (optional) ---
  // Maps extracted source UI text to the canonical runtime key.
  // Used to keep Cocos prefab extraction aligned with runtime I18nSourceTextToKey-style maps.
  sourceTextToKey: (text, context) => null,

  // Returns { [sourceText]: canonicalKey } for coverage reporting.
  getRuntimeTextKeyMap: () => ({}),

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
| `provider_failure` | Image generation provider failed or returned no usable output. |
| `malformed_generation` | Generated file is corrupt, empty, or not an image. |
| `canvas_drift` | Raw generation differs from the source canvas beyond configured tolerance. |
| `alpha_artifact` | Transparency was lost, clipped, or filled unexpectedly. |
| `white_fringe` | White/gray edge halo or square background remains after generation. |
| `source_text_residue` | Source-language ghost text or residue remains visible. |
| `style_drift` | Text, stroke, shadow, background, or decoration no longer matches source style. |
| `runtime_state_gap` | A localized asset/text path works in one UI state but not another runtime state. |
| `missing_sprite_map` | Sprite-frame UUID has no mapping for the language. |
| `missing_meta` | Target image exists but has no `.meta` sidecar. |
| `fallback_missing` | The key/resource is missing in all fallback-chain languages. |

## Hardcoded Text Audit Report Schema

```jsonc
{
  "generatedAt": "ISO-8601",
  "baselineLanguage": "zh",
  "summary": {
    "prefabFiles": 9,
    "extractedTexts": 14,
    "runtimeKeyMappedTexts": 14,
    "runtimeKeyMissingTexts": 0
  },
  "items": [
    {
      "file": "assets/Bundles/UI/HomePage.prefab",
      "componentId": 6,
      "text": "开始游戏",
      "key": "ui.start_game",
      "fallbackKey": "homepage.start_game",
      "keySource": "config.sourceTextToKey | config.getCanonicalTextKey | config.getRuntimeTextKeyMap | semantic | synthetic",
      "type": "cc.Label"
    }
  ],
  "runtimeKeyCoverage": {
    "mapped": [/* items with runtime/canonical keys */],
    "missing": [/* source texts requiring runtime key mapping */]
  },
  "localeSeed": { "zh": { "ui.start_game": "开始游戏" } }
}
```

Treat `runtimeKeyCoverage.missing` as a required review item when the project uses runtime source-text-to-key localization.

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
      "alphaPreserved": true,
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
      "visualFindings": ["no_source_text_residue", "no_white_fringe"],
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
    "attempt": 2,
    "reason": "size_mismatch",
    "severity": "error",
    "suggestedAction": "regenerate at correct dimensions"
  }
]
```

## Review Sheet Convention

Review sheets are generated into `<reportDirectory>/i18n-review-sheets/`. Each sheet shows source and target images side-by-side with metadata: language, dimensions, compare score, failure reasons, and whether regeneration is needed.
