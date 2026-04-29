#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const { loadConfig, parseLanguagesArg } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const languages = parseLanguagesArg(process.argv.slice(2), config);

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function stepsArg() {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--steps=')) return arg.slice('--steps='.length).split(',');
  }
  return ['extract', 'audit', 'generate', 'quality', 'compare', 'jobs', 'review'];
}

const steps = new Set(stepsArg());
const dryRun = hasFlag('--dry-run');
const configArg = process.argv.slice(2).find(a => a.startsWith('--config=')) || '';
const configFlag = configArg || '';
const langFlag = `--languages=${languages.join(',')}`;
const skillToolsDir = __dirname;

function skillTool(name) {
  return JSON.stringify(path.join(skillToolsDir, name));
}

function projectTool(name) {
  return JSON.stringify(path.join(config.projectRoot, name));
}

function run(label, cmd) {
  console.log(`\n=== ${label} ===`);
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: config.projectRoot, stdio: 'inherit' });
  } catch (e) {
    console.error(`Step "${label}" failed (exit ${e.status}).`);
    if (hasFlag('--fail-on=error')) process.exit(e.status || 1);
  }
}

console.log(`i18n workflow: languages=${languages.join(',')}, baseline=${config.baselineLanguage}, fallback=${config.fallbackChain.join(',')}`);
if (dryRun) console.log('(dry-run mode)');

if (steps.has('extract')) {
  run('Hardcoded Text Extraction', `node ${skillTool('extract-hardcoded-text.cjs')} ${configFlag}`);
}

if (steps.has('audit')) {
  run('Resource Audit', `node ${skillTool('audit-i18n-assets.cjs')} ${configFlag}`);
}

if (steps.has('generate')) {
  const extra = dryRun ? '' : ' --generate --execute';
  run('Image Generation', `node ${skillTool('generate-i18n-images.cjs')} ${configFlag}${extra}`);
}

if (steps.has('jobs')) {
  run('Regeneration Jobs', `node ${skillTool('extract-i18n-regeneration-jobs.cjs')} ${configFlag} ${langFlag}`);
}

if (steps.has('review')) {
  run('Review Sheets', `node ${skillTool('build-i18n-review-sheets.cjs')} ${configFlag} ${langFlag}`);
}

console.log('\n=== Workflow complete ===');
