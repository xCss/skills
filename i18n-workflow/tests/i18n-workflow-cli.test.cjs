const assert = require('assert');
const fs = require('fs');
const http = require('http');
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
    assert.deepStrictEqual(payload.data.steps.map(step => step.error).filter(Boolean), []);
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

test('model-backed image generation is routed through imagegen workflow CLI', () => {
  const imagesModule = fs.readFileSync(path.join(root, 'scripts', 'i18n_workflow', 'images.cjs'), 'utf8');
  assert.match(imagesModule, /imagegen_workflow_cli\.py/);
  assert.match(imagesModule, /runImagegenWorkflowGenerate/);
  assert.match(imagesModule, /runImagegenWorkflowPostprocess/);
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
