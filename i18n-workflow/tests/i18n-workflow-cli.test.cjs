const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const test = require('node:test');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'scripts', 'i18n-workflow-cli.cjs');
const { resolveRuntimeLanguage } = require(path.join(root, 'scripts', 'i18n_workflow', 'common.cjs'));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
}

function writeFixtureConfig() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-cli-test-'));
  const projectRoot = path.join(tempRoot, 'project');
  const assetsRoot = path.join(projectRoot, 'assets');
  const resourcesRoot = path.join(assetsRoot, 'resources');
  const reportDirectory = path.join(projectRoot, 'tools', 'reports');
  fs.mkdirSync(path.join(resourcesRoot, 'prefabs'), { recursive: true });
  const imagePath = path.join(resourcesRoot, 'ui', 'button.png');
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.writeFileSync(imagePath, Buffer.from('not-a-real-png'));
  fs.writeFileSync(`${imagePath}.meta`, JSON.stringify({
    uuid: '11111111-1111-4111-8111-111111111111',
    subMetas: {
      button: {
        uuid: '22222222-2222-4222-8222-222222222222',
        rawWidth: 120,
        rawHeight: 48,
      },
    },
  }, null, 2));
  fs.mkdirSync(reportDirectory, { recursive: true });
  const configPath = path.join(tempRoot, 'i18n-workflow.config.cjs');
  fs.writeFileSync(configPath, [
    'const path = require("path");',
    `const projectRoot = ${JSON.stringify(projectRoot)};`,
    'module.exports = {',
    '  supportedLanguages: ["zh"],',
    '  baselineLanguage: "zh",',
    '  fallbackChain: ["zh"],',
    '  runtimeLanguageDetector: "test",',
    '  projectRoot,',
    '  assetsRoot: path.join(projectRoot, "assets"),',
    '  resourcesRoot: path.join(projectRoot, "assets", "resources"),',
    '  reportDirectory: path.join(projectRoot, "tools", "reports"),',
    '  getLocales() { return { zh: { "common.ok": "确定" } }; },',
    '  enumerateSourceTextImages() { return []; },',
    '  resolveTargetPath(sourceResourcesPath, language) { return `i18n_text_sprites/${language}/${sourceResourcesPath}`; },',
    '  getSpriteFrameMap() { return {}; },',
    '};',
  ].join('\n'));
  return { tempRoot, configPath, projectRoot, assetsRoot, resourcesRoot, reportDirectory, imagePath };
}

function writeRuntimeFixtureConfig(overrides = {}) {
  const fixture = writeFixtureConfig();
  const supportedLanguages = overrides.supportedLanguages || ['zh', 'en'];
  const baselineLanguage = overrides.baselineLanguage || 'zh';
  const fallbackChain = overrides.fallbackChain || ['en', 'zh'];
  const runtime = {
    platform: 'h5',
    detector: 'browser-navigator',
    preferenceStorage: 'localStorage',
    preferenceKey: 'game.language',
    initBeforeFirstScene: true,
    ...(overrides.runtime || {}),
  };
  const i18nRuntime = {
    provider: 'i18next',
    initFile: 'assets/scripts/i18n/initI18n.ts',
    initFunction: 'initI18n',
    translateFunction: 't',
    setLanguageFunction: 'setLanguage',
    getLanguageFunction: 'getLanguage',
    ...(overrides.i18nRuntime || {}),
  };
  const locales = {
    directory: 'assets/i18n',
    format: 'json',
    namespaceMode: 'optional',
    ...(overrides.locales || {}),
  };
  fs.mkdirSync(path.join(fixture.projectRoot, 'assets', 'scripts', 'i18n'), { recursive: true });
  fs.writeFileSync(path.join(fixture.projectRoot, 'assets', 'scripts', 'i18n', 'initI18n.ts'), 'export function initI18n() {}\nexport function t(key) { return key; }\nexport function setLanguage(lang) { return lang; }\nexport function getLanguage() { return "zh"; }\n');
  fs.mkdirSync(path.join(fixture.projectRoot, 'assets', 'i18n'), { recursive: true });
  for (const language of supportedLanguages) {
    fs.writeFileSync(path.join(fixture.projectRoot, 'assets', 'i18n', `${language}.json`), `${JSON.stringify({ 'common.ok': language === 'zh' ? '确定' : 'OK' }, null, 2)}\n`);
  }
  fs.writeFileSync(fixture.configPath, [
    'const path = require("path");',
    `const projectRoot = ${JSON.stringify(fixture.projectRoot)};`,
    'module.exports = {',
    `  supportedLanguages: ${JSON.stringify(supportedLanguages)},`,
    `  baselineLanguage: ${JSON.stringify(baselineLanguage)},`,
    `  fallbackChain: ${JSON.stringify(fallbackChain)},`,
    '  browserLanguageFallback: "en",',
    `  runtime: ${JSON.stringify(runtime, null, 2)},`,
    `  i18nRuntime: ${JSON.stringify(i18nRuntime, null, 2)},`,
    `  locales: ${JSON.stringify(locales, null, 2)},`,
    '  projectRoot,',
    '  assetsRoot: path.join(projectRoot, "assets"),',
    '  resourcesRoot: path.join(projectRoot, "assets", "resources"),',
    '  reportDirectory: path.join(projectRoot, "tools", "reports"),',
    '  getLocales() { return Object.fromEntries(this.supportedLanguages.map(language => [language, { "common.ok": language === "zh" ? "确定" : "OK" }])); },',
    '  enumerateSourceTextImages() { return []; },',
    '  resolveTargetPath(sourceResourcesPath, language) { return `i18n_text_sprites/${language}/${sourceResourcesPath}`; },',
    '  getSpriteFrameMap() { return {}; },',
    '};',
  ].join('\n'));
  return fixture;
}

function writePrefabKeyFixtureConfig() {
  const fixture = writeFixtureConfig();
  const prefabPath = path.join(fixture.resourcesRoot, 'prefabs', 'HomePage.prefab');
  fs.writeFileSync(prefabPath, `${JSON.stringify([
    { __type__: 'cc.Label', _string: '开始游戏' },
    { __type__: 'cc.Label', _string: '未覆盖文案' },
  ], null, 2)}\n`);
  fs.writeFileSync(fixture.configPath, [
    'const path = require("path");',
    `const projectRoot = ${JSON.stringify(fixture.projectRoot)};`,
    'module.exports = {',
    '  supportedLanguages: ["zh", "en"],',
    '  baselineLanguage: "zh",',
    '  fallbackChain: ["zh", "en"],',
    '  runtimeLanguageDetector: "test",',
    '  projectRoot,',
    '  assetsRoot: path.join(projectRoot, "assets"),',
    '  resourcesRoot: path.join(projectRoot, "assets", "resources"),',
    '  reportDirectory: path.join(projectRoot, "tools", "reports"),',
    '  getLocales() { return { zh: { "ui.start_game": "开始游戏" }, en: { "ui.start_game": "Start Game" } }; },',
    '  sourceTextToKey(text) { return text === "开始游戏" ? "ui.start_game" : null; },',
    '  getRuntimeTextKeyMap() { return { "开始游戏": "ui.start_game" }; },',
    '  enumerateSourceTextImages() { return []; },',
    '  resolveTargetPath(sourceResourcesPath, language) { return `i18n_text_sprites/${language}/${sourceResourcesPath}`; },',
    '  getSpriteFrameMap() { return {}; },',
    '};',
  ].join('\n'));
  return fixture;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function withEnv(nextEnv, fn) {
  const previous = {};
  for (const key of Object.keys(nextEnv)) {
    previous[key] = process.env[key];
    if (nextEnv[key] === undefined) delete process.env[key];
    else process.env[key] = nextEnv[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(nextEnv)) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    });
}

function crc32(buffer) {
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_value, index) => {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createUnoptimizedPng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      row[offset] = 220;
      row[offset + 1] = 80;
      row[offset + 2] = 50;
      row[offset + 3] = 255;
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 0 });
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createTransparentPng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y += 1) rows.push(Buffer.alloc(1 + width * 4));
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

test('runtime language falls back to English when browser detection has no supported match', () => {
  const config = {
    supportedLanguages: ['zh', 'en'],
    baselineLanguage: 'zh',
    fallbackChain: ['zh', 'en'],
  };

  assert.strictEqual(resolveRuntimeLanguage(['fr-FR'], config), 'en');
  assert.strictEqual(resolveRuntimeLanguage([], config), 'en');
});

test('runtime language uses configured fallback when English is not shipped', () => {
  const config = {
    supportedLanguages: ['zh'],
    baselineLanguage: 'zh',
    fallbackChain: ['zh'],
  };

  assert.strictEqual(resolveRuntimeLanguage(['fr-FR'], config), 'zh');
});

test('runtime language normalizes browser language variants before fallback', () => {
  const config = {
    supportedLanguages: ['zh', 'en'],
    baselineLanguage: 'zh',
    fallbackChain: ['en', 'zh'],
  };

  assert.strictEqual(resolveRuntimeLanguage(['zh-CN'], config), 'zh');
  assert.strictEqual(resolveRuntimeLanguage(['en-US'], config), 'en');
});

test('runtime step writes H5 standard i18n provider audit report', () => {
  const fixture = writeRuntimeFixtureConfig();
  try {
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'runtime', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.deepStrictEqual(payload.data.steps.map(step => step.name), ['runtime']);

    const report = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-runtime-audit.json'), 'utf8'));
    assert.strictEqual(report.runtime.platform, 'h5');
    assert.strictEqual(report.i18nRuntime.provider, 'i18next');
    assert.deepStrictEqual(report.summary.problemCount, 0);
    assert.strictEqual(report.languageResolutionCases.find(item => item.input.includes('zh-CN')).resolvedLanguage, 'zh');
    assert.strictEqual(report.languageResolutionCases.find(item => item.input.includes('en-US')).resolvedLanguage, 'en');
    assert.strictEqual(report.languageResolutionCases.find(item => item.input.includes('fr-FR')).resolvedLanguage, 'en');
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('runtime step reports first scene initialization problem for H5', () => {
  const fixture = writeRuntimeFixtureConfig({ runtime: { initBeforeFirstScene: false } });
  try {
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'runtime', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-runtime-audit.json'), 'utf8'));
    assert.match(JSON.stringify(report.problems), /init_before_first_scene_required/);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('help describes canonical CLI without legacy tool routing', () => {
  const result = runCli(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /i18n-workflow-cli/);
  assert.doesNotMatch(result.stdout, /legacy/i);
});

test('doctor reports CLI modules instead of legacy tools', () => {
  const fixture = writeFixtureConfig();
  try {
    const result = runCli(['doctor', '--config', fixture.configPath]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'doctor');
    assert.ok(payload.data.checks.cliModules);
    assert.strictEqual(payload.data.checks.toolsDirExists, undefined);
    assert.strictEqual(payload.data.checks.scripts, undefined);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('CLI works from non-project cwd when config path is absolute', () => {
  const fixture = writeFixtureConfig();
  const tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-cli-cwd-'));
  try {
    const result = runCli(['doctor', '--config', fixture.configPath], { cwd: tempCwd });
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.data.checks.projectRootExists, true);
  } finally {
    fs.rmSync(tempCwd, { recursive: true, force: true });
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('run uses native CLI steps instead of spawning legacy workflow script', () => {
  const fixture = writeFixtureConfig();
  try {
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'extract,audit,jobs,review', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'run');
    assert.ok(Array.isArray(payload.data.steps));
    assert.deepStrictEqual(payload.data.steps.map(step => step.error).filter(Boolean), []);
    assert.strictEqual(payload.data.script, undefined);
    assert.strictEqual(payload.data.stdout, undefined);
    assert.strictEqual(payload.data.stderr, undefined);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('extract prefers project canonical text keys and reports runtime source-map coverage', () => {
  const fixture = writePrefabKeyFixtureConfig();
  try {
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'extract', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);

    const report = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-hardcoded-text-audit.json'), 'utf8'));
    assert.strictEqual(report.localeSeed.zh['ui.start_game'], '开始游戏');
    assert.strictEqual(report.items[0].keySource, 'config.sourceTextToKey');
    assert.strictEqual(report.summary.runtimeKeyMappedTexts, 1);
    assert.strictEqual(report.summary.runtimeKeyMissingTexts, 1);
    assert.deepStrictEqual(report.runtimeKeyCoverage.missing.map(item => item.text), ['未覆盖文案']);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('audit step returns explicit text-image candidates for agent reporting', () => {
  const fixture = writeFixtureConfig();
  try {
    const prefabPath = path.join(fixture.resourcesRoot, 'prefabs', 'GamePage.prefab');
    fs.writeFileSync(prefabPath, `${JSON.stringify([
      { __type__: 'cc.Node', _name: 'GamePage', _components: [{ __id__: 1 }] },
      { __type__: 'cc.Sprite', node: { __id__: 0 }, _spriteFrame: { __uuid__: '22222222-2222-4222-8222-222222222222' } },
    ], null, 2)}\n`);
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'audit', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    const auditStep = payload.data.steps.find(step => step.name === 'audit');
    assert.strictEqual(auditStep.result.candidateReport.total, 1);
    assert.deepStrictEqual(auditStep.result.candidateReport.textImageCandidatesWithoutI18nMap.map(item => item.sourceImagePath), [
      'assets/resources/ui/button.png',
    ]);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('manifest uses config.resolveTargetPath for localized image targets', () => {
  const fixture = writeFixtureConfig();
  try {
    fs.writeFileSync(fixture.configPath, [
      'const path = require("path");',
      `const projectRoot = ${JSON.stringify(fixture.projectRoot)};`,
      'module.exports = {',
      '  supportedLanguages: ["zh", "en", "vi", "ar"],',
      '  baselineLanguage: "zh",',
      '  fallbackChain: ["zh", "en"],',
      '  runtimeLanguageDetector: "test",',
      '  projectRoot,',
      '  assetsRoot: path.join(projectRoot, "assets"),',
      '  resourcesRoot: path.join(projectRoot, "assets", "resources"),',
      '  reportDirectory: path.join(projectRoot, "tools", "reports"),',
      '  getLocales() { return { zh: {}, en: {}, vi: {}, ar: {} }; },',
      '  enumerateSourceTextImages() { return [{ imagePath: "assets/resources/ui/button.png", resourcesPath: "ui/button", width: 120, height: 48, hasText: true, localizedText: { en: "Go", vi: "Đi", ar: "اذهب" } }]; },',
      '  resolveTargetPath(sourceResourcesPath, language) { return `localized/${language}/${sourceResourcesPath}`; },',
      '  getSpriteFrameMap() { return {}; },',
      '};',
    ].join('\n'));
    const prefabPath = path.join(fixture.resourcesRoot, 'prefabs', 'GamePage.prefab');
    fs.writeFileSync(prefabPath, `${JSON.stringify([
      { __type__: 'cc.Node', _name: 'GamePage', _components: [{ __id__: 1 }] },
      { __type__: 'cc.Sprite', node: { __id__: 0 }, _spriteFrame: { __uuid__: '22222222-2222-4222-8222-222222222222' } },
    ], null, 2)}\n`);
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'audit,generate', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    const manifest = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-image-manifest.json'), 'utf8'));
    const candidate = manifest.candidates[0];
    assert.strictEqual(candidate.targets.en.resourcesPath, 'localized/en/ui/button');
    assert.strictEqual(candidate.targets.vi.resourcesPath, 'localized/vi/ui/button');
    assert.strictEqual(candidate.targets.ar.resourcesPath, 'localized/ar/ui/button');
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('run --fail-on=error fails when image generation targets fail', () => {
  const fixture = writeFixtureConfig();
  try {
    fs.writeFileSync(path.join(fixture.reportDirectory, 'i18n-image-manifest.json'), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      summary: { candidates: 1, generationTargets: 1 },
      candidates: [{
        spriteFrameUuid: '22222222-2222-4222-8222-222222222222',
        sourceImagePath: 'assets/resources/ui/button.png',
        sourceResourcesPath: 'ui/button',
        width: 120,
        height: 48,
        detectionStatus: 'text',
        targets: {
          zh: { status: 'skipped_baseline' },
          en: { resourcesPath: 'i18n_text_sprites/en/ui/button', generationNeeded: true, proposedText: 'Go', status: 'generation_failed' },
        },
        notes: [{ type: 'generation_failed', language: 'en', message: 'Responses API failed 504: gateway timeout' }],
      }],
    }, null, 2)}\n`);
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'generate', '--fail-on=error']);
    assert.notStrictEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, false);
    assert.strictEqual(payload.error.code, 'WORKFLOW_FAILED');
    assert.match(JSON.stringify(payload.error.detail), /generation_failed/);
    assert.match(JSON.stringify(payload.error.detail), /504/);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('legacy tools directory is not kept as an execution surface', () => {
  assert.strictEqual(fs.existsSync(path.join(root, 'tools')), false);
});

test('model-backed image generation is routed through imagegen workflow CLI', () => {
  const imagesModule = fs.readFileSync(path.join(root, 'scripts', 'i18n_workflow', 'images.cjs'), 'utf8');
  assert.match(imagesModule, /imagegen_workflow_cli\.py/);
  assert.match(imagesModule, /runImagegenWorkflowGenerate/);
  assert.match(imagesModule, /runImagegenWorkflowPostprocess/);
});

test('oversized generated PNGs are locally compressed before size rejection', () => {
  const { __test } = require(path.join(root, 'scripts', 'i18n_workflow', 'images.cjs'));
  const buffer = createUnoptimizedPng(32, 32);
  const compressed = __test.compressPngToLimit(buffer, { width: 32, height: 32 }, 256);

  assert.ok(buffer.length > 256, `fixture should exceed size limit, got ${buffer.length}`);
  assert.ok(compressed.length <= 256, `compressed image should fit limit, got ${compressed.length}`);
  assert.deepStrictEqual(__test.pngDimensions(compressed), { width: 32, height: 32 });
});

test('quality and jobs ignore non-text image candidates without localized targets', () => {
  const fixture = writePrefabKeyFixtureConfig();
  try {
    fs.writeFileSync(path.join(fixture.reportDirectory, 'i18n-image-manifest.json'), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      summary: { candidates: 1, generationTargets: 0 },
      candidates: [{
        spriteFrameUuid: '22222222-2222-4222-8222-222222222222',
        sourceImagePath: 'assets/resources/ui/button.png',
        sourceResourcesPath: 'ui/button',
        width: 120,
        height: 48,
        detectionStatus: 'non_text',
        targets: {
          en: { resourcesPath: 'i18n_text_sprites/en/ui/button', generationNeeded: false, status: 'skipped_non_text' },
        },
        notes: [],
      }],
    }, null, 2)}\n`);

    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'quality,compare,jobs', '--fail-on=error']);
    assert.strictEqual(result.status, 0, result.stdout || result.stderr);
    const quality = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-quality-audit.json'), 'utf8'));
    const jobs = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-regenerate-quality-jobs.json'), 'utf8'));
    assert.deepStrictEqual(quality.items, []);
    assert.deepStrictEqual(jobs, []);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('compare step detects visually blank generated targets', () => {
  const fixture = writePrefabKeyFixtureConfig();
  try {
    const sourcePng = createUnoptimizedPng(32, 32);
    fs.writeFileSync(fixture.imagePath, sourcePng);
    const targetPath = path.join(fixture.resourcesRoot, 'i18n_text_sprites', 'en', 'ui', 'button.png');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, createTransparentPng(32, 32));
    fs.writeFileSync(path.join(fixture.reportDirectory, 'i18n-image-manifest.json'), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      summary: { candidates: 1, generationTargets: 0 },
      candidates: [{
        spriteFrameUuid: '22222222-2222-4222-8222-222222222222',
        sourceImagePath: 'assets/resources/ui/button.png',
        sourceResourcesPath: 'ui/button',
        width: 32,
        height: 32,
        detectionStatus: 'text',
        targets: {
          en: { resourcesPath: 'i18n_text_sprites/en/ui/button', generatedPath: toPosix(path.relative(fixture.projectRoot, targetPath)), generationNeeded: false, proposedText: 'Go', status: 'generated_needs_cocos_import' },
        },
        notes: [],
      }],
    }, null, 2)}\n`);

    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'quality,compare,jobs', '--fail-on=error']);
    assert.notStrictEqual(result.status, 0);
    const compare = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-compare-quality-audit.json'), 'utf8'));
    assert.match(JSON.stringify(compare.items[0].problems), /visual_blank_target/);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('probe resolves classification provider from Codex config without printing secrets', () => {
  const fixture = writeFixtureConfig();
  const codexHome = path.join(fixture.tempRoot, '.codex');
  try {
    fs.mkdirSync(codexHome, { recursive: true });
    fs.writeFileSync(path.join(codexHome, 'config.toml'), [
      'model_provider = "OpenAI"',
      '',
      '[model_providers.OpenAI]',
      'base_url = "https://ai.input.im"',
      'wire_api = "responses"',
      'requires_openai_auth = true',
      '',
    ].join('\n'));
    fs.writeFileSync(path.join(codexHome, 'auth.json'), `${JSON.stringify({
      OPENAI_API_KEY: 'TEST_ONLY_I18N_PROBE_CODEX_KEY',
    }, null, 2)}\n`);
    const result = runCli(['probe', '--config', fixture.configPath], {
      env: {
        ...process.env,
        BASE_URL: '',
        API_KEY: '',
        I18N_CLASSIFY_BASE_URL: '',
        I18N_CLASSIFY_API_KEY: '',
        CODEX_HOME: codexHome,
      },
    });
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'probe');
    assert.strictEqual(payload.data.hasApiEnvironment, true);
    assert.strictEqual(payload.data.provider.classify.hasBaseUrl, true);
    assert.strictEqual(payload.data.provider.classify.hasApiKey, true);
    assert.strictEqual(payload.data.provider.classify.source, 'codex-config');
    assert.doesNotMatch(result.stdout, /TEST_ONLY_I18N_PROBE_CODEX_KEY/);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('model-backed image classification resolves provider from Codex config and auth', async () => {
  const fixture = writeFixtureConfig();
  const codexHome = path.join(fixture.tempRoot, '.codex');
  const { runImages } = require(path.join(root, 'scripts', 'i18n_workflow', 'images.cjs'));
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/responses') {
      requestCount += 1;
      assert.strictEqual(req.headers.authorization, 'Bearer TEST_ONLY_I18N_CLASSIFY_CODEX_KEY');
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const payload = JSON.parse(body);
        assert.strictEqual(payload.model, 'gpt-5.5');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{
            content: [{
              text: JSON.stringify({
                hasText: false,
                embeddedText: null,
                semanticMeaning: 'decorative button',
                localizedText: { en: null },
                confidence: 0.91,
                reason: 'mock classification',
              }),
            }],
          }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const originalLog = console.log;
  try {
    const sourceImagePath = toPosix(path.relative(fixture.projectRoot, fixture.imagePath));
    fs.writeFileSync(path.join(fixture.reportDirectory, 'i18n-asset-audit.json'), `${JSON.stringify({
      textImageCandidatesWithoutI18nMap: [{
        spriteFrameUuid: '22222222-2222-4222-8222-222222222222',
        sourceImagePath,
        resourcesPath: 'ui/button',
        width: 120,
        height: 48,
        fileSize: 18,
      }],
    }, null, 2)}\n`);
    fs.mkdirSync(codexHome, { recursive: true });
    fs.writeFileSync(path.join(codexHome, 'config.toml'), [
      'model_provider = "OpenAI"',
      '',
      '[model_providers.OpenAI]',
      `base_url = "http://127.0.0.1:${server.address().port}/v1"`,
      'wire_api = "responses"',
      'requires_openai_auth = true',
      '',
    ].join('\n'));
    fs.writeFileSync(path.join(codexHome, 'auth.json'), `${JSON.stringify({
      OPENAI_API_KEY: 'TEST_ONLY_I18N_CLASSIFY_CODEX_KEY',
    }, null, 2)}\n`);

    const config = require(fixture.configPath);
    console.log = () => {};
    await withEnv({
      BASE_URL: '',
      API_KEY: '',
      I18N_CLASSIFY_BASE_URL: '',
      I18N_CLASSIFY_API_KEY: '',
      CODEX_HOME: codexHome,
    }, () => runImages(config, ['--classify', '--execute', '--limit=1', '--concurrency=1']));
    console.log = originalLog;

    const manifest = JSON.parse(fs.readFileSync(path.join(fixture.reportDirectory, 'i18n-image-manifest.json'), 'utf8'));
    assert.strictEqual(requestCount, 1);
    assert.strictEqual(manifest.candidates[0].detectionStatus, 'non_text');
  } finally {
    console.log = originalLog;
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});
