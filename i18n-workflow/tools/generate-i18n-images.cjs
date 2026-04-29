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
  /GamePhysicalRoom\/(fanhui|block_room|neng)\.png$/,
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
    concurrency: 1,
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
    else if (arg.startsWith('--concurrency=')) args.concurrency = Math.min(10, Math.max(1, Number(arg.slice('--concurrency='.length)) || 1));
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

  return {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    modelPlan: {
      classifier: process.env.I18N_CLASSIFY_MODEL || 'gpt-5.5',
      imageGenerator: process.env.I18N_IMAGE_MODEL || 'gpt-image-2',
      api: 'OpenAI Responses API via ANTHROPIC_BASE_URL/ANTHROPIC_API_KEY',
      instructions: [
        'Classify whether the source image contains embedded text that needs localization.',
        'Preserve original canvas width and height exactly for generated assets.',
        'Keep transparent/background style and button/title visual style consistent with source.',
        'Reject or recompress generated files that exceed the configured size limit.',
      ],
    },
    summary: summarize(candidates),
    candidates,
  };
}

function loadManifestOrBuild() {
  return fs.existsSync(manifestPath) ? readJson(manifestPath) : buildManifestFromAudit();
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

function getResponsesEndpoint() {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  if (!baseUrl) throw new Error('ANTHROPIC_BASE_URL is required for --execute.');
  return `${baseUrl.replace(/\/+$/, '')}/responses`;
}

function getApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for --execute.');
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

async function classifyWithModel(candidate) {
  const prompt = [
    'You are auditing a Cocos Creator UI image for game localization.',
    'Return only JSON with this shape:',
    '{"hasText":boolean,"embeddedText":"string|null","semanticMeaning":"string","localizedText":{"en":"string|null","ar":"string|null"},"confidence":0-1,"reason":"string"}',
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
      localizedText: { en: null, ar: null },
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
    console.log(`Dry run: ${candidates.length} candidates would be sent to ${process.env.I18N_CLASSIFY_MODEL || 'gpt-5.5'} via Responses API.`);
    console.log('Add --execute to upload images for classification.');
    return;
  }

  for (const candidate of candidates) {
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
  }
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
    console.log(`Dry run: ${selectedJobs.length} localized images would be generated with ${process.env.I18N_IMAGE_MODEL || 'gpt-image-2'} via Responses API.`);
    console.log('Add --execute to upload images for generation.');
    return;
  }

  async function runJob(candidate, language, target) {
    try {
      let buffer = await generateWithModel(candidate, language, target.proposedText);
      try {
        buffer = normalizeGeneratedPng(buffer, candidate);
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

  let nextIndex = 0;
  const concurrency = Math.min(10, Math.max(1, args.concurrency || 1));
  async function worker() {
    while (nextIndex < selectedJobs.length) {
      const job = selectedJobs[nextIndex++];
      await runJob(job.candidate, job.language, job.target);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
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
