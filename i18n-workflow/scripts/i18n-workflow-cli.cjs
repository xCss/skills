#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const skillRoot = path.resolve(__dirname, '..');
const toolsDir = path.join(skillRoot, 'tools');
const common = require(path.join(toolsDir, 'common.cjs'));

const COMMANDS = new Set(['doctor', 'probe', 'run', 'cleanup', 'self-test']);
const SECRET_KEY_PATTERN = /(api[_-]?key|token|cookie|password|passwd|secret|authorization|bearer|set-cookie|client[_-]?secret)/i;
const SECRET_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(Authorization\s*[:=]\s*)[^\s\r\n]+/gi,
  /(API[_-]?KEY\s*[:=]\s*)[^\s\r\n]+/gi,
  /(TOKEN\s*[:=]\s*)[^\s\r\n]+/gi,
  /(COOKIE\s*[:=]\s*)[^\r\n]+/gi,
  /(PASSWORD\s*[:=]\s*)[^\s\r\n]+/gi,
];

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq >= 0) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[index + 1];
        if (next && !next.startsWith('-')) {
          out[key] = next;
          index += 1;
        } else {
          out[key] = true;
        }
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function json(value, status) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  return status || 0;
}

function ok(command, data, warnings) {
  return json({ ok: true, command, data: data || {}, warnings: warnings || [] });
}

function fail(command, code, message, detail, status) {
  const error = { code, message };
  if (detail !== undefined) error.detail = redact(detail);
  return json({ ok: false, command, error }, status || 1);
}

function redactString(value) {
  let out = String(value);
  for (const pattern of SECRET_VALUE_PATTERNS) {
    out = out.replace(pattern, (_match, prefix) => `${prefix || ''}[REDACTED]`);
  }
  return out;
}

function redact(value, key) {
  if (key && SECRET_KEY_PATTERN.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(item => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)]));
  }
  return value;
}

function redactArgs(args) {
  const out = [];
  let redactNext = false;
  for (const arg of args || []) {
    const value = String(arg);
    if (redactNext) {
      out.push('[REDACTED]');
      redactNext = false;
      continue;
    }
    if (value.startsWith('--')) {
      const eq = value.indexOf('=');
      const key = eq >= 0 ? value.slice(0, eq) : value;
      if (SECRET_KEY_PATTERN.test(key)) {
        if (eq >= 0) out.push(`${value.slice(0, eq + 1)}[REDACTED]`);
        else {
          out.push(value);
          redactNext = true;
        }
        continue;
      }
    }
    out.push(redactString(value));
  }
  return out;
}

function help() {
  const text = [
    'i18n-workflow-cli',
    '',
    'Usage:',
    '  node scripts/i18n-workflow-cli.cjs --help',
    '  node scripts/i18n-workflow-cli.cjs doctor [--config PATH]',
    '  node scripts/i18n-workflow-cli.cjs probe [--config PATH]',
    '  node scripts/i18n-workflow-cli.cjs run [--config PATH] [--steps a,b] [--languages a,b] [--dry-run] [--execute] [--fail-on=error]',
    '  node scripts/i18n-workflow-cli.cjs cleanup <path> [path...]',
    '  node scripts/i18n-workflow-cli.cjs self-test',
    '',
    'Commands print JSON to stdout. Legacy tool output is captured in JSON fields.',
  ].join('\n');
  process.stdout.write(`${text}\n`);
  return 0;
}

function configArg(args) {
  return args.config ? [`--config=${path.resolve(args.config)}`] : [];
}

function loadConfigFor(command, args) {
  try {
    return { config: common.loadConfig(configArg(args)) };
  } catch (error) {
    return { error: fail(command, 'CONFIG_NOT_FOUND', error.message, undefined, 1) };
  }
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  return result.status === 0 || Boolean(result.stdout || result.stderr);
}

function doctor(args) {
  const loaded = loadConfigFor('doctor', args);
  if (loaded.error !== undefined) return loaded.error;
  const config = loaded.config;
  const warnings = [];
  const requiredScripts = [
    'run-i18n-workflow.cjs',
    'extract-hardcoded-text.cjs',
    'audit-i18n-assets.cjs',
    'generate-i18n-images.cjs',
    'extract-i18n-regeneration-jobs.cjs',
    'build-i18n-review-sheets.cjs',
    'image-ops.py',
  ];
  const scripts = Object.fromEntries(requiredScripts.map(name => [name, fs.existsSync(path.join(toolsDir, name))]));
  const checks = {
    node: commandExists('node'),
    skillRoot,
    toolsDirExists: fs.existsSync(toolsDir),
    projectRootExists: Boolean(config.projectRoot && fs.existsSync(config.projectRoot)),
    assetsRootExists: Boolean(config.assetsRoot && fs.existsSync(config.assetsRoot)),
    resourcesRootExists: Boolean(config.resourcesRoot && fs.existsSync(config.resourcesRoot)),
    reportDirectoryConfigured: Boolean(config.reportDirectory),
    supportedLanguages: Array.isArray(config.supportedLanguages) ? config.supportedLanguages : [],
    baselineLanguage: config.baselineLanguage || null,
    fallbackChain: Array.isArray(config.fallbackChain) ? config.fallbackChain : [],
    getLocales: typeof config.getLocales === 'function',
    getSpriteFrameMap: typeof config.getSpriteFrameMap === 'function',
    scripts,
  };
  if (!checks.node) warnings.push('node command was not detected');
  if (!checks.assetsRootExists) warnings.push('assetsRoot does not exist');
  if (!checks.resourcesRootExists) warnings.push('resourcesRoot does not exist');
  if (!checks.supportedLanguages.length) warnings.push('supportedLanguages is empty');
  if (!checks.baselineLanguage) warnings.push('baselineLanguage is not configured');
  if (!checks.fallbackChain.length) warnings.push('fallbackChain is empty');
  for (const [name, exists] of Object.entries(scripts)) {
    if (!exists) warnings.push(`missing legacy tool: ${name}`);
  }
  return ok('doctor', { checks }, warnings);
}

function probe(args) {
  const loaded = loadConfigFor('probe', args);
  if (loaded.error !== undefined) return loaded.error;
  const config = loaded.config;
  const warnings = [];
  const reportDirectory = config.reportDirectory;
  let reportDirectoryWritable = false;
  if (reportDirectory) {
    try {
      fs.mkdirSync(reportDirectory, { recursive: true });
      const probeFile = path.join(reportDirectory, `.i18n-workflow-probe-${Date.now()}.tmp`);
      fs.writeFileSync(probeFile, 'probe');
      fs.rmSync(probeFile, { force: true });
      reportDirectoryWritable = true;
    } catch (error) {
      warnings.push(`reportDirectory is not writable: ${error.message}`);
    }
  }

  let localeLanguages = [];
  try {
    const locales = typeof config.getLocales === 'function' ? config.getLocales() : {};
    localeLanguages = Object.keys(locales || {});
  } catch (error) {
    warnings.push(`getLocales failed: ${error.message}`);
  }

  return ok('probe', {
    reportDirectory,
    reportDirectoryWritable,
    localeLanguages,
    hasApiEnvironment: Boolean(process.env.BASE_URL && process.env.API_KEY),
    uvAvailable: commandExists('uv'),
  }, warnings);
}

function run(args, rawArgs) {
  const loaded = loadConfigFor('run', args);
  if (loaded.error !== undefined) return loaded.error;

  const passThrough = [];
  for (const [key, value] of Object.entries(args)) {
    if (key === '_' || key === 'execute') continue;
    if (key === 'config') {
      passThrough.push(`--config=${path.resolve(String(value))}`);
      continue;
    }
    if (value === true) passThrough.push(`--${key}`);
    else passThrough.push(`--${key}=${value}`);
  }
  if (args.execute) passThrough.push('--execute');
  const script = path.join(toolsDir, 'run-i18n-workflow.cjs');
  const result = spawnSync(process.execPath, [script, ...passThrough], {
    cwd: loaded.config.projectRoot || process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  const data = {
    script,
    args: redactArgs(rawArgs),
    exitCode: result.status,
    stdout: redactString(result.stdout || ''),
    stderr: redactString(result.stderr || ''),
  };
  if (result.status === 0) return ok('run', data, []);
  return fail('run', 'WORKFLOW_FAILED', 'i18n workflow command failed', data, result.status || 1);
}

function cleanup(args) {
  const targets = args._.slice(1);
  if (!targets.length) return fail('cleanup', 'MISSING_TARGET', 'cleanup requires at least one path', undefined, 1);
  const removed = [];
  const refused = [];
  const cwd = process.cwd();
  const home = os.homedir();
  for (const target of targets) {
    const absolute = path.resolve(target);
    const parsed = path.parse(absolute);
    if (absolute === parsed.root || absolute === cwd || absolute === home) {
      refused.push({ path: target, reason: 'unsafe_root_or_workspace' });
      continue;
    }
    try {
      if (fs.existsSync(absolute)) {
        fs.rmSync(absolute, { recursive: true, force: true });
        removed.push(target);
      } else {
        removed.push(target);
      }
    } catch (error) {
      refused.push({ path: target, reason: error.message });
    }
  }
  if (refused.length) return fail('cleanup', 'CLEANUP_REFUSED', 'one or more cleanup targets were refused', { removed, refused }, 1);
  return ok('cleanup', { removed }, []);
}

function selfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-workflow-self-test-'));
  try {
    const projectRoot = path.join(tempRoot, 'project');
    const assetsRoot = path.join(projectRoot, 'assets');
    const resourcesRoot = path.join(assetsRoot, 'resources');
    const reportDirectory = path.join(projectRoot, 'tools', 'reports');
    fs.mkdirSync(resourcesRoot, { recursive: true });
    fs.mkdirSync(reportDirectory, { recursive: true });
    const configPath = path.join(tempRoot, 'i18n-workflow.config.cjs');
    fs.writeFileSync(configPath, [
      'const path = require("path");',
      `const projectRoot = ${JSON.stringify(projectRoot)};`,
      'module.exports = {',
      '  supportedLanguages: ["zh"],',
      '  baselineLanguage: "zh",',
      '  fallbackChain: ["zh"],',
      '  runtimeLanguageDetector: "self-test",',
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
    const doctorResult = spawnSync(process.execPath, [__filename, 'doctor', '--config', configPath], { encoding: 'utf8' });
    const probeResult = spawnSync(process.execPath, [__filename, 'probe', '--config', configPath], { encoding: 'utf8' });
    const cleanupTarget = path.join(tempRoot, 'cleanup-target.txt');
    fs.writeFileSync(cleanupTarget, 'x');
    const cleanupResult = spawnSync(process.execPath, [__filename, 'cleanup', cleanupTarget], { encoding: 'utf8' });
    const checks = {
      doctor: doctorResult.status === 0 && JSON.parse(doctorResult.stdout).ok === true,
      probe: probeResult.status === 0 && JSON.parse(probeResult.stdout).ok === true,
      cleanup: cleanupResult.status === 0 && !fs.existsSync(cleanupTarget),
    };
    const allPass = Object.values(checks).every(Boolean);
    if (!allPass) return fail('self-test', 'SELF_TEST_FAILED', 'one or more self-test checks failed', { checks }, 1);
    return ok('self-test', { checks }, []);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (!rawArgs.length || rawArgs.includes('--help') || rawArgs.includes('-h')) return help();
  const args = parseArgs(rawArgs);
  const command = args._[0];
  if (!COMMANDS.has(command)) return fail(command || 'unknown', 'UNKNOWN_COMMAND', `unknown command: ${command || '(none)'}`, undefined, 1);
  if (command === 'doctor') return doctor(args);
  if (command === 'probe') return probe(args);
  if (command === 'run') return run(args, rawArgs);
  if (command === 'cleanup') return cleanup(args);
  if (command === 'self-test') return selfTest();
  return fail(command, 'UNREACHABLE', 'unreachable command dispatch', undefined, 1);
}

process.exitCode = main();
