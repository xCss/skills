#!/usr/bin/env node

const { loadConfig, parseLanguagesArg, readReport, writeReport } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const languages = parseLanguagesArg(process.argv.slice(2), config);
const onlyFailed = process.argv.includes('--only=failed');

const quality = readReport(config, 'i18n-quality-audit.json');
const compare = readReport(config, 'i18n-compare-quality-audit.json');

const jobs = [];

function addJobs(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!languages.includes(item.language)) continue;
    if (onlyFailed && item.pass) continue;
    for (const reason of (item.problems || [])) {
      jobs.push({
        spriteFrameUuid: item.spriteFrameUuid || null,
        language: item.language,
        sourceImagePath: item.sourceImagePath || null,
        targetImagePath: item.targetImagePath || null,
        expectedWidth: item.expectedWidth || null,
        expectedHeight: item.expectedHeight || null,
        reason,
        severity: 'error',
        suggestedAction: suggestAction(reason),
      });
    }
  }
}

function suggestAction(reason) {
  switch (reason) {
    case 'missing_target': return 'generate target image';
    case 'size_mismatch': return 'regenerate at correct dimensions';
    case 'unreadable_image': return 'regenerate with valid image format';
    case 'text_overflow': return 'use condensed text or smaller font';
    case 'low_contrast': return 'increase text contrast';
    case 'compare_outlier': return 'review visual differences and regenerate';
    case 'missing_sprite_map': return 'add sprite-frame mapping for this language';
    case 'missing_meta': return 'create .meta sidecar for the target image';
    case 'fallback_missing': return 'ensure fallback chain has coverage';
    default: return 'investigate and fix';
  }
}

if (quality && quality.items) addJobs(quality.items);
if (compare && compare.items) addJobs(compare.items);

const outPath = writeReport(config, 'i18n-regenerate-quality-jobs.json', jobs);
console.log(`${jobs.length} regeneration jobs extracted.`);
console.log(`Written to ${outPath}`);
