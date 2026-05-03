const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'scripts', 'imagegen_workflow_cli.py');
const uvEnv = path.join(os.tmpdir(), 'imagegen-workflow-test-venv');

function runCli(args, options = {}) {
  const env = {
    ...process.env,
    ...(options.env || {}),
    UV_PROJECT_ENVIRONMENT: uvEnv,
    UV_LINK_MODE: 'copy',
  };
  const spawnOptions = { ...options };
  delete spawnOptions.env;
  return spawnSync('uv', ['run', 'python', cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env,
    ...spawnOptions,
  });
}

function runCliAsync(args, options = {}) {
  const env = {
    ...process.env,
    ...(options.env || {}),
    UV_PROJECT_ENVIRONMENT: uvEnv,
    UV_LINK_MODE: 'copy',
  };
  return new Promise(resolve => {
    const child = spawn('uv', ['run', 'python', cli, ...args], {
      cwd: root,
      shell: process.platform === 'win32',
      env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
}

function parseJson(stdout) {
  return JSON.parse(stdout);
}

function writePng(filePath, width, height) {
  const base64BySize = {
    '1x1': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    '2x2': 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAAZ+AgMDZ6evAAAAAElFTkSuQmCC',
  };
  const payload = base64BySize[`${width}x${height}`];
  assert.ok(payload, `missing fixture for ${width}x${height}`);
  fs.writeFileSync(filePath, Buffer.from(payload, 'base64'));
}

test('help describes imagegen workflow CLI', () => {
  const result = runCli(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /imagegen-workflow-cli/);
  assert.match(result.stdout, /generate/);
  assert.match(result.stdout, /postprocess/);
});

test('doctor returns JSON without printing secrets', () => {
  const result = runCli(['doctor'], {
    env: { ...process.env, BASE_URL: 'https://example.test/v1', API_KEY: 'TEST_ONLY_ENV_KEY' },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  const payload = parseJson(result.stdout);
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.command, 'doctor');
  assert.strictEqual(payload.data.provider.hasBaseUrl, true);
  assert.strictEqual(payload.data.provider.hasApiKey, true);
  assert.doesNotMatch(result.stdout, /TEST_ONLY_ENV_KEY/);
});

test('doctor falls back to Codex config and auth files without printing secrets', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-codex-home-'));
  try {
    const codexHome = path.join(tempRoot, '.codex');
    fs.mkdirSync(codexHome, { recursive: true });
    fs.writeFileSync(path.join(codexHome, 'config.toml'), [
      'model_provider = "OpenAI"',
      '',
      '[model_providers.OpenAI]',
      'name = "OpenAI"',
      'base_url = "https://ai.input.im"',
      'wire_api = "responses"',
      'requires_openai_auth = true',
      '',
    ].join('\n'));
    fs.writeFileSync(path.join(codexHome, 'auth.json'), JSON.stringify({
      OPENAI_API_KEY: 'TEST_ONLY_CODEX_IMAGEGEN_KEY',
    }, null, 2));
    const result = runCli(['doctor'], {
      env: {
        ...process.env,
        BASE_URL: '',
        API_KEY: '',
        IMAGEGEN_BASE_URL: '',
        IMAGEGEN_API_KEY: '',
        CODEX_HOME: codexHome,
      },
    });
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.data.provider.hasBaseUrl, true);
    assert.strictEqual(payload.data.provider.hasApiKey, true);
    assert.strictEqual(payload.data.provider.source, 'codex-config');
    assert.doesNotMatch(result.stdout, /TEST_ONLY_CODEX_IMAGEGEN_KEY/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('probe reports local provider readiness as JSON', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-empty-codex-home-'));
  const result = runCli(['probe'], {
    env: { ...process.env, BASE_URL: '', API_KEY: '', IMAGEGEN_BASE_URL: '', IMAGEGEN_API_KEY: '', CODEX_HOME: path.join(tempRoot, '.codex') },
  });
  try {
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'probe');
    assert.strictEqual(payload.data.hasApiEnvironment, false);
    assert.strictEqual(payload.data.source, 'none');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('generate dry-run returns a reusable plan and does not create output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-test-'));
  try {
    const source = path.join(tempRoot, 'source.png');
    const out = path.join(tempRoot, 'out.png');
    writePng(source, 1, 1);
    const result = runCli([
      'generate',
      '--source', source,
      '--text', 'Start',
      '--language', 'en',
      '--width', '128',
      '--height', '64',
      '--out', out,
      '--dry-run',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'generate');
    assert.strictEqual(payload.data.model, 'gpt-image-2');
    assert.strictEqual(payload.data.plan.width, 128);
    assert.strictEqual(payload.data.plan.height, 64);
    assert.strictEqual(fs.existsSync(out), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('postprocess can normalize a PNG to the requested canvas', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-test-'));
  try {
    const generated = path.join(tempRoot, 'generated.png');
    const out = path.join(tempRoot, 'out.png');
    writePng(generated, 1, 1);
    const result = runCli([
      'postprocess',
      '--generated', generated,
      '--width', '2',
      '--height', '2',
      '--out', out,
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'postprocess');
    assert.strictEqual(payload.file, out);
    assert.strictEqual(payload.data.dimensions.width, 2);
    assert.strictEqual(payload.data.dimensions.height, 2);
    assert.strictEqual(fs.existsSync(out), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('cleanup removes explicit temp files only', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-cleanup-'));
  try {
    const target = path.join(tempRoot, 'artifact.tmp');
    fs.writeFileSync(target, 'x');
    const result = runCli(['cleanup', target]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'cleanup');
    assert.deepStrictEqual(payload.data.removed, [target]);
    assert.strictEqual(fs.existsSync(target), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('cleanup refuses the current workspace', () => {
  const result = runCli(['cleanup', root]);
  assert.strictEqual(result.status, 0, result.stderr);
  const payload = parseJson(result.stdout);
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.command, 'cleanup');
  assert.deepStrictEqual(payload.data.removed, []);
  assert.strictEqual(payload.data.refused.length, 1);
  assert.strictEqual(payload.data.refused[0].reason, 'unsafe_root_or_workspace');
  assert.strictEqual(fs.existsSync(root), true);
});

test('self-test reports its own command', () => {
  const result = runCli(['self-test']);
  assert.strictEqual(result.status, 0, result.stderr);
  const payload = parseJson(result.stdout);
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.command, 'self-test');
  assert.strictEqual(payload.data.postprocess.dimensions.width, 2);
  assert.strictEqual(payload.data.postprocess.dimensions.height, 2);
});

test('batch can run offline postprocess jobs and write a report', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-batch-'));
  try {
    const generated = path.join(tempRoot, 'generated.png');
    const out = path.join(tempRoot, 'out.png');
    const jobs = path.join(tempRoot, 'jobs.json');
    const report = path.join(tempRoot, 'report.json');
    writePng(generated, 1, 1);
    fs.writeFileSync(jobs, JSON.stringify({
      jobs: [{
        id: 'button-en',
        command: 'postprocess',
        generated,
        width: 2,
        height: 2,
        out,
      }],
    }, null, 2));
    const result = runCli(['batch', '--jobs', jobs, '--out', report]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'batch');
    assert.strictEqual(payload.data.summary.total, 1);
    assert.strictEqual(payload.data.summary.ok, 1);
    assert.strictEqual(payload.data.items[0].id, 'button-en');
    assert.strictEqual(payload.data.items[0].ok, true);
    assert.strictEqual(fs.existsSync(out), true);
    assert.strictEqual(fs.existsSync(report), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('probe network reports whether the requested model is visible', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'gpt-image-2' }, { id: 'other-model' }] }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const result = await runCliAsync(['probe', '--network', '--base-url', `http://127.0.0.1:${port}/v1`, '--api-key', 'TEST_ONLY_NETWORK_KEY', '--model', 'gpt-image-2']);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'probe');
    assert.strictEqual(payload.data.network.ok, true);
    assert.strictEqual(payload.data.network.modelVisible, true);
    assert.strictEqual(payload.data.network.modelCount, 2);
    assert.doesNotMatch(result.stdout, /TEST_ONLY_NETWORK_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
