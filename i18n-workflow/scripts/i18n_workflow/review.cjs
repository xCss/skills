const fs = require('fs');
const path = require('path');
const { parseLanguagesArg, readReport } = require('./common.cjs');

function runReview(config, argv) {
  const languages = parseLanguagesArg(argv || [], config);
  const manifest = readReport(config, 'i18n-image-manifest.json');
  const quality = readReport(config, 'i18n-quality-audit.json');
  const compare = readReport(config, 'i18n-compare-quality-audit.json');
  if (!manifest || !manifest.candidates) {
    return { summary: { entries: 0 }, warning: 'No manifest found. Run the audit and generation steps first.' };
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
  const outputPath = path.join(outDir, 'review-summary.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(sheets, null, 2)}\n`);
  return { summary: { entries: sheets.length }, outputPath };
}

module.exports = { runReview };
