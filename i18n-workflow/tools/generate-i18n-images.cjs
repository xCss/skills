#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { loadConfig, targetLanguages: deriveTargetLanguages } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const projectRoot = config.projectRoot;
const reportPath = path.join(config.reportDirectory, 'i18n-asset-audit.json');
const manifestPath = path.join(config.reportDirectory, 'i18n-image-manifest.json');
const resourcesRoot = config.resourcesRoot;
const targetLanguages = deriveTargetLanguages(config);

const knownNonTextPatterns = [
  /GamePrivacy\/(block|btn\d*)\.png$/,
  /GameFree\/(tl|free_item|!)\.png$/,
  /GameHome\/tili_\d+\.png$/,
  /GamePhysicalRoom\/(block_room|neng)\.png$/,
  /GameReceive\/(close|y|hand|bg\d*|\d+)\.png$/,
  /GameReceiveRoom\/close\.png$/,
  /GameSetupRoom\/block\.png$/,
  /GameSuccessRoom\/(huang_1|star)\.png$/,
  /GameLoadRoom\/(bg|pass\d+)\.png$/,
  /GameLoad\/8\+\.png$/,
  /GameMore\/(1|video_1)\.png$/,
];

const likelyTextPatterns = [
  /title/i,
  /text\d*/i,
  /desc/i,
  /ok/i,
  /next/i,
  /btn/i,
  /receive/i,
  /shezhi/i,
  /未授权/,
  /隐私/,
  /logo/i,
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function rel(filePath) {
  return toPosix(path.relative(projectRoot, filePath));
}

function parseArgs(argv) {
  const args = {
    classify: false,
    generate: false,
    execute: false,
    force: false,
    limit: Infinity,
    only: null,
    applyTranslations: null,
    concurrency: 10,
  };
  for (const arg of argv) {
    if (arg === '--classify') args.classify = true;
    else if (arg === '--generate') args.generate = true;
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
    else if (arg.startsWith('--apply-translations=')) args.applyTranslations = arg.slice('--apply-translations='.length);
    else if (arg.startsWith('--write-template=')) args.writeTemplate = arg.slice('--write-template='.length);
    else if (arg.startsWith('--concurrency=')) args.concurrency = Math.min(10, Math.max(1, Number(arg.slice('--concurrency='.length)) || 10));
    else if (arg.startsWith('--config=')) args.config = arg.slice('--config='.length);
    else if (arg.startsWith('--languages=')) args.languages = arg.slice('--languages='.length).split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function targetPathFor(sourceResourcesPath, language) {
  return `i18n_text_sprites/${language}/${sourceResourcesPath}`;
}

function targetFilePath(resourcesPath) {
  return path.join(resourcesRoot, ...resourcesPath.split('/')) + '.png';
}

function targetFileExists(resourcesPath) {
  const base = path.join(resourcesRoot, ...resourcesPath.split('/'));
  return ['.png', '.jpg', '.jpeg', '.webp'].some(ext => fs.existsSync(base + ext));
}

function classifyCandidate(sourceImagePath) {
  if (knownNonTextPatterns.some(pattern => pattern.test(sourceImagePath))) return 'non_text';
  if (likelyTextPatterns.some(pattern => pattern.test(sourceImagePath))) return 'uncertain_text_candidate';
  return 'uncertain';
}

function normalizeSourceImagePath(imagePath) {
  const absolute = path.isAbsolute(imagePath) ? imagePath : path.join(projectRoot, imagePath);
  return rel(absolute);
}

function resourcesPathFromSourceImage(sourceImagePath) {
  const resourcesPrefix = `${toPosix(path.relative(projectRoot, resourcesRoot))}/`;
  return sourceImagePath.startsWith(resourcesPrefix)
    ? sourceImagePath.slice(resourcesPrefix.length).replace(/\.(png|jpg|jpeg|webp)$/i, '')
    : sourceImagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '');
}

function sourceFileSize(sourceImagePath) {
  const absolute = path.join(projectRoot, sourceImagePath);
  return fs.existsSync(absolute) ? fs.statSync(absolute).size : null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mergeConfigEnumeratedTextImages(manifest) {
  if (typeof config.enumerateSourceTextImages !== 'function') return manifest;

  for (const source of config.enumerateSourceTextImages() || []) {
    const sourceImagePath = normalizeSourceImagePath(source.imagePath);
    const sourceResourcesPath = source.resourcesPath || resourcesPathFromSourceImage(sourceImagePath);
    const key = source.spriteFrameUuid || sourceResourcesPath;
    const existing = manifest.candidates.find(candidate => (source.spriteFrameUuid && candidate.spriteFrameUuid === source.spriteFrameUuid)
      || candidate.sourceResourcesPath === sourceResourcesPath);
    const candidate = existing || {
      spriteFrameUuid: source.spriteFrameUuid || null,
      sourceImagePath,
      sourceResourcesPath,
      width: source.width,
      height: source.height,
      sourceBytes: source.sourceBytes || sourceFileSize(sourceImagePath),
      detectionStatus: (source.hasText === false) ? 'non_text' : 'text',
      embeddedText: source.embeddedText || null,
      semanticMeaning: source.semanticMeaning || null,
      generationHint: source.generationHint || null,
      renderMode: source.renderMode || null,
      renderOptions: source.renderOptions || null,
      textComposite: source.textComposite || null,
      preserveSourceAlpha: Boolean(source.preserveSourceAlpha),
      transparentEdgeBackground: Boolean(source.transparentEdgeBackground),
      targets: {},
      notes: [],
    };

    candidate.spriteFrameUuid = candidate.spriteFrameUuid || source.spriteFrameUuid || key;
    candidate.sourceImagePath = sourceImagePath;
    candidate.sourceResourcesPath = sourceResourcesPath;
    candidate.width = source.width || candidate.width;
    candidate.height = source.height || candidate.height;
    candidate.sourceBytes = source.sourceBytes || candidate.sourceBytes || sourceFileSize(sourceImagePath);
    if (source.hasText !== false) candidate.detectionStatus = 'text';
    candidate.embeddedText = source.embeddedText || candidate.embeddedText || null;
    candidate.semanticMeaning = source.semanticMeaning || candidate.semanticMeaning || null;
    candidate.generationHint = source.generationHint || candidate.generationHint || null;
    candidate.renderMode = source.renderMode || candidate.renderMode || null;
    candidate.renderOptions = source.renderOptions || candidate.renderOptions || null;
    candidate.textComposite = source.textComposite || candidate.textComposite || null;
    candidate.preserveSourceAlpha = Boolean(source.preserveSourceAlpha || candidate.preserveSourceAlpha);
    candidate.transparentEdgeBackground = Boolean(source.transparentEdgeBackground || candidate.transparentEdgeBackground);
    candidate.notes = candidate.notes || [];
    if (!candidate.notes.some(note => note.type === 'config_enumerated_text_image')) {
      candidate.notes.push({ at: new Date().toISOString(), type: 'config_enumerated_text_image' });
    }

    for (const language of targetLanguages) {
      const resourcesPath = targetPathFor(sourceResourcesPath, language);
      const exists = targetFileExists(resourcesPath);
      const proposedText = source.localizedText && source.localizedText[language] || null;
      const previous = candidate.targets[language] || {};
      candidate.targets[language] = {
        resourcesPath,
        exists,
        generationNeeded: source.hasText !== false && Boolean(proposedText) && !exists,
        proposedText: proposedText || previous.proposedText || null,
        generatedPath: previous.generatedPath || null,
        outputBytes: previous.outputBytes || null,
        status: source.hasText === false ? 'skipped_non_text' : (proposedText || previous.proposedText ? 'config_pending_generation' : 'manual_missing_translation'),
        generatedMetaPath: previous.generatedMetaPath || undefined,
        generatedSpriteFrameUuid: previous.generatedSpriteFrameUuid || undefined,
      };
    }

    if (!existing) manifest.candidates.push(candidate);
  }

  return manifest;
}

function buildManifestFromAudit() {
  if (!fs.existsSync(reportPath)) {
    throw new Error('Audit report is missing. Run tools/audit-i18n-assets.cjs first.');
  }

  const report = readJson(reportPath);
  const candidates = report.textImageCandidatesWithoutI18nMap.map(candidate => {
    const sourceResourcesPath = candidate.resourcesPath;
    const detectionStatus = classifyCandidate(candidate.sourceImagePath);
    const targets = {};
    for (const language of targetLanguages) {
      const resourcesPath = targetPathFor(sourceResourcesPath, language);
      const exists = targetFileExists(resourcesPath);
      targets[language] = {
        resourcesPath,
        exists,
        generationNeeded: detectionStatus !== 'non_text' && !exists,
        proposedText: null,
        generatedPath: null,
        outputBytes: null,
        status: detectionStatus === 'non_text' ? 'skipped_non_text' : 'pending_review',
      };
    }

    return {
      spriteFrameUuid: candidate.spriteFrameUuid,
      sourceImagePath: candidate.sourceImagePath,
      sourceResourcesPath,
      width: candidate.width,
      height: candidate.height,
      sourceBytes: candidate.fileSize,
      detectionStatus,
      embeddedText: null,
      semanticMeaning: null,
      targets,
      notes: [],
    };
  });

  return mergeConfigEnumeratedTextImages({
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    modelPlan: {
      classifier: process.env.I18N_CLASSIFY_MODEL || 'gpt-5.5',
      imageGenerator: process.env.I18N_IMAGE_MODEL || 'gpt-image-2',
      api: 'OpenAI Responses API via BASE_URL/API_KEY',
      instructions: [
        'Classify whether the source image contains embedded text that needs localization.',
        'Preserve original canvas width and height exactly for generated assets.',
        'Keep transparent/background style and button/title visual style consistent with source.',
        'Reject or recompress generated files that exceed the configured size limit.',
      ],
    },
    summary: summarize(candidates),
    candidates,
  });
}

function loadManifestOrBuild() {
  return fs.existsSync(manifestPath) ? mergeConfigEnumeratedTextImages(readJson(manifestPath)) : buildManifestFromAudit();
}

function summarize(candidates) {
  return {
    candidates: candidates.length,
    likelyNonText: candidates.filter(item => item.detectionStatus === 'non_text').length,
    needsReview: candidates.filter(item => item.detectionStatus !== 'non_text' && item.detectionStatus !== 'text').length,
    confirmedText: candidates.filter(item => item.detectionStatus === 'text').length,
    generationTargets: candidates.reduce((sum, item) => {
      return sum + targetLanguages.filter(language => item.targets[language].generationNeeded).length;
    }, 0),
  };
}

function saveManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  manifest.summary = summarize(manifest.candidates);
  writeJson(manifestPath, manifest);
}

function concurrencyLimit(args) {
  return Math.min(10, Math.max(1, Number(args.concurrency) || 10));
}

async function runConcurrentJobs(items, args, runJob) {
  let nextIndex = 0;
  const concurrency = concurrencyLimit(args);
  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await runJob(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

function getResponsesEndpoint() {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) throw new Error('BASE_URL is required for --execute.');
  return `${baseUrl.replace(/\/+$/, '')}/responses`;
}

function getApiKey() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY is required for --execute.');
  return apiKey;
}

function imageDataUrl(sourceImagePath) {
  const absolutePath = path.join(projectRoot, sourceImagePath);
  const ext = path.extname(sourceImagePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  const base64 = fs.readFileSync(absolutePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

function parseResponseText(text) {
  if (!text.startsWith('event:') && !text.startsWith('data:')) return JSON.parse(text);
  const dataLines = text
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trim())
    .filter(line => line && line !== '[DONE]');
  for (let index = dataLines.length - 1; index >= 0; index--) {
    const parsed = JSON.parse(dataLines[index]);
    if (parsed.response) return parsed.response;
    if (parsed.type === 'response.completed' && parsed.response) return parsed.response;
    if (parsed.output || parsed.output_text || parsed.result || parsed.image_base64 || parsed.b64_json) return parsed;
  }
  throw new Error(`No JSON response payload found in event stream: ${text.slice(0, 500)}`);
}

async function responsesCreate(body) {
  const response = await fetch(getResponsesEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Responses API failed ${response.status}: ${text.slice(0, 1000)}`);
  }
  return parseResponseText(text);
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text);
      if (typeof content.output_text === 'string') parts.push(content.output_text);
    }
  }
  return parts.join('\n').trim();
}

function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`No JSON object found in model output: ${text.slice(0, 500)}`);
  return JSON.parse(raw.slice(start, end + 1));
}

function extractImageBase64(response) {
  const candidates = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.result === 'string' && /^[A-Za-z0-9+/=]+$/.test(value.result.slice(0, 80))) candidates.push(value.result);
    if (typeof value.image_base64 === 'string') candidates.push(value.image_base64);
    if (typeof value.b64_json === 'string') candidates.push(value.b64_json);
    if (typeof value.url === 'string' && value.url.startsWith('data:image/')) candidates.push(value.url.split(',')[1]);
    for (const nested of Object.values(value)) {
      if (Array.isArray(nested)) nested.forEach(visit);
      else if (nested && typeof nested === 'object') visit(nested);
    }
  }
  visit(response);
  return candidates.find(Boolean) || null;
}

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function resizePngWithUv(buffer, width, height) {
  const tempDir = path.join(projectRoot, 'tools', 'reports', '.tmp-i18n-images');
  fs.mkdirSync(tempDir, { recursive: true });
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputPath = path.join(tempDir, `${token}-input.png`);
  const outputPath = path.join(tempDir, `${token}-output.png`);
  fs.writeFileSync(inputPath, buffer);

  const script = [
    'from PIL import Image',
    'import sys',
    'src, dst, width, height = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])',
    'img = Image.open(src).convert("RGBA")',
    'img.thumbnail((width, height), Image.Resampling.LANCZOS)',
    'canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))',
    'x = (width - img.width) // 2',
    'y = (height - img.height) // 2',
    'canvas.alpha_composite(img, (x, y))',
    'canvas.save(dst, optimize=True)',
  ].join('\n');

  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', script, inputPath, outputPath, String(width), String(height)], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`uv/Pillow resize failed: ${(result.stderr || result.stdout || '').slice(0, 1000)}`);
  }

  const resized = fs.readFileSync(outputPath);
  fs.rmSync(inputPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  return resized;
}

function normalizeGeneratedPng(buffer, candidate) {
  const dimensions = pngDimensions(buffer);
  if (!dimensions) throw new Error('Generated image is not a PNG.');
  if (dimensions.width === candidate.width && dimensions.height === candidate.height) return buffer;
  return resizePngWithUv(buffer, candidate.width, candidate.height);
}

function preserveSourceAlphaWithUv(buffer, candidate) {
  const sourcePath = path.join(projectRoot, candidate.sourceImagePath);
  const tempDir = path.join(projectRoot, 'tools', 'reports', '.tmp-i18n-images');
  fs.mkdirSync(tempDir, { recursive: true });
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const generatedPath = path.join(tempDir, `${token}-generated.png`);
  const outputPath = path.join(tempDir, `${token}-alpha.png`);
  fs.writeFileSync(generatedPath, buffer);

  const script = [
    'from PIL import Image',
    'import sys',
    'src_path, gen_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]',
    'src = Image.open(src_path).convert("RGBA")',
    'gen = Image.open(gen_path).convert("RGBA")',
    'if src.size != gen.size:',
    '    src = src.resize(gen.size, Image.Resampling.LANCZOS)',
    'src_alpha = src.getchannel("A")',
    'r, g, b, _ = gen.split()',
    'out = Image.merge("RGBA", (r, g, b, src_alpha))',
    'out.save(out_path, optimize=True)',
  ].join('\n');

  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', script, sourcePath, generatedPath, outputPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`uv/Pillow alpha preservation failed: ${(result.stderr || result.stdout || '').slice(0, 1000)}`);
  }

  const output = fs.readFileSync(outputPath);
  fs.rmSync(generatedPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  return output;
}

function removeEdgeBackgroundWithUv(buffer) {
  const tempDir = path.join(projectRoot, 'tools', 'reports', '.tmp-i18n-images');
  fs.mkdirSync(tempDir, { recursive: true });
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputPath = path.join(tempDir, `${token}-edge-input.png`);
  const outputPath = path.join(tempDir, `${token}-edge-output.png`);
  fs.writeFileSync(inputPath, buffer);

  const script = [
    'from PIL import Image',
    'from collections import deque',
    'import sys',
    'src, dst = sys.argv[1], sys.argv[2]',
    'img = Image.open(src).convert("RGBA")',
    'px = img.load()',
    'w, h = img.size',
    'corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]',
    'threshold = 58',
    'def close_to_corner(c):',
    '    if c[3] <= 8:',
    '        return True',
    '    return min(abs(c[0]-b[0]) + abs(c[1]-b[1]) + abs(c[2]-b[2]) for b in corners) <= threshold',
    'q = deque()',
    'seen = set()',
    'def add(x, y):',
    '    if x < 0 or y < 0 or x >= w or y >= h or (x, y) in seen:',
    '        return',
    '    if close_to_corner(px[x, y]):',
    '        seen.add((x, y))',
    '        q.append((x, y))',
    'for x in range(w):',
    '    add(x, 0); add(x, h - 1)',
    'for y in range(h):',
    '    add(0, y); add(w - 1, y)',
    'while q:',
    '    x, y = q.popleft()',
    '    r, g, b, a = px[x, y]',
    '    px[x, y] = (r, g, b, 0)',
    '    add(x + 1, y); add(x - 1, y); add(x, y + 1); add(x, y - 1)',
    'for y in range(h):',
    '    for x in range(w):',
    '        r, g, b, a = px[x, y]',
    '        if a > 0 and min(r, g, b) >= 232 and max(r, g, b) - min(r, g, b) <= 28:',
    '            px[x, y] = (r, g, b, 0)',
    'seeds = set()',
    'for y in range(h):',
    '    for x in range(w):',
    '        r, g, b, a = px[x, y]',
    '        if a <= 8:',
    '            continue',
    '        lum = (r * 299 + g * 587 + b * 114) / 1000',
    '        is_dark_text = lum < 132',
    '        is_yellow_text = r >= 135 and g >= 85 and b <= 135 and r + 45 >= g',
    '        if is_dark_text or is_yellow_text:',
    '            seeds.add((x, y))',
    'keep = set()',
    'for x, y in seeds:',
    '    for yy in range(max(0, y - 2), min(h, y + 3)):',
    '        for xx in range(max(0, x - 2), min(w, x + 3)):',
    '            keep.add((xx, yy))',
    'for y in range(h):',
    '    for x in range(w):',
    '        if (x, y) not in keep:',
    '            r, g, b, a = px[x, y]',
    '            if a > 0:',
    '                px[x, y] = (r, g, b, 0)',
    'img.save(dst, optimize=True)',
  ].join('\n');

  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', script, inputPath, outputPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`uv/Pillow edge background removal failed: ${(result.stderr || result.stdout || '').slice(0, 1000)}`);
  }

  const output = fs.readFileSync(outputPath);
  fs.rmSync(inputPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  return output;
}

function compositeGeneratedTextWithSource(buffer, candidate) {
  const sourcePath = path.join(projectRoot, candidate.sourceImagePath);
  const tempDir = path.join(projectRoot, 'tools', 'reports', '.tmp-i18n-images');
  fs.mkdirSync(tempDir, { recursive: true });
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const generatedPath = path.join(tempDir, `${token}-composite-generated.png`);
  const outputPath = path.join(tempDir, `${token}-composite-output.png`);
  const specPath = path.join(tempDir, `${token}-composite-spec.json`);
  fs.writeFileSync(generatedPath, buffer);
  fs.writeFileSync(specPath, `${JSON.stringify(candidate.textComposite || {}, null, 2)}\n`);

  const script = [
    'from PIL import Image',
    'import json, sys',
    'source_path, generated_path, spec_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]',
    'opt = json.load(open(spec_path, encoding="utf-8"))',
    'src = Image.open(source_path).convert("RGBA")',
    'gen = Image.open(generated_path).convert("RGBA")',
    'if gen.size != src.size:',
    '    gen = gen.resize(src.size, Image.Resampling.LANCZOS)',
    'base = src.copy()',
    'px = base.load()',
    'src_px = src.load()',
    'gen_px = gen.load()',
    'def clear_rect_from_neighbors(rect):',
    '    x, y, w, h = [int(v) for v in rect]',
    '    x2, y2 = min(base.width - 1, x + w), min(base.height - 1, y + h)',
    '    lx, rx = max(0, x - 8), min(base.width - 1, x2 + 8)',
    '    for yy in range(max(0, y), min(base.height, y2 + 1)):',
    '        left = src_px[lx, yy]',
    '        right = src_px[rx, yy]',
    '        span = max(1, x2 - x)',
    '        for xx in range(max(0, x), min(base.width, x2 + 1)):',
    '            t = (xx - x) / span',
    '            px[xx, yy] = tuple(int(round(left[i] * (1 - t) + right[i] * t)) for i in range(4))',
    'def is_text_pixel(c):',
    '    r, g, b, a = c',
    '    if a <= 16:',
    '        return False',
    '    lum = (0.299 * r) + (0.587 * g) + (0.114 * b)',
    '    chroma = max(r, g, b) - min(r, g, b)',
    '    return lum <= opt.get("darkLum", 105) or (lum >= opt.get("lightLum", 155) and chroma <= opt.get("lightChroma", 110))',
    'for rect in opt.get("clearRects", []) or ([opt["clearRect"]] if opt.get("clearRect") else []):',
    '    clear_rect_from_neighbors(rect)',
    'for rect in opt.get("textRects", []) or ([opt["textRect"]] if opt.get("textRect") else []):',
    '    x, y, w, h = [int(v) for v in rect]',
    '    for yy in range(max(0, y), min(base.height, y + h + 1)):',
    '        for xx in range(max(0, x), min(base.width, x + w + 1)):',
    '            if src_px[xx, yy][3] <= 8:',
    '                continue',
    '            gp = gen_px[xx, yy]',
    '            if is_text_pixel(gp):',
    '                px[xx, yy] = gp',
    'base.putalpha(src.getchannel("A"))',
    'base.save(output_path, optimize=True)',
  ].join('\n');

  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', script, sourcePath, generatedPath, specPath, outputPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`uv/Pillow text compositing failed: ${(result.stderr || result.stdout || '').slice(0, 1000)}`);
  }

  const output = fs.readFileSync(outputPath);
  fs.rmSync(generatedPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  fs.rmSync(specPath, { force: true });
  return output;
}

function renderWithWorkflowRenderer(candidate, language, text) {
  const tempDir = path.join(projectRoot, 'tools', 'reports', '.tmp-i18n-images');
  fs.mkdirSync(tempDir, { recursive: true });
  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const specPath = path.join(tempDir, `${token}-render-spec.json`);
  const outputPath = path.join(tempDir, `${token}-render-output.png`);
  const spec = {
    mode: candidate.renderMode,
    sourcePath: path.join(projectRoot, candidate.sourceImagePath),
    width: candidate.width,
    height: candidate.height,
    language,
    text,
    options: candidate.renderOptions || {},
  };
  fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);

  const script = [
    'from PIL import Image, ImageDraw, ImageFont',
    'import json, sys, os, math',
    'spec = json.load(open(sys.argv[1], encoding="utf-8"))',
    'out_path = sys.argv[2]',
    'opt = spec.get("options") or {}',
    'def rgba(value, default):',
    '    value = value if value is not None else default',
    '    if isinstance(value, str):',
    '        value = value.lstrip("#")',
    '        if len(value) == 6:',
    '            return tuple(int(value[i:i+2], 16) for i in (0, 2, 4)) + (255,)',
    '        if len(value) == 8:',
    '            return tuple(int(value[i:i+2], 16) for i in (0, 2, 4, 6))',
    '    return tuple(value)',
    'def font(size):',
    '    candidates = opt.get("fontPaths") or [',
    '        "C:/Windows/Fonts/arialbd.ttf",',
    '        "C:/Windows/Fonts/Arialbd.ttf",',
    '        "C:/Windows/Fonts/segoeuib.ttf",',
    '        "C:/Windows/Fonts/arial.ttf",',
    '    ]',
    '    for p in candidates:',
    '        if os.path.exists(p):',
    '            return ImageFont.truetype(p, size=size)',
    '    return ImageFont.load_default()',
    'direction = "rtl" if spec.get("language") == "ar" else None',
    'language = spec.get("language")',
    'def text_bbox(draw, xy, text, font, stroke):',
    '    try:',
    '        return draw.textbbox(xy, text, font=font, stroke_width=stroke, direction=direction, language=language)',
    '    except Exception:',
    '        return draw.textbbox(xy, text, font=font, stroke_width=stroke)',
    'def draw_text(draw, xy, text, font, fill, stroke, stroke_fill):',
    '    try:',
    '        draw.text(xy, text, font=font, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill, direction=direction, language=language)',
    '    except Exception:',
    '        draw.text(xy, text, font=font, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)',
    'if spec.get("language") == "ar":',
    '    try:',
    '        import arabic_reshaper',
    '        from bidi.algorithm import get_display',
    '        spec["text"] = get_display(arabic_reshaper.reshape(spec["text"]))',
    '        direction = None',
    '    except Exception:',
    '        pass',
    'def fit_font(draw, text, rect, start, stroke):',
    '    x, y, w, h = rect',
    '    for size in range(int(start), 9, -1):',
    '        f = font(size)',
    '        box = text_bbox(draw, (0, 0), text, f, stroke)',
    '        if box[2] - box[0] <= w and box[3] - box[1] <= h:',
    '            return f',
    '    return font(10)',
    'def draw_centered(draw, text, rect):',
    '    stroke = int(opt.get("strokeWidth", 0))',
    '    f = fit_font(draw, text, rect, opt.get("fontSize", min(spec["height"], 40)), stroke)',
    '    box = text_bbox(draw, (0, 0), text, f, stroke)',
    '    tw, th = box[2] - box[0], box[3] - box[1]',
    '    x = rect[0] + (rect[2] - tw) / 2 - box[0]',
    '    y = rect[1] + (rect[3] - th) / 2 - box[1]',
    '    shadow = opt.get("shadow")',
    '    if shadow:',
    '        sx, sy = opt.get("shadowOffset", [2, 3])',
    '        draw_text(draw, (x + sx, y + sy), text, f, rgba(shadow, [0,0,0,90]), stroke, rgba(opt.get("shadowStroke"), shadow))',
    '    draw_text(draw, (x, y), text, f, rgba(opt.get("fill"), [255,255,255,255]), stroke, rgba(opt.get("stroke"), [0,0,0,255]))',
    'def clear_rect_from_neighbors(img, rect):',
    '    px = img.load()',
    '    x, y, w, h = [int(v) for v in rect]',
    '    x2, y2 = min(img.width - 1, x + w), min(img.height - 1, y + h)',
    '    lx, rx = max(0, x - 8), min(img.width - 1, x2 + 8)',
    '    for yy in range(max(0, y), min(img.height, y2 + 1)):',
    '        left = px[lx, yy]',
    '        right = px[rx, yy]',
    '        span = max(1, x2 - x)',
    '        for xx in range(max(0, x), min(img.width, x2 + 1)):',
    '            t = (xx - x) / span',
    '            px[xx, yy] = tuple(int(round(left[i] * (1 - t) + right[i] * t)) for i in range(4))',
    'mode = spec.get("mode")',
    'if mode == "button-template":',
    '    img = Image.open(spec["sourcePath"]).convert("RGBA")',
    '    if opt.get("clearRect"):',
    '        clear_rect_from_neighbors(img, opt["clearRect"])',
    'else:',
    '    img = Image.new("RGBA", (int(spec["width"]), int(spec["height"])), (0,0,0,0))',
    'draw = ImageDraw.Draw(img)',
    'rect = opt.get("textRect") or [0, 0, img.width, img.height]',
    'draw_centered(draw, spec["text"], rect)',
    'img.save(out_path, optimize=True)',
  ].join('\n');

  const result = spawnSync('uv', ['run', '--with', 'pillow', '--with', 'arabic-reshaper', '--with', 'python-bidi', 'python', '-c', script, specPath, outputPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`workflow local renderer failed: ${(result.stderr || result.stdout || '').slice(0, 1000)}`);
  }

  const output = fs.readFileSync(outputPath);
  fs.rmSync(specPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  return output;
}

function outputSizeLimit(candidate) {
  const absoluteCap = Number(process.env.I18N_MAX_IMAGE_BYTES || 262144);
  const minimumCap = Number(process.env.I18N_MIN_IMAGE_BYTES || 32768);
  const relativeCap = Math.ceil((candidate.sourceBytes || 0) * Number(process.env.I18N_SIZE_MULTIPLIER || 1.25));
  return Math.min(Math.max(relativeCap, minimumCap), absoluteCap);
}

function createCocosTextureMeta(imagePath, width, height) {
  const parsed = path.parse(imagePath);
  const uuid = crypto.randomUUID();
  const spriteUuid = crypto.randomUUID();
  const meta = {
    ver: '2.3.7',
    uuid,
    importer: 'texture',
    type: 'sprite',
    wrapMode: 'clamp',
    filterMode: 'bilinear',
    premultiplyAlpha: false,
    genMipmaps: false,
    packable: true,
    width,
    height,
    platformSettings: {},
    subMetas: {
      [parsed.name]: {
        ver: '1.0.6',
        uuid: spriteUuid,
        importer: 'sprite-frame',
        rawTextureUuid: uuid,
        trimType: 'auto',
        trimThreshold: 1,
        rotated: false,
        offsetX: 0,
        offsetY: 0,
        trimX: 0,
        trimY: 0,
        width,
        height,
        rawWidth: width,
        rawHeight: height,
        borderTop: 0,
        borderBottom: 0,
        borderLeft: 0,
        borderRight: 0,
        subMetas: {},
      },
    },
  };
  const metaPath = `${imagePath}.meta`;
  if (!fs.existsSync(metaPath)) writeJson(metaPath, meta);
  return { metaPath, spriteUuid };
}

function localizedTextTemplate() {
  return Object.fromEntries(targetLanguages.map(language => [language, 'string|null']));
}

function emptyLocalizedText() {
  return Object.fromEntries(targetLanguages.map(language => [language, null]));
}

async function classifyWithModel(candidate) {
  const responseShape = {
    hasText: 'boolean',
    embeddedText: 'string|null',
    semanticMeaning: 'string',
    localizedText: localizedTextTemplate(),
    confidence: '0-1',
    reason: 'string',
  };
  const prompt = [
    'You are auditing a Cocos Creator UI image for game localization.',
    'Return only JSON with this shape:',
    JSON.stringify(responseShape),
    `localizedText must include exactly these target language keys: ${targetLanguages.join(', ') || '(none)'}.`,
    'If the image is decorative or an icon without text, hasText must be false and localizedText values must be null.',
    'Keep localized UI copy concise enough to fit the same canvas.',
    `Source path: ${candidate.sourceImagePath}`,
    `Canvas: ${candidate.width}x${candidate.height}`,
  ].join('\n');

  const response = await responsesCreate({
    model: process.env.I18N_CLASSIFY_MODEL || 'gpt-5.5',
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl(candidate.sourceImagePath) },
      ],
    }],
  });
  return extractJsonObject(extractOutputText(response));
}

function generationGuidance(candidate, language) {
  const jobsPath = path.join(projectRoot, 'tools', 'reports', 'i18n-regenerate-quality-jobs.json');
  if (!fs.existsSync(jobsPath)) return null;
  const jobs = readJson(jobsPath);
  const job = jobs.find(item => item.uuid === candidate.spriteFrameUuid && item.language === language);
  if (!job) return null;
  return [
    `Previous quality audit problem: ${job.auditProblem || job.problem || 'target did not match source scale'}`,
    `Required correction: ${job.auditSuggestion || 'match the Chinese source text size, placement, and style more closely'}`,
  ].join('\n');
}

async function generateWithModel(candidate, language, text) {
  const extraGuidance = generationGuidance(candidate, language);
  const prompt = [
    `Create a ${language} localized replacement for this Cocos Creator UI image.`,
    `Use this exact text: ${text}`,
    `Output a PNG with exactly ${candidate.width}x${candidate.height} pixels.`,
    'Use the source image as the visual specification. Match the source canvas size, text bounding box, font weight, stroke/outline thickness, shadow, alignment, padding, and overall text scale.',
    'Remove the original Chinese text before drawing the localized text, but keep the same non-text background, button, ribbon, glow, and transparent areas.',
    'The localized text should be about the same visual height as the Chinese text in the source image. Do not make it smaller just because the translated phrase is longer.',
    'If the translation is longer, use a condensed font, tighter tracking, or multiple lines while preserving the original text area and readable size.',
    'Do not render tiny text centered on a large empty bar. Do not crop or change the image resolution.',
    'For Arabic, render readable right-to-left Arabic text with correct letter shaping and the same visual scale as the Chinese source text.',
    'Do not add extra decorative elements. Keep the file lightweight for H5.',
    candidate.generationHint ? `Project-specific visual instruction: ${candidate.generationHint}` : '',
    extraGuidance || '',
  ].filter(Boolean).join('\n');

  const response = await responsesCreate({
    model: process.env.I18N_IMAGE_MODEL || 'gpt-image-2',
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl(candidate.sourceImagePath) },
      ],
    }],
  });
  const base64 = extractImageBase64(response);
  if (!base64) throw new Error('No generated image base64 found in model response.');
  return Buffer.from(base64, 'base64');
}

function translationKey(candidate) {
  return candidate.sourceResourcesPath || candidate.sourceImagePath;
}

function normalizeTranslationEntries(value) {
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, entry]) => ({ key, ...entry }));
}

function hasManualDecision(entry) {
  if (entry.hasText === false) return true;
  if (entry.embeddedText || entry.semanticMeaning) return true;
  return Boolean(entry.localizedText && targetLanguages.some(language => entry.localizedText[language]));
}

function applyTranslations(manifest, translations) {
  const entries = normalizeTranslationEntries(translations);
  const byKey = new Map(entries.map(entry => [entry.key || entry.sourceResourcesPath || entry.sourceImagePath, entry]));
  let applied = 0;
  for (const candidate of manifest.candidates) {
    const entry = byKey.get(translationKey(candidate)) || byKey.get(candidate.sourceImagePath);
    if (!entry || !hasManualDecision(entry)) continue;

    const hasText = entry.hasText !== false;
    candidate.detectionStatus = hasText ? 'text' : 'non_text';
    candidate.embeddedText = entry.embeddedText || null;
    candidate.semanticMeaning = entry.semanticMeaning || null;
    candidate.notes.push({ at: new Date().toISOString(), type: 'manual_translation' });
    for (const language of targetLanguages) {
      const text = hasText && entry.localizedText ? entry.localizedText[language] : null;
      candidate.targets[language].proposedText = text || null;
      candidate.targets[language].generationNeeded = hasText && Boolean(text) && (!candidate.targets[language].exists || candidate.targets[language].status !== 'generated_needs_cocos_import');
      candidate.targets[language].status = hasText ? (text ? 'manual_pending_generation' : 'manual_missing_translation') : 'skipped_non_text';
    }
    applied += 1;
  }
  return applied;
}

function buildTranslationTemplate(manifest) {
  const template = {};
  for (const candidate of manifest.candidates) {
    template[translationKey(candidate)] = {
      sourceImagePath: candidate.sourceImagePath,
      width: candidate.width,
      height: candidate.height,
      hasText: true,
      embeddedText: null,
      semanticMeaning: null,
      localizedText: emptyLocalizedText(),
    };
  }
  return template;
}

function writeTranslationTemplate(manifest, filePath) {
  const absolutePath = path.resolve(projectRoot, filePath);
  writeJson(absolutePath, buildTranslationTemplate(manifest));
  return rel(absolutePath);
}

function loadTranslations(filePath) {
  return readJson(path.resolve(projectRoot, filePath));
}



function candidateFilter(args) {
  return candidate => !args.only || candidate.sourceImagePath.includes(args.only) || candidate.spriteFrameUuid.includes(args.only);
}

async function runClassify(args) {
  const manifest = loadManifestOrBuild();
  const candidates = manifest.candidates
    .filter(candidateFilter(args))
    .filter(candidate => args.force || (candidate.detectionStatus !== 'non_text' && candidate.detectionStatus !== 'text'))
    .slice(0, args.limit);

  if (!args.execute) {
    console.log(`Dry run: ${candidates.length} candidates would be sent to ${process.env.I18N_CLASSIFY_MODEL || 'gpt-5.5'} via Responses API with concurrency=${concurrencyLimit(args)}.`);
    console.log('Add --execute to upload images for classification.');
    return;
  }

  await runConcurrentJobs(candidates, args, async candidate => {
    const result = await classifyWithModel(candidate);
    const hasText = Boolean(result.hasText);
    candidate.detectionStatus = hasText ? 'text' : 'non_text';
    candidate.embeddedText = result.embeddedText || null;
    candidate.semanticMeaning = result.semanticMeaning || null;
    candidate.notes.push({ at: new Date().toISOString(), type: 'classification', confidence: result.confidence ?? null, reason: result.reason || null });
    for (const language of targetLanguages) {
      candidate.targets[language].proposedText = hasText ? result.localizedText && result.localizedText[language] || null : null;
      candidate.targets[language].generationNeeded = hasText && !candidate.targets[language].exists;
      candidate.targets[language].status = hasText ? 'classified_pending_generation' : 'skipped_non_text';
    }
    saveManifest(manifest);
    console.log(`${hasText ? 'text' : 'non_text'} ${candidate.sourceImagePath}`);
  });
}

async function runGenerate(args) {
  const manifest = loadManifestOrBuild();
  const jobs = [];
  for (const candidate of manifest.candidates.filter(candidateFilter(args))) {
    if (candidate.detectionStatus !== 'text') continue;
    for (const language of targetLanguages) {
      const target = candidate.targets[language];
      if (!target.generationNeeded && !args.force) continue;
      if (!target.proposedText) continue;
      jobs.push({ candidate, language, target });
    }
  }
  const selectedJobs = jobs.slice(0, args.limit);

  if (!args.execute) {
    console.log(`Dry run: ${selectedJobs.length} localized images would be generated with ${process.env.I18N_IMAGE_MODEL || 'gpt-image-2'} via Responses API with concurrency=${concurrencyLimit(args)}.`);
    console.log('Add --execute to upload images for generation.');
    return;
  }

  async function runJob(candidate, language, target) {
    try {
      let buffer = candidate.renderMode
        ? renderWithWorkflowRenderer(candidate, language, target.proposedText)
        : await generateWithModel(candidate, language, target.proposedText);
      try {
        buffer = normalizeGeneratedPng(buffer, candidate);
        if (candidate.textComposite) {
          buffer = compositeGeneratedTextWithSource(buffer, candidate);
        }
        if (candidate.preserveSourceAlpha) {
          buffer = preserveSourceAlphaWithUv(buffer, candidate);
        }
        if (candidate.transparentEdgeBackground) {
          buffer = removeEdgeBackgroundWithUv(buffer);
        }
      } catch (error) {
        target.status = 'rejected_postprocess';
        target.outputBytes = buffer.length;
        candidate.notes.push({ at: new Date().toISOString(), type: 'generation_rejected', language, reason: 'postprocess_failed', message: error.message });
        saveManifest(manifest);
        console.log(`rejected_postprocess ${candidate.sourceImagePath} ${language}: ${error.message}`);
        return;
      }
      const dimensions = pngDimensions(buffer);
      const limit = outputSizeLimit(candidate);
      if (!dimensions || dimensions.width !== candidate.width || dimensions.height !== candidate.height) {
        target.status = 'rejected_dimension';
        target.outputBytes = buffer.length;
        candidate.notes.push({ at: new Date().toISOString(), type: 'generation_rejected', language, reason: 'dimension_mismatch', dimensions });
        saveManifest(manifest);
        console.log(`rejected_dimension ${candidate.sourceImagePath} ${language}`);
        return;
      }
      if (buffer.length > limit) {
        target.status = 'rejected_size';
        target.outputBytes = buffer.length;
        candidate.notes.push({ at: new Date().toISOString(), type: 'generation_rejected', language, reason: 'too_large', bytes: buffer.length, limit });
        saveManifest(manifest);
        console.log(`rejected_size ${candidate.sourceImagePath} ${language} ${buffer.length}/${limit}`);
        return;
      }

      const outputPath = targetFilePath(target.resourcesPath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      const metaInfo = createCocosTextureMeta(outputPath, candidate.width, candidate.height);
      target.generatedPath = rel(outputPath);
      target.generatedMetaPath = rel(metaInfo.metaPath);
      target.generatedSpriteFrameUuid = metaInfo.spriteUuid;
      target.outputBytes = buffer.length;
      target.exists = true;
      target.generationNeeded = false;
      target.status = 'generated_needs_cocos_import';
      saveManifest(manifest);
      console.log(`generated ${target.generatedPath} ${buffer.length} bytes`);
    } catch (error) {
      target.status = 'generation_failed';
      target.generationNeeded = true;
      candidate.notes.push({ at: new Date().toISOString(), type: 'generation_failed', language, message: error.message });
      saveManifest(manifest);
      console.log(`generation_failed ${candidate.sourceImagePath} ${language}: ${error.message}`);
    }
  }

  await runConcurrentJobs(selectedJobs, args, job => runJob(job.candidate, job.language, job.target));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.classify && args.generate) throw new Error('Use --classify and --generate in separate runs.');
  if (args.applyTranslations && (args.classify || args.generate || args.writeTemplate)) throw new Error('Use --apply-translations separately from other modes.');
  if (args.writeTemplate && (args.classify || args.generate)) throw new Error('Use --write-template separately from --classify or --generate.');

  if (args.writeTemplate) {
    const manifest = loadManifestOrBuild();
    const output = writeTranslationTemplate(manifest, args.writeTemplate);
    console.log(`Translation template written to ${output}`);
    return;
  }

  if (args.applyTranslations) {
    const manifest = loadManifestOrBuild();
    const applied = applyTranslations(manifest, loadTranslations(args.applyTranslations));
    saveManifest(manifest);
    console.log(`Applied ${applied} manual translation entries.`);
    console.log(JSON.stringify(manifest.summary, null, 2));
    return;
  }

  if (args.classify) {
    await runClassify(args);
    return;
  }

  if (args.generate) {
    await runGenerate(args);
    return;
  }

  const manifest = buildManifestFromAudit();
  saveManifest(manifest);
  console.log(JSON.stringify(manifest.summary, null, 2));
  console.log(`Manifest written to ${toPosix(path.relative(projectRoot, manifestPath))}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
