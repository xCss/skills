const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_NAMES = [
  'i18n-workflow.config.cjs',
  'tools/i18n-workflow.config.cjs',
];

function findConfigFromCwd() {
  for (const name of DEFAULT_CONFIG_NAMES) {
    const candidate = path.resolve(process.cwd(), name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadConfig(argv) {
  let configPath = null;
  for (const arg of (argv || [])) {
    if (arg.startsWith('--config=')) {
      configPath = arg.slice('--config='.length);
      break;
    }
  }
  if (configPath) {
    configPath = path.resolve(configPath);
  } else {
    configPath = findConfigFromCwd();
  }
  if (!configPath || !fs.existsSync(configPath)) {
    throw new Error(
      `i18n workflow config not found. Pass --config=<path> or place ${DEFAULT_CONFIG_NAMES[0]} in the project root.`
    );
  }
  return require(configPath);
}

function parseLanguagesArg(argv, config) {
  for (const arg of (argv || [])) {
    if (arg.startsWith('--languages=')) {
      return arg.slice('--languages='.length).split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return config.supportedLanguages;
}

function targetLanguages(config) {
  return config.supportedLanguages.filter(l => l !== config.baselineLanguage);
}

const LANGUAGE_NORMALIZE_MAP = {
  'zh-cn': 'zh', 'zh-tw': 'zh', 'zh-hans': 'zh', 'zh-hant': 'zh',
  'zh-hans-cn': 'zh', 'zh-hant-tw': 'zh',
  'en-us': 'en', 'en-gb': 'en', 'en-au': 'en',
  'ar-sa': 'ar', 'ar-eg': 'ar',
  'vi-vn': 'vi',
  'ja-jp': 'ja',
  'ko-kr': 'ko',
  'fr-fr': 'fr',
  'de-de': 'de',
  'es-es': 'es', 'es-mx': 'es',
  'pt-br': 'pt', 'pt-pt': 'pt',
};

function normalizeLanguageCode(code) {
  if (!code) return null;
  const lower = code.toLowerCase().trim();
  if (LANGUAGE_NORMALIZE_MAP[lower]) return LANGUAGE_NORMALIZE_MAP[lower];
  const base = lower.split(/[-_]/)[0];
  return base || null;
}

function resolveRuntimeLanguage(browserLanguages, config) {
  const supported = new Set(config.supportedLanguages);
  for (const raw of (browserLanguages || [])) {
    const normalized = normalizeLanguageCode(raw);
    if (normalized && supported.has(normalized)) return normalized;
  }
  for (const fallback of config.fallbackChain) {
    if (supported.has(fallback)) return fallback;
  }
  return config.baselineLanguage;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function rel(filePath, config) {
  return toPosix(path.relative(config.projectRoot, filePath));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeReport(config, filename, data) {
  const filePath = path.join(config.reportDirectory, filename);
  writeJson(filePath, data);
  return filePath;
}

function readReport(config, filename) {
  const filePath = path.join(config.reportDirectory, filename);
  return readJson(filePath);
}

function walk(dir, predicate, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

function resourcePathExists(resourcesRoot, resourcesPath) {
  if (!resourcesPath) return false;
  const abs = path.join(resourcesRoot, ...resourcesPath.split('/'));
  return ['.png', '.jpg', '.jpeg', '.webp'].some(ext => fs.existsSync(abs + ext));
}

const FAILURE_REASONS = [
  'missing_target',
  'size_mismatch',
  'unreadable_image',
  'text_overflow',
  'low_contrast',
  'compare_outlier',
  'missing_sprite_map',
  'missing_meta',
  'fallback_missing',
];

module.exports = {
  loadConfig,
  parseLanguagesArg,
  targetLanguages,
  normalizeLanguageCode,
  resolveRuntimeLanguage,
  toPosix,
  rel,
  readJson,
  writeJson,
  writeReport,
  readReport,
  walk,
  resourcePathExists,
  FAILURE_REASONS,
};
