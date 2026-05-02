const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'scripts', 'i18n-workflow-cli.cjs');

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
  return { tempRoot, configPath };
}

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

test('run uses native CLI steps instead of spawning legacy workflow script', () => {
  const fixture = writeFixtureConfig();
  try {
    const result = runCli(['run', '--config', fixture.configPath, '--steps', 'extract,audit,jobs,review', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'run');
    assert.ok(Array.isArray(payload.data.steps));
    assert.strictEqual(payload.data.script, undefined);
    assert.strictEqual(payload.data.stdout, undefined);
    assert.strictEqual(payload.data.stderr, undefined);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
});

test('legacy tools directory is not kept as an execution surface', () => {
  assert.strictEqual(fs.existsSync(path.join(root, 'tools')), false);
});
