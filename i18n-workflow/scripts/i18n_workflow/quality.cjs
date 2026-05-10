const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
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

function compareVisualMetrics(sourcePath, targetPath, config) {
  if (!sourcePath || !targetPath || !fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) return null;
  const script = [
    'from PIL import Image, ImageChops, ImageStat',
    'import json, sys',
    'source_path, target_path = sys.argv[1], sys.argv[2]',
    'src = Image.open(source_path).convert("RGBA")',
    'target = Image.open(target_path).convert("RGBA")',
    'if src.size != target.size:',
    '    target = target.resize(src.size, Image.Resampling.LANCZOS)',
    'def alpha_coverage(img):',
    '    alpha = img.getchannel("A")',
    '    hist = alpha.histogram()',
    '    total = img.width * img.height',
    '    visible = sum(hist[9:])',
    '    return visible / total if total else 0',
    'diff = ImageChops.difference(src, target)',
    'stat = ImageStat.Stat(diff)',
    'rms = sum(v * v for v in stat.rms[:4]) ** 0.5 / (255 * 2)',
    'payload = {',
    '    "sourceAlphaCoverage": alpha_coverage(src),',
    '    "targetAlphaCoverage": alpha_coverage(target),',
    '    "rmsDifference": rms,',
    '}',
    'print(json.dumps(payload))',
  ].join('\n');
  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', script, sourcePath, targetPath], {
    cwd: config.projectRoot || process.cwd(),
    encoding: 'utf8',
  });
  if (result.status !== 0) return { error: (result.stderr || result.stdout || '').slice(0, 1000) };
  try {
    return JSON.parse(result.stdout || '{}');
  } catch (error) {
    return { error: error.message };
  }
}

function runQuality(config) {
  const manifestPath = path.join(config.reportDirectory, 'i18n-image-manifest.json');
  const manifest = readJson(manifestPath);
  const items = [];
  if (manifest && Array.isArray(manifest.candidates)) {
    for (const candidate of manifest.candidates) {
      if (candidate.detectionStatus === 'non_text') continue;
      for (const [language, target] of Object.entries(candidate.targets || {})) {
        if (target.status === 'skipped_non_text' || target.generationNeeded === false && !target.proposedText) continue;
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
  const manifest = readJson(path.join(config.reportDirectory, 'i18n-image-manifest.json')) || { candidates: [] };
  const sourceByUuid = new Map((manifest.candidates || []).map(candidate => [candidate.spriteFrameUuid, candidate.sourceImagePath]));
  const report = {
    generatedAt: new Date().toISOString(),
    items: (quality.items || []).map(item => {
      if (!item.pass) return { ...item, compareScore: 0, problems: ['compare_outlier'] };
      const sourceImagePath = sourceByUuid.get(item.spriteFrameUuid) || item.sourceImagePath;
      const sourcePath = sourceImagePath ? path.resolve(config.projectRoot, sourceImagePath) : null;
      const metrics = compareVisualMetrics(sourcePath, item.targetImagePath, config);
      const problems = [];
      if (!metrics || metrics.error) problems.push('compare_unavailable');
      else if (metrics.sourceAlphaCoverage > 0.05 && metrics.targetAlphaCoverage < 0.01) problems.push('visual_blank_target');
      const compareScore = metrics && !metrics.error ? Math.max(0, Math.min(1, 1 - Math.abs(metrics.sourceAlphaCoverage - metrics.targetAlphaCoverage))) : 0;
      return { ...item, compareScore, visualMetrics: metrics, problems };
    }),
  };
  const outputPath = writeReport(config, 'i18n-compare-quality-audit.json', report);
  return { summary: { items: report.items.length, failed: report.items.filter(item => item.problems.length).length }, outputPath };
}

module.exports = { runQuality, runCompare, pngDimensions };
