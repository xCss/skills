#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadConfig, parseLanguagesArg, readReport, writeReport } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const languages = parseLanguagesArg(process.argv.slice(2), config);

const manifest = readReport(config, 'i18n-image-manifest.json');
const quality = readReport(config, 'i18n-quality-audit.json');
const compare = readReport(config, 'i18n-compare-quality-audit.json');

if (!manifest || !manifest.candidates) {
  console.log('No manifest found. Run the audit and generation steps first.');
  process.exit(0);
}

const qualityByKey = new Map();
if (quality && quality.items) {
  for (const item of quality.items) {
    qualityByKey.set(`${item.spriteFrameUuid}:${item.language}`, item);
  }
}
const compareByKey = new Map();
if (compare && compare.items) {
  for (const item of compare.items) {
    compareByKey.set(`${item.spriteFrameUuid}:${item.language}`, item);
  }
}

const sheets = [];

for (const candidate of manifest.candidates) {
  for (const lang of languages) {
    const target = candidate.targets && candidate.targets[lang];
    if (!target) continue;

    const qKey = `${candidate.spriteFrameUuid}:${lang}`;
    const qItem = qualityByKey.get(qKey);
    const cItem = compareByKey.get(qKey);

    sheets.push({
      language: lang,
      sourceImagePath: candidate.sourceImagePath,
      targetImagePath: target.generatedPath || target.resourcesPath || null,
      sourceWidth: candidate.width,
      sourceHeight: candidate.height,
      targetExists: target.exists || false,
      status: target.status,
      compareScore: cItem ? cItem.compareScore : null,
      problems: [
        ...(qItem ? qItem.problems || [] : []),
        ...(cItem ? cItem.problems || [] : []),
      ],
      needsRegeneration: target.generationNeeded || false,
    });
  }
}

const outDir = path.join(config.reportDirectory, 'i18n-review-sheets');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'review-summary.json');
fs.writeFileSync(outPath, `${JSON.stringify(sheets, null, 2)}\n`);

console.log(`${sheets.length} review entries generated.`);
console.log(`Written to ${outPath}`);
