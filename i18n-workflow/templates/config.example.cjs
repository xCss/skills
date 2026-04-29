// i18n Workflow Adapter/Config Template
// Copy this file into your project and fill in the project-specific values.
// Tools accept --config=<path> to load this file.

const path = require('path');

const projectRoot = path.resolve(__dirname, '..'); // adjust to your project root

module.exports = {
  // --- Language ---
  // zh 通常是基准/源语言，大概率已有完整资源（甚至可能是唯一语言，尚未做 i18n）。
  // 按需取消注释或添加更多语言。
  supportedLanguages: ['zh', 'en', 'ar', 'vi'],
  baselineLanguage: 'zh',
  // 资源缺失时的回退顺序：先尝试 zh（主兜底），再 en（次兜底）。
  fallbackChain: ['zh', 'en'],

  // --- Runtime ---
  runtimeLanguageDetector: 'browser-navigator',

  // --- Paths (project-relative, POSIX separators) ---
  projectRoot,
  assetsRoot: path.join(projectRoot, 'assets'),
  resourcesRoot: path.join(projectRoot, 'assets', 'resources'),
  reportDirectory: path.join(projectRoot, 'tools', 'reports'),

  // --- Locale ---
  // Return an object: { [lang]: { [key]: translatedString } }
  getLocales() {
    // Example: parse your runtime i18n source file to extract locale data.
    return {};
  },

  // --- Text-Image Source ---
  // Return an array of source text-image descriptors.
  enumerateSourceTextImages() {
    // Example: walk your resources directory for .png files that contain text.
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
  getSpriteFrameMap() {
    return {};
  },
};
