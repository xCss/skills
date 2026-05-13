// i18n Workflow Adapter/Config Template
//
// 本文件是 .cjs，Node.js 无条件按 CommonJS 执行，不受项目 type/tsconfig 影响。
// 项目源码可以是任何语言（JS/TS/Python/Go/...），本 config 不 import 业务代码，
// 只通过 fs.readFileSync + 解析 或读取 JSON/YAML 等方式获取 i18n 数据。
//
// Copy this file into your project and fill in the project-specific values.
// Tools accept --config=<path> to load this file.

const path = require('path');

const projectRoot = path.resolve(__dirname, '..'); // adjust to your project root

module.exports = {
  // --- Language ---
  // 只声明当前工作区实际存在并会随包发布的语言。
  // 新项目通常只有源语言；不要因为 Git 历史、已删除文件、旧分支或需求设想而预填 en/ar/vi。
  // 新增语言时，再把目标语言加入这里并补齐 runtime、locale、图片资源。
  supportedLanguages: ['zh'],
  baselineLanguage: 'zh',
  // 资源缺失时的回退顺序。只有 zh 时保持 zh-only。
  fallbackChain: ['zh'],

  // --- Runtime ---
  // 描述运行时如何检测用户语言。仅用于文档/审计参考，不影响工具执行。
  runtimeLanguageDetector: 'browser-navigator',
  // 浏览器语言自动检测没有命中 supportedLanguages 时，默认回退到英文。
  // 如果当前工作区尚未发布 en，本值会被工具忽略并继续使用 fallbackChain/baseline。
  browserLanguageFallback: 'en',

  // --- Standard i18n Runtime (H5 / B 方案) ---
  // 这部分用于检查标准 i18n runtime 是否能在首个真实 UI 场景前完成语言初始化。
  // provider 可以是 i18next、typesafe-i18n，或暴露同等接口的项目自研 runtime。
  runtime: {
    platform: 'h5',
    detector: 'browser-navigator',
    preferenceStorage: 'localStorage',
    preferenceKey: 'game.language',
    initBeforeFirstScene: true,
  },

  i18nRuntime: {
    provider: 'custom-compatible',
    initFile: 'assets/scripts/i18n/initI18n.ts',
    initFunction: 'initI18n',
    translateFunction: 't',
    setLanguageFunction: 'setLanguage',
    getLanguageFunction: 'getLanguage',
  },

  locales: {
    directory: 'assets/i18n',
    format: 'json',
    namespaceMode: 'optional',
  },

  // --- Paths (project-relative, POSIX separators) ---
  projectRoot,
  assetsRoot: path.join(projectRoot, 'assets'),
  resourcesRoot: path.join(projectRoot, 'assets', 'resources'),
  reportDirectory: path.join(projectRoot, 'tools', 'reports'),

  // --- Locale ---
  // Return { [lang]: { [key]: translatedString } }
  // 数据来源不限：可以读 JSON 文件、YAML、TS/JS 源码正则解析、数据库、远端 API 等。
  // 读取当前工作区真实存在的文件；不要从 git show HEAD / git ls-files / 已删除文件推断当前语言。
  getLocales() {
    // Example: return JSON.parse(fs.readFileSync('src/locales/zh.json', 'utf8'));
    return {};
  },

  // Optional: map extracted Cocos Label source text to the runtime canonical key.
  // Use this when prefabs keep source-language text and runtime code translates via keys.
  sourceTextToKey(text, context) {
    // Example: return { '开始游戏': 'ui.start_game' }[text] || null;
    // context: { file, componentId, text, fallbackKey, type }
    return null;
  },

  // Optional: return the same map as an object so extract can report coverage.
  getRuntimeTextKeyMap() {
    return {};
  },

  // --- Text-Image Source ---
  // Return an array of { imagePath, width, height, spriteFrameUuid, resourcesPath }.
  // 如何枚举取决于项目的资源管理方式。
  enumerateSourceTextImages() {
    return [];
  },

  // --- Localized Image Target ---
  // Given a source resources-relative path and a target language code,
  // return the resources-relative path where the localized image should live.
  resolveTargetPath(sourceResourcesPath, language) {
    return `i18n_text_sprites/${language}/${sourceResourcesPath}`;
  },

  // --- Sprite-Frame Mapping ---
  // Return { [spriteFrameUuid]: { [lang]: targetResourcesPath } }
  // 如果项目没有 sprite-frame 概念（非 Cocos/Unity），返回 {} 即可。
  getSpriteFrameMap() {
    return {};
  },
};
