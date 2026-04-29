#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadConfig, writeReport, walk, rel } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const baseline = config.baselineLanguage || 'zh';

function resolveRoot(root) {
  return path.isAbsolute(root) ? root : path.join(config.projectRoot, root);
}

function configuredRoots(values, fallback) {
  const roots = Array.isArray(values) && values.length ? values : fallback;
  return roots.map(resolveRoot);
}

function isUserFacing(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/^[\d\s:.,+\-xX%/]+$/.test(value)) return false;
  return /[\p{L}一-鿿]/u.test(value);
}

function keyFromText(file, text, index) {
  const base = path.basename(file, path.extname(file))
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'text';
  return `${base}.text_${index}`;
}

function extractFromCocosPrefab(filePath) {
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(items)) return [];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.__type__ !== 'cc.Label') continue;
    const text = item._string;
    if (!isUserFacing(text)) continue;
    const file = rel(filePath, config);
    out.push({
      file,
      componentId: i,
      text,
      key: keyFromText(file, text, i),
      type: 'cc.Label',
    });
  }
  return out;
}

const prefabRoots = configuredRoots(config.prefabRoots, [path.join(config.resourcesRoot, 'perfabs'), path.join(config.resourcesRoot, 'prefabs')]);
const prefabFiles = prefabRoots.flatMap(root => walk(root, file => file.endsWith('.prefab')));
const items = [];
for (const file of prefabFiles) {
  try {
    items.push(...extractFromCocosPrefab(file));
  } catch (error) {
    items.push({ file: rel(file, config), error: error.message });
  }
}

const locale = {};
for (const item of items) {
  if (item.key && item.text) locale[item.key] = item.text;
}

const report = {
  generatedAt: new Date().toISOString(),
  baselineLanguage: baseline,
  summary: {
    prefabFiles: prefabFiles.length,
    extractedTexts: Object.keys(locale).length,
  },
  items,
  localeSeed: {
    [baseline]: locale,
  },
};

writeReport(config, 'i18n-hardcoded-text-audit.json', report);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report written to ${path.join(config.reportDirectory, 'i18n-hardcoded-text-audit.json')}`);
