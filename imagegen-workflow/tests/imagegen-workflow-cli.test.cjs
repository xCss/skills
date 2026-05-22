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
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;
  delete env.VIRTUAL_ENV;
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
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;
  delete env.VIRTUAL_ENV;
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

function pngColorTypeFromDataUrl(dataUrl) {
  const marker = 'base64,';
  const markerIndex = dataUrl.indexOf(marker);
  assert.notStrictEqual(markerIndex, -1, 'missing base64 data URL marker');
  const bytes = Buffer.from(dataUrl.slice(markerIndex + marker.length), 'base64');
  assert.strictEqual(bytes.slice(12, 16).toString('ascii'), 'IHDR');
  return bytes[25];
}

function writeLMask(filePath, width, height, fillFn) {
  const py = [
    'import sys, os',
    'from PIL import Image, ImageDraw',
    `img = Image.new('L', (${width}, ${height}), 0)`,
    'd = ImageDraw.Draw(img)',
    ...fillFn,
    `img.save(r'${filePath.replace(/\\/g, '\\\\')}')`,
  ].join('\n');
  const scriptPath = filePath + '.py';
  fs.writeFileSync(scriptPath, py);
  try {
    const result = spawnSync('uv', ['run', 'python', scriptPath], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, UV_PROJECT_ENVIRONMENT: uvEnv, UV_LINK_MODE: 'copy' },
    });
    assert.strictEqual(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(scriptPath, { force: true });
  }
}

test('help describes imagegen workflow CLI', () => {
  const result = runCli(['--help']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /imagegen-workflow-cli/);
  assert.match(result.stdout, /edit/);
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

test('generate dry-run supports text-only generation without source image', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-generate-text-'));
  try {
    const out = path.join(tempRoot, 'out.png');
    const result = runCli([
      'generate',
      '--text', 'fresh-blue-icon',
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
    assert.strictEqual(payload.data.plan.source, null);
    assert.match(payload.data.plan.prompt, /fresh-blue-icon/);
    assert.strictEqual(fs.existsSync(out), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('generate execute without source sends text-only Responses request', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-generate-execute-text-'));
  const out = path.join(tempRoot, 'out.png');
  let requestBody = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/responses') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requestBody = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{
            content: [{
              type: 'output_image',
              image_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
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
  try {
    const result = await runCliAsync([
      'generate',
      '--text', 'fresh-blue-icon',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--background', 'transparent',
      '--base-url', `http://127.0.0.1:${server.address().port}/v1`,
      '--api-key', 'TEST_ONLY_IMAGEGEN_GENERATE_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'generate');
    assert.strictEqual(fs.existsSync(out), true);
    const content = requestBody.input[0].content;
    assert.strictEqual(content.some(item => item.type === 'input_text'), true);
    assert.strictEqual(content.some(item => item.type === 'input_image'), false);
    assert.deepStrictEqual(requestBody.tools, [{
      type: 'image_generation',
      action: 'generate',
      model: 'gpt-image-2',
      output_format: 'png',
    }]);
    assert.strictEqual(Object.hasOwn(requestBody.tools[0], 'background'), false);
    assert.deepStrictEqual(payload.warnings, []);
    assert.deepStrictEqual(requestBody.tool_choice, { type: 'image_generation' });
    assert.doesNotMatch(result.stdout, /TEST_ONLY_IMAGEGEN_GENERATE_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('generate can post to the legacy /v1/images/generations endpoint for text-only prompts', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-legacy-images-generate-'));
  const out = path.join(tempRoot, 'out.png');
  let requestUrl = null;
  let requestHeaders = null;
  let requestBody = '';
  const server = http.createServer((req, res) => {
    requestUrl = req.url;
    requestHeaders = req.headers;
    if (req.url === '/v1/images/generations') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requestBody = body;
        assert.match(requestHeaders['content-type'] || '', /application\/json/);
        const parsed = JSON.parse(body);
        assert.strictEqual(parsed.prompt.includes('fresh-blue-icon'), true);
        assert.strictEqual(parsed.size, '1x1');
        assert.strictEqual(parsed.response_format, 'b64_json');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'generate',
      '--text', 'fresh-blue-icon',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--background', 'transparent',
      '--base-url', `http://127.0.0.1:${server.address().port}/v1/images/generations`,
      '--api-key', 'TEST_ONLY_LEGACY_IMAGES_GENERATE_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'generate');
    assert.strictEqual(requestUrl, '/v1/images/generations');
    assert.strictEqual(fs.existsSync(out), true);
    const parsedBody = JSON.parse(requestBody);
    assert.strictEqual(Object.hasOwn(parsedBody, 'background'), false);
    assert.deepStrictEqual(payload.warnings, []);
    assert.doesNotMatch(result.stdout, /TEST_ONLY_LEGACY_IMAGES_GENERATE_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('generate still requires source when preserving source alpha', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-alpha-source-'));
  try {
    const out = path.join(tempRoot, 'out.png');
    const result = runCli([
      'generate',
      '--text', 'Start',
      '--language', 'en',
      '--width', '128',
      '--height', '64',
      '--out', out,
      '--preserve-source-alpha',
      '--dry-run',
    ]);
    assert.strictEqual(result.status, 2, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, false);
    assert.strictEqual(payload.command, 'generate');
    assert.strictEqual(payload.error.code, 'SOURCE_REQUIRED');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('edit dry-run returns Responses image_generation edit plan and does not create output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-edit-'));
  try {
    const source = path.join(tempRoot, 'source.png');
    const mask = path.join(tempRoot, 'mask.png');
    const out = path.join(tempRoot, 'out.png');
    writePng(source, 1, 1);
    writePng(mask, 1, 1);
    const result = runCli([
      'edit',
      '--source', source,
      '--mask', mask,
      '--text', 'Start',
      '--language', 'en',
      '--width', '128',
      '--height', '64',
      '--out', out,
      '--quality', 'medium',
      '--output-format', 'png',
      '--output-compression', '0',
      '--dry-run',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'edit');
    assert.strictEqual(payload.data.model, 'gpt-image-2');
    assert.strictEqual(payload.data.plan.endpoint, '/responses');
    assert.strictEqual(payload.data.plan.transport, 'responses-image-generation-tool');
    assert.strictEqual(payload.data.plan.mask, mask);
    assert.strictEqual(payload.data.plan.tool.type, 'image_generation');
    assert.strictEqual(payload.data.plan.tool.action, 'edit');
    assert.strictEqual(payload.data.plan.editParameters.quality, 'medium');
    assert.strictEqual(payload.data.plan.editParameters.outputCompression, 0);
    assert.match(payload.data.prompt, /Use this exact replacement text: Start/);
    assert.match(payload.data.prompt, /Change only/);
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

test('batch accepts a bare list jobs file (no jobs wrapper)', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-batch-list-'));
  try {
    const generated = path.join(tempRoot, 'generated.png');
    const out = path.join(tempRoot, 'out.png');
    const jobs = path.join(tempRoot, 'jobs.json');
    const report = path.join(tempRoot, 'report.json');
    writePng(generated, 1, 1);
    fs.writeFileSync(jobs, JSON.stringify([{
      id: 'bare-list',
      command: 'postprocess',
      generated,
      width: 2,
      height: 2,
      out,
    }], null, 2));
    const result = runCli(['batch', '--jobs', jobs, '--out', report]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.data.summary.total, 1);
    assert.strictEqual(payload.data.summary.ok, 1);
    assert.strictEqual(payload.data.items[0].id, 'bare-list');
    assert.strictEqual(payload.data.items[0].ok, true);
    assert.strictEqual(fs.existsSync(out), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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

test('batch can dry-run text-only generate jobs without source', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-batch-generate-text-'));
  try {
    const out = path.join(tempRoot, 'out.png');
    const jobs = path.join(tempRoot, 'jobs.json');
    const report = path.join(tempRoot, 'report.json');
    fs.writeFileSync(jobs, JSON.stringify({
      jobs: [{
        id: 'fresh-icon',
        command: 'generate',
        text: 'fresh-blue-icon',
        language: 'en',
        width: 128,
        height: 64,
        out,
        dry_run: true,
      }],
    }, null, 2));
    const result = runCli(['batch', '--jobs', jobs, '--out', report]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'batch');
    assert.strictEqual(payload.data.summary.total, 1);
    assert.strictEqual(payload.data.summary.ok, 1);
    assert.strictEqual(payload.data.items[0].command, 'generate');
    assert.strictEqual(payload.data.items[0].dryRun, true);
    assert.strictEqual(payload.data.items[0].plan.source, null);
    assert.strictEqual(fs.existsSync(out), false);
    assert.strictEqual(fs.existsSync(report), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('batch accepts UTF-8 BOM jobs files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-batch-bom-'));
  try {
    const out = path.join(tempRoot, 'out.png');
    const jobs = path.join(tempRoot, 'jobs.json');
    const report = path.join(tempRoot, 'report.json');
    fs.writeFileSync(jobs, '\uFEFF' + JSON.stringify({
      jobs: [{
        id: 'bom-icon',
        command: 'generate',
        text: 'bom-blue-icon',
        language: 'en',
        width: 128,
        height: 64,
        out,
        dry_run: true,
      }],
    }, null, 2));
    const result = runCli(['batch', '--jobs', jobs, '--out', report]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'batch');
    assert.strictEqual(payload.data.summary.total, 1);
    assert.strictEqual(payload.data.summary.ok, 1);
    assert.strictEqual(payload.data.items[0].id, 'bom-icon');
    assert.strictEqual(payload.data.items[0].dryRun, true);
    assert.strictEqual(fs.existsSync(out), false);
    assert.strictEqual(fs.existsSync(report), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('batch can dry-run edit jobs and write a report', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-batch-edit-'));
  try {
    const source = path.join(tempRoot, 'source.png');
    const mask = path.join(tempRoot, 'mask.png');
    const out = path.join(tempRoot, 'out.png');
    const jobs = path.join(tempRoot, 'jobs.json');
    const report = path.join(tempRoot, 'report.json');
    writePng(source, 1, 1);
    writePng(mask, 1, 1);
    fs.writeFileSync(jobs, JSON.stringify({
      jobs: [{
        id: 'button-en-edit',
        command: 'edit',
        source,
        mask,
        text: 'Start',
        language: 'en',
        width: 128,
        height: 64,
        out,
        quality: 'medium',
        output_format: 'png',
        dry_run: true,
      }],
    }, null, 2));
    const result = runCli(['batch', '--jobs', jobs, '--out', report]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'batch');
    assert.strictEqual(payload.data.summary.total, 1);
    assert.strictEqual(payload.data.summary.ok, 1);
    assert.strictEqual(payload.data.items[0].command, 'edit');
    assert.strictEqual(payload.data.items[0].dryRun, true);
    assert.strictEqual(payload.data.items[0].plan.endpoint, '/responses');
    assert.strictEqual(payload.data.items[0].plan.transport, 'responses-image-generation-tool');
    assert.strictEqual(payload.data.items[0].plan.tool.type, 'image_generation');
    assert.strictEqual(payload.data.items[0].plan.tool.action, 'edit');
    assert.strictEqual(fs.existsSync(out), false);
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

test('edit execute sends Responses image_generation edit tool with mask', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-edit-execute-'));
  const source = path.join(tempRoot, 'source.png');
  const mask = path.join(tempRoot, 'mask.png');
  const out = path.join(tempRoot, 'out.png');
  writePng(source, 1, 1);
  writePng(mask, 1, 1);
  let requestBody = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/responses') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requestBody = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{
            type: 'image_generation_call',
            result: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'edit',
      '--source', source,
      '--mask', mask,
      '--text', 'Start',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--background', 'transparent',
      '--quality', 'medium',
      '--output-format', 'png',
      '--base-url', `http://127.0.0.1:${server.address().port}/v1`,
      '--api-key', 'TEST_ONLY_IMAGEGEN_EDIT_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'edit');
    assert.strictEqual(fs.existsSync(out), true);
    const content = requestBody.input[0].content;
    assert.strictEqual(content.some(item => item.type === 'input_text'), true);
    assert.strictEqual(content.some(item => item.type === 'input_image' && item.image_url.startsWith('data:image/png;base64,')), true);
    assert.deepStrictEqual(requestBody.tools, [{
      type: 'image_generation',
      action: 'edit',
      model: 'gpt-image-2',
      quality: 'medium',
      output_format: 'png',
      input_image_mask: {
        image_url: requestBody.tools[0].input_image_mask.image_url,
      },
    }]);
    assert.strictEqual(Object.hasOwn(requestBody.tools[0], 'background'), false);
    assert.deepStrictEqual(payload.warnings, []);
    assert.match(requestBody.tools[0].input_image_mask.image_url, /^data:image\/png;base64,/);
    assert.strictEqual(pngColorTypeFromDataUrl(requestBody.tools[0].input_image_mask.image_url), 6);
    assert.deepStrictEqual(requestBody.tool_choice, { type: 'image_generation' });
    assert.doesNotMatch(result.stdout, /TEST_ONLY_IMAGEGEN_EDIT_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('edit can post to the legacy /v1/images/edits endpoint when the base URL targets images', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-legacy-images-edit-'));
  const source = path.join(tempRoot, 'source.png');
  const mask = path.join(tempRoot, 'mask.png');
  const out = path.join(tempRoot, 'out.png');
  writePng(source, 1, 1);
  writePng(mask, 1, 1);
  let requestUrl = null;
  let requestHeaders = null;
  let requestBody = '';
  const server = http.createServer((req, res) => {
    requestUrl = req.url;
    requestHeaders = req.headers;
    if (req.url === '/v1/images/edits') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requestBody = body;
        assert.match(requestHeaders['content-type'] || '', /multipart\/form-data/);
        assert.match(body, /name="prompt"/);
        assert.match(body, /name="image"/);
        assert.match(body, /name="mask"/);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'edit',
      '--source', source,
      '--mask', mask,
      '--text', 'Start',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--background', 'transparent',
      '--quality', 'medium',
      '--output-format', 'png',
      '--base-url', `http://127.0.0.1:${server.address().port}/v1/images/edits`,
      '--api-key', 'TEST_ONLY_LEGACY_IMAGES_EDIT_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'edit');
    assert.strictEqual(requestUrl, '/v1/images/edits');
    assert.strictEqual(fs.existsSync(out), true);
    assert.doesNotMatch(requestBody, /name="background"/);
    assert.deepStrictEqual(payload.warnings, []);
    assert.doesNotMatch(result.stdout, /TEST_ONLY_LEGACY_IMAGES_EDIT_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('postprocess re-encodes output to webp when --output-format webp', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-postprocess-webp-'));
  try {
    const generated = path.join(tempRoot, 'generated.png');
    const out = path.join(tempRoot, 'out.webp');
    writePng(generated, 1, 1);
    const result = runCli([
      'postprocess',
      '--generated', generated,
      '--width', '2',
      '--height', '2',
      '--out', out,
      '--output-format', 'webp',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.mime, 'image/webp');
    assert.strictEqual(fs.existsSync(out), true);
    const header = fs.readFileSync(out).slice(0, 12);
    assert.strictEqual(header.slice(0, 4).toString('ascii'), 'RIFF');
    assert.strictEqual(header.slice(8, 12).toString('ascii'), 'WEBP');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('generate routes legacy /v1/images/generations base URL to /v1/responses when --source is provided', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-legacy-plus-source-'));
  const source = path.join(tempRoot, 'source.png');
  const out = path.join(tempRoot, 'out.png');
  writePng(source, 1, 1);
  let requestUrl = null;
  const server = http.createServer((req, res) => {
    requestUrl = req.url;
    if (req.url === '/v1/responses') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{ type: 'image_generation_call', result: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'generate',
      '--source', source,
      '--text', 'Start',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--base-url', `http://127.0.0.1:${server.address().port}/v1/images/generations`,
      '--api-key', 'TEST_ONLY_LEGACY_SOURCE_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(requestUrl, '/v1/responses');
    assert.strictEqual(fs.existsSync(out), true);
    assert.doesNotMatch(result.stdout, /TEST_ONLY_LEGACY_SOURCE_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('edit retries with minimal Responses tool when provider rejects the full tool', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-edit-retry-'));
  const source = path.join(tempRoot, 'source.png');
  const out = path.join(tempRoot, 'out.png');
  writePng(source, 1, 1);
  let calls = 0;
  let firstToolHadBackground = null;
  let secondToolHadBackground = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/responses') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        calls += 1;
        const parsed = JSON.parse(body);
        const tool = parsed.tools[0];
        if (calls === 1) {
          firstToolHadBackground = Object.hasOwn(tool, 'quality');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'tool parameter not supported' } }));
          return;
        }
        secondToolHadBackground = Object.hasOwn(tool, 'quality');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{ type: 'image_generation_call', result: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' }],
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'edit',
      '--source', source,
      '--text', 'Go',
      '--language', 'en',
      '--width', '1',
      '--height', '1',
      '--out', out,
      '--quality', 'medium',
      '--base-url', `http://127.0.0.1:${server.address().port}/v1`,
      '--api-key', 'TEST_ONLY_RETRY_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(calls, 2);
    assert.strictEqual(firstToolHadBackground, true);
    assert.strictEqual(secondToolHadBackground, false);
    const payload = parseJson(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.match(payload.warnings[0], /retried with a minimal provider-compatible tool/);
    assert.doesNotMatch(result.stdout, /TEST_ONLY_RETRY_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('edit normalizes L-mode mask to OpenAI alpha polarity (white=edit -> alpha=0)', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-workflow-mask-polarity-'));
  const source = path.join(tempRoot, 'source.png');
  const mask = path.join(tempRoot, 'mask.png');
  const out = path.join(tempRoot, 'out.png');
  writePng(source, 2, 2);
  writeLMask(mask, 2, 2, [
    'img.putpixel((0, 0), 255)',
    'img.putpixel((1, 0), 0)',
    'img.putpixel((0, 1), 0)',
    'img.putpixel((1, 1), 255)',
  ]);
  let receivedMaskUrl = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/responses') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        receivedMaskUrl = parsed.tools[0].input_image_mask.image_url;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          output: [{ type: 'image_generation_call', result: 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAAZ+AgMDZ6evAAAAAElFTkSuQmCC' }],
        }));
      });
      return;
    }
    res.writeHead(404).end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runCliAsync([
      'edit',
      '--source', source,
      '--mask', mask,
      '--text', 'Go',
      '--language', 'en',
      '--width', '2',
      '--height', '2',
      '--out', out,
      '--base-url', `http://127.0.0.1:${server.address().port}/v1`,
      '--api-key', 'TEST_ONLY_MASK_POLARITY_KEY',
    ]);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(receivedMaskUrl, /^data:image\/png;base64,/);
    const pngBase64 = receivedMaskUrl.split(',')[1];
    const maskBytesPath = path.join(tempRoot, 'received_mask.png');
    fs.writeFileSync(maskBytesPath, Buffer.from(pngBase64, 'base64'));
    const scriptPath = path.join(tempRoot, 'read_alphas.py');
    fs.writeFileSync(scriptPath, [
      'from PIL import Image',
      `img = Image.open(r'${maskBytesPath.replace(/\\/g, '\\\\')}').convert("RGBA")`,
      'alphas = [img.getpixel((x, y))[3] for y in range(img.height) for x in range(img.width)]',
      'print(",".join(str(a) for a in alphas))',
    ].join('\n'));
    const inspect = spawnSync('uv', ['run', 'python', scriptPath], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, UV_PROJECT_ENVIRONMENT: uvEnv, UV_LINK_MODE: 'copy' },
    });
    assert.strictEqual(inspect.status, 0, inspect.stderr);
    const alphas = inspect.stdout.trim().split(',').map(Number);
    assert.deepStrictEqual(alphas, [0, 255, 255, 0], 'white pixels must become alpha=0 (edit), black pixels alpha=255 (preserve)');
    assert.doesNotMatch(result.stdout, /TEST_ONLY_MASK_POLARITY_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
