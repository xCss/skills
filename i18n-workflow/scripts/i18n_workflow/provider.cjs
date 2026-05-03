const fs = require('fs');
const os = require('os');
const path = require('path');

function codexHomeCandidates(env = process.env) {
  if (env.CODEX_HOME) return [path.resolve(env.CODEX_HOME)];
  return [path.join(os.homedir(), '.codex')];
}

function stripInlineComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== '\\') {
      quote = quote === char ? null : quote || char;
    }
    if (char === '#' && !quote) return line.slice(0, index);
  }
  return line;
}

function parseTomlString(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed[trimmed.length - 1] && ['"', "'"].includes(trimmed[0])) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readCodexConfigProvider(env = process.env) {
  for (const codexHome of codexHomeCandidates(env)) {
    const configPath = path.join(codexHome, 'config.toml');
    const authPath = path.join(codexHome, 'auth.json');
    if (!fs.existsSync(configPath)) continue;
    let activeProvider = '';
    let section = null;
    const providers = {};
    for (const rawLine of fs.readFileSync(configPath, 'utf8').split(/\r?\n/)) {
      const line = stripInlineComment(rawLine).trim();
      if (!line) continue;
      if (line.startsWith('[') && line.endsWith(']')) {
        section = line.slice(1, -1);
        continue;
      }
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = parseTomlString(line.slice(eq + 1));
      if (!section && key === 'model_provider') {
        activeProvider = value;
      } else if (section && section.startsWith('model_providers.')) {
        const providerName = section.slice('model_providers.'.length);
        providers[providerName] = providers[providerName] || {};
        providers[providerName][key] = value;
      }
    }
    const provider = providers[activeProvider] || providers.OpenAI || {};
    let apiKey = '';
    if (fs.existsSync(authPath)) {
      try {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        apiKey = auth.OPENAI_API_KEY || auth.api_key || '';
      } catch {
        apiKey = '';
      }
    }
    if (provider.base_url || apiKey) {
      return { baseUrl: provider.base_url || '', apiKey, source: 'codex-config' };
    }
  }
  return { baseUrl: '', apiKey: '', source: '' };
}

function resolveResponsesProvider(options = {}, env = process.env) {
  const prefix = options.prefix || '';
  const explicitBaseUrl = options.baseUrl || '';
  const explicitApiKey = options.apiKey || '';
  const specificBaseUrl = prefix ? env[`${prefix}_BASE_URL`] || '' : '';
  const specificApiKey = prefix ? env[`${prefix}_API_KEY`] || '' : '';
  const sharedBaseUrl = env.BASE_URL || '';
  const sharedApiKey = env.API_KEY || '';
  let codexProvider = { baseUrl: '', apiKey: '', source: '' };
  if (!(explicitBaseUrl || specificBaseUrl || sharedBaseUrl) || !(explicitApiKey || specificApiKey || sharedApiKey)) {
    codexProvider = readCodexConfigProvider(env);
  }
  const baseUrl = explicitBaseUrl || specificBaseUrl || sharedBaseUrl || codexProvider.baseUrl;
  const apiKey = explicitApiKey || specificApiKey || sharedApiKey || codexProvider.apiKey;
  const baseSource = explicitBaseUrl ? 'args' : specificBaseUrl ? 'specific-environment' : sharedBaseUrl ? 'environment' : codexProvider.baseUrl ? 'codex-config' : 'none';
  const apiSource = explicitApiKey ? 'args' : specificApiKey ? 'specific-environment' : sharedApiKey ? 'environment' : codexProvider.apiKey ? 'codex-config' : 'none';
  const source = baseSource === apiSource ? baseSource : 'mixed';
  return {
    baseUrl,
    apiKey,
    model: options.model || '',
    source,
    hasBaseUrl: Boolean(baseUrl),
    hasApiKey: Boolean(apiKey),
  };
}

function responsesEndpoint(baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  return base.endsWith('/responses') ? base : `${base}/responses`;
}

module.exports = {
  resolveResponsesProvider,
  responsesEndpoint,
  readCodexConfigProvider,
};
