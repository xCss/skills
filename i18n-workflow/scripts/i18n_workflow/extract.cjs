#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { writeReport, walk, rel } = require('./common.cjs');

const SEMANTIC_TEXT_KEYS = new Map([
  ['使用中', 'using'],
  ['解锁皮肤', 'unlock_skin'],
  ['使用', 'use'],
  ['开始游戏', 'start_game'],
  ['第1关', 'level_1'],
  ['任务目标', 'mission_goal'],
  ['辅助工具', 'tools'],
  ['重玩一次', 'replay'],
  ['取消', 'cancel'],
  ['确定', 'confirm'],
  ['提 示', 'tips'],
  ['提示', 'tips'],
  ['是否确认关闭界面?', 'confirm_close'],
  ['是否确认关闭界面？', 'confirm_close'],
  ['放弃挑战', 'give_up'],
  ['设 置', 'settings'],
  ['设置', 'settings'],
  ['背景音乐', 'background_music'],
  ['游戏音效', 'sound_effects'],
  ['皮 肤', 'skin'],
  ['皮肤', 'skin'],
  ['砖块', 'blocks'],
  ['体力', 'stamina'],
  ['奖励', 'reward'],
  ['继续', 'continue'],
  ['返回', 'back'],
  ['关闭', 'close'],
]);

function resolveRoot(root, config) {
  return path.isAbsolute(root) ? root : path.join(config.projectRoot, root);
}

function configuredRoots(values, fallback, config) {
  const roots = Array.isArray(values) && values.length ? values : fallback;
  return roots.map(root => resolveRoot(root, config));
}

function isUserFacing(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/^[a-z0-9_]+(?:\.[a-z0-9_-]+)+$/i.test(value)) return false;
  if (/^[ds:.,+-xX%/]+$/.test(value)) return false;
  return /[p{L}一-鿿]/u.test(value);
}

function semanticKeyForText(text) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  return SEMANTIC_TEXT_KEYS.get(normalized) || SEMANTIC_TEXT_KEYS.get(normalized.replace(/\s+/g, '')) || null;
}

function keyFromText(file, text, index) {
  const base = path.basename(file, path.extname(file))
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'text';
  const semantic = semanticKeyForText(text);
  return `${base}.${semantic || `text_${index}`}`;
}

function runtimeTextKeyMap(config) {
  if (typeof config.getRuntimeTextKeyMap !== 'function') return {};
  const map = config.getRuntimeTextKeyMap();
  return map && typeof map === 'object' ? map : {};
}

function callSourceTextToKey(config, item) {
  if (typeof config.sourceTextToKey === 'function') {
    const key = config.sourceTextToKey(item.text, item);
    if (key) return key;
  }
  return null;
}

function canonicalKeyForItem(config, item, fallbackKey) {
  if (typeof config.getCanonicalTextKey === 'function') {
    const key = config.getCanonicalTextKey(item);
    if (key) return key;
  }
  const sourceTextKey = callSourceTextToKey(config, item);
  if (sourceTextKey) return sourceTextKey;
  const map = runtimeTextKeyMap(config);
  return map[item.text] || fallbackKey;
}

function keySourceForItem(config, item) {
  if (typeof config.getCanonicalTextKey === 'function' && config.getCanonicalTextKey(item)) return 'config.getCanonicalTextKey';
  if (callSourceTextToKey(config, item)) return 'config.sourceTextToKey';
  const map = runtimeTextKeyMap(config);
  if (map[item.text]) return 'config.getRuntimeTextKeyMap';
  if (semanticKeyForText(item.text)) return 'semantic';
  return 'synthetic';
}

function extractFromCocosPrefab(filePath, config) {
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(items)) return [];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.__type__ !== 'cc.Label') continue;
    const text = item._string;
    if (!isUserFacing(text)) continue;
    const file = rel(filePath, config);
    const fallbackKey = keyFromText(file, text, i);
    const textItem = {
      file,
      componentId: i,
      text,
      fallbackKey,
      type: 'cc.Label',
    };
    out.push({
      ...textItem,
      key: canonicalKeyForItem(config, textItem, fallbackKey),
      keySource: keySourceForItem(config, textItem),
    });
  }
  return out;
}

function runExtract(config) {
  const baseline = config.baselineLanguage || 'zh';
  const prefabRoots = configuredRoots(config.prefabRoots, [path.join(config.resourcesRoot, 'perfabs'), path.join(config.resourcesRoot, 'prefabs')], config);
  const prefabFiles = prefabRoots.flatMap(root => walk(root, file => file.endsWith('.prefab')));
  const items = [];
  for (const file of prefabFiles) {
    try {
      items.push(...extractFromCocosPrefab(file, config));
    } catch (error) {
      items.push({ file: rel(file, config), error: error.message });
    }
  }

  const locale = {};
  for (const item of items) {
    if (item.key && item.text) locale[item.key] = item.text;
  }
  const sourceMap = runtimeTextKeyMap(config);
  const coverage = { mapped: [], missing: [] };
  for (const item of items) {
    if (!item.text || item.error) continue;
    const runtimeKey = sourceMap[item.text] || null;
    const coverageItem = {
      file: item.file,
      componentId: item.componentId,
      text: item.text,
      key: item.key,
      fallbackKey: item.fallbackKey || null,
      runtimeKey,
    };
    if (runtimeKey || item.key !== item.fallbackKey) coverage.mapped.push(coverageItem);
    else coverage.missing.push(coverageItem);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baselineLanguage: baseline,
    summary: {
      prefabFiles: prefabFiles.length,
      extractedTexts: Object.keys(locale).length,
      runtimeKeyMappedTexts: coverage.mapped.length,
      runtimeKeyMissingTexts: coverage.missing.length,
    },
    items,
    runtimeKeyCoverage: coverage,
    localeSeed: {
      [baseline]: locale,
    },
  };

  const outputPath = writeReport(config, 'i18n-hardcoded-text-audit.json', report);
  return { summary: report.summary, outputPath };
}

module.exports = { runExtract };
