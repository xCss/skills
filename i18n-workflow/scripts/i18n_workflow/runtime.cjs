const fs = require('fs');
const path = require('path');

const common = require('./common.cjs');

const LANGUAGE_CASES = [
  ['zh-CN'],
  ['zh-TW'],
  ['en-US'],
  ['ja-JP'],
  ['fr-FR'],
  ['zz-ZZ'],
];

function projectPathExists(config, projectRelativePath) {
  if (!projectRelativePath) return false;
  return fs.existsSync(path.join(config.projectRoot, ...String(projectRelativePath).split('/')));
}

function runtimeProblem(code, message, severity = 'error') {
  return { code, message, severity };
}

function runRuntimeAudit(config) {
  const runtime = common.runtimeConfig(config);
  const i18nRuntime = common.i18nRuntimeConfig(config);
  const locales = common.localeConfig(config);
  const warnings = [];
  const problems = [];

  if (runtime.platform === 'h5' && runtime.detector !== 'browser-navigator' && !String(runtime.detector).startsWith('custom')) {
    problems.push(runtimeProblem('h5_browser_detector_required', 'H5 runtime should use browser navigator detection or an explicit custom detector.'));
  }
  if (runtime.platform === 'h5' && runtime.initBeforeFirstScene !== true) {
    problems.push(runtimeProblem('init_before_first_scene_required', 'H5 runtime must initialize language before the first real UI scene to avoid source-language flash.'));
  }
  if (!i18nRuntime.translateFunction) {
    problems.push(runtimeProblem('translate_function_missing', 'i18nRuntime.translateFunction must document the runtime translation entry.'));
  }
  if (!i18nRuntime.setLanguageFunction) {
    problems.push(runtimeProblem('set_language_function_missing', 'i18nRuntime.setLanguageFunction must document language switching.'));
  }
  if (!i18nRuntime.getLanguageFunction) {
    problems.push(runtimeProblem('get_language_function_missing', 'i18nRuntime.getLanguageFunction must document active language retrieval.'));
  }
  if (i18nRuntime.initFile && !projectPathExists(config, i18nRuntime.initFile)) {
    warnings.push(`i18nRuntime.initFile does not exist: ${i18nRuntime.initFile}`);
  }
  if (locales.directory && !projectPathExists(config, locales.directory)) {
    warnings.push(`locales.directory does not exist: ${locales.directory}`);
  }

  const languageResolutionCases = LANGUAGE_CASES.map(browserLanguages => common.simulateBrowserLanguageResolution(config, browserLanguages));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      supportedLanguageCount: Array.isArray(config.supportedLanguages) ? config.supportedLanguages.length : 0,
      problemCount: problems.length,
      warningCount: warnings.length,
    },
    runtime,
    i18nRuntime,
    locales,
    languageResolutionCases,
    warnings,
    problems,
  };
}

module.exports = { runRuntimeAudit };
