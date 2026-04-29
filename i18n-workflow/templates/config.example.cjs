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
  // zh 通常是基准/源语言，大概率已有完整资源（甚至可能是唯一语言，尚未做 i18n）。
  // 按需增删语言。
  supportedLanguages: ['zh', 'en', 'ar', 'vi'],
  baselineLanguage: 'zh',
  // 资源缺失时的回退顺序：先尝试 zh（主兜底），再 en（次兜底）。
  fallbackChain: ['zh', 'en'],

  // --- Runtime ---
  // 描述运行时如何检测用户语言。仅用于文档/审计参考，不影响工具执行。
  runtimeLanguageDetector: 'browser-navigator',

  // --- Paths (project-relative, POSIX separators) ---
  projectRoot,
  assetsRoot: path.join(projectRoot, 'assets'),
  resourcesRoot: path.join(projectRoot, 'assets', 'resources'),
  reportDirectory: path.join(projectRoot, 'tools', 'reports'),

  // --- Locale ---
  // Return { [lang]: { [key]: translatedString } }
  // 数据来源不限：可以读 JSON 文件、YAML、TS/JS 源码正则解析、数据库、远端 API 等。
  getLocales() {
    // Example: return JSON.parse(fs.readFileSync('src/locales/zh.json', 'utf8'));
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
