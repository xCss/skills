const fs = require('fs');
const path = require('path');
const { readJson, writeReport } = require('./common.cjs');

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

function targetAbsolutePath(config, resourcesPath) {
  if (!resourcesPath) return null;
  if (path.isAbsolute(resourcesPath)) return resourcesPath;
  const base = path.join(config.resourcesRoot, ...resourcesPath.split('/'));
  for (const ext of IMAGE_EXTS) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return base + '.png';
}

function pngDimensions(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function runQuality(config) {
  const manifestPath = path.join(config.reportDirectory, 'i18n-image-manifest.json');
  const manifest = readJson(manifestPath);
  const items = [];
  if (manifest && Array.isArray(manifest.candidates)) {
    for (const candidate of manifest.candidates) {
      for (const [language, target] of Object.entries(candidate.targets || {})) {
        const targetPath = target.generatedPath
          ? path.resolve(config.projectRoot, target.generatedPath)
          : targetAbsolutePath(config, target.resourcesPath);
        const problems = [];
        let dimensions = null;
        if (!targetPath || !fs.existsSync(targetPath)) {
          problems.push('missing_target');
        } else {
          dimensions = pngDimensions(targetPath);
          if (!dimensions) problems.push('unreadable_image');
          else if (dimensions.width !== candidate.width || dimensions.height !== candidate.height) problems.push('size_mismatch');
        }
        items.push({
          spriteFrameUuid: candidate.spriteFrameUuid || null,
          language,
          sourceImagePath: candidate.sourceImagePath || null,
          targetImagePath: targetPath || null,
          expectedWidth: candidate.width || null,
          expectedHeight: candidate.height || null,
          actualWidth: dimensions ? dimensions.width : null,
          actualHeight: dimensions ? dimensions.height : null,
          problems,
          pass: problems.length === 0,
        });
      }
    }
  }
  const report = { generatedAt: new Date().toISOString(), items };
  const outputPath = writeReport(config, 'i18n-quality-audit.json', report);
  return { summary: { items: items.length, failed: items.filter(item => !item.pass).length }, outputPath };
}

function runCompare(config) {
  const quality = readJson(path.join(config.reportDirectory, 'i18n-quality-audit.json')) || { items: [] };
  const report = {
    generatedAt: new Date().toISOString(),
    items: (quality.items || []).map(item => ({ ...item, compareScore: item.pass ? 1 : 0, problems: item.pass ? [] : ['compare_outlier'] })),
  };
  const outputPath = writeReport(config, 'i18n-compare-quality-audit.json', report);
  return { summary: { items: report.items.length, failed: report.items.filter(item => item.problems.length).length }, outputPath };
}

module.exports = { runQuality, runCompare, pngDimensions };
