#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { loadConfig, parseLanguagesArg, targetLanguages: deriveTargetLanguages } = require('./common.cjs');

const config = loadConfig(process.argv.slice(2));
const projectRoot = config.projectRoot;
const assetsRoot = config.assetsRoot;
const resourcesRoot = config.resourcesRoot;
const i18nManagerPath = config.i18nManagerPath || null;
const outputDir = config.reportDirectory;
const outputPath = path.join(outputDir, 'i18n-asset-audit.json');

const targetLanguages = deriveTargetLanguages(config);
const resourcesRelPrefix = `${toPosix(path.relative(projectRoot, resourcesRoot))}/`;
const builtinSpriteFrameUuids = new Set([
  'a23235d1-15db-4b95-8439-a2e005bfff91',
]);
const dynamicSpriteNodePattern = /(^|\/)(img|imgSkin|icon|head|headimg|avatar|title|titleName|text|sprite|block|stone|screw|stick|item|mask|authorizationButton1|GameRecommendRoom|StoneRoom|ScrewRoom)$/i;
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
const textImageNamePattern = /(^|[\\/_.-])(title|btn|button|ok|next|receive|start|startgame|shengli|shibai|huoqu|zaici|rank|free|more|skin|user|logo|text\d*|desc\d*)([\\/_.-]|$)|[㐀-鿿]/i;
const textImageDirPattern = /Game(Home|Fail|Success|Physical|Skin|Rank|Free|More|Receive|Setup|Load|Privacy|Agreement)Room|GameFree|GameMore|GameReceive|GamePrivacy|GameLoad|GameHome/i;

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function rel(filePath) {
  return toPosix(path.relative(projectRoot, filePath));
}

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, out);
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function getSpriteFrameMapSource() {
  if (!i18nManagerPath || !fs.existsSync(i18nManagerPath)) return null;
  const source = fs.readFileSync(i18nManagerPath, 'utf8');
  const marker = 'this.spriteFrameMap = {';
  const start = source.indexOf(marker);
  if (start < 0) return null;
  let braceIndex = source.indexOf('{', start);
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = braceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex, index + 1);
    }
  }
  return null;
}

function parseSpriteFrameMapFromSource() {
  const mapSource = getSpriteFrameMapSource();
  if (!mapSource) return {};
  const result = {};
  const entryPattern = /"([0-9a-f-]{36})"\s*:\s*\{([\s\S]*?)\n\s*\}/g;
  let entry;
  while ((entry = entryPattern.exec(mapSource))) {
    const uuid = entry[1];
    const body = entry[2];
    result[uuid] = {};
    for (const language of targetLanguages) {
      const languagePattern = new RegExp(`${language}\\s*:\\s*"([^"]+)"`);
      const match = body.match(languagePattern);
      if (match) result[uuid][language] = match[1];
    }
  }
  return result;
}

function parseSpriteFrameMap() {
  if (typeof config.getSpriteFrameMap === 'function') {
    const fromConfig = config.getSpriteFrameMap();
    if (fromConfig && Object.keys(fromConfig).length > 0) return fromConfig;
  }
  return parseSpriteFrameMapFromSource();
}

function loadSpriteFrameIndex() {
  const index = new Map();
  const textureMetas = walk(assetsRoot, filePath => {
    return filePath.endsWith('.png.meta')
      || filePath.endsWith('.jpg.meta')
      || filePath.endsWith('.jpeg.meta')
      || filePath.endsWith('.webp.meta')
      || filePath.endsWith('.plist.meta');
  });
  for (const metaPath of textureMetas) {
    const meta = readJson(metaPath);
    if (!meta || !meta.subMetas) continue;
    const imagePath = metaPath.replace(/\.meta$/, '');
    const imageRel = rel(imagePath);
    const atlasSize = meta.size || {};
    for (const [name, subMeta] of Object.entries(meta.subMetas)) {
      if (!subMeta || !subMeta.uuid) continue;
      const record = {
        uuid: subMeta.uuid,
        textureUuid: meta.uuid,
        name,
        imagePath: imageRel,
        metaPath: rel(metaPath),
        resourcesPath: imageRel.startsWith(resourcesRelPrefix)
          ? imageRel.slice(resourcesRelPrefix.length).replace(/\.(png|jpg|jpeg|webp)$/i, '')
          : null,
        width: subMeta.rawWidth || subMeta.width || meta.width || atlasSize.width || null,
        height: subMeta.rawHeight || subMeta.height || meta.height || atlasSize.height || null,
        fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : null,
      };
      index.set(subMeta.uuid, record);
      index.set(`${meta.uuid}@${name}`, record);
    }
  }
  return index;
}

function collectNodeInfo(items) {
  const nodes = new Map();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item && item.__type__ === 'cc.Node') {
      nodes.set(index, {
        id: index,
        name: item._name || '',
        raw: item,
        parentId: item._parent && Number.isInteger(item._parent.__id__) ? item._parent.__id__ : null,
        componentIds: Array.isArray(item._components) ? item._components.map(component => component.__id__).filter(Number.isInteger) : [],
      });
    }
  }
  for (const node of nodes.values()) {
    const names = [];
    let current = node;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name || `<node:${current.id}>`);
      current = nodes.get(current.parentId);
    }
    node.path = names.join('/');
  }
  return nodes;
}

function classifySpriteStatus(uuid, spriteInfo, nodePath) {
  if (uuid && spriteInfo) return 'ok';
  if (uuid && builtinSpriteFrameUuids.has(uuid)) return 'builtin_sprite_frame';
  if (!uuid && dynamicSpriteNodePattern.test(nodePath || '')) return 'dynamic_or_intentionally_empty';
  return uuid ? 'invalid_uuid' : 'missing_sprite_frame';
}

function isVisibleSprite(sprite) {
  return sprite && (sprite.status === 'ok' || sprite.status === 'builtin_sprite_frame');
}

function isRootOverlayButton(button) {
  return button.nodePath && button.targetPath && button.nodePath === button.targetPath && !button.nodePath.includes('/');
}

function buildButtonStatus(item, node, targetNode, ownSprite, targetSprite) {
  const visibleSprite = isVisibleSprite(ownSprite) || isVisibleSprite(targetSprite);
  if (visibleSprite) return 'ok';
  const nodePath = node ? node.path : '';
  const targetPath = targetNode ? targetNode.path : '';
  if (nodePath && targetPath && nodePath === targetPath && !nodePath.includes('/')) {
    return 'root_overlay_button';
  }
  return 'no_visible_sprite';
}

function spriteUuidFromComponent(component) {
  if (!component || !component._spriteFrame) return null;
  return component._spriteFrame.__uuid__ || null;
}

function scanPrefabLikeFile(filePath, spriteFrameIndex) {
  const items = readJson(filePath);
  if (!Array.isArray(items)) return { parseError: true, sprites: [], buttons: [] };
  const nodes = collectNodeInfo(items);
  const spriteByNode = new Map();
  const sprites = [];
  const buttons = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || !item.__type__) continue;
    const nodeId = item.node && Number.isInteger(item.node.__id__) ? item.node.__id__ : null;
    const node = nodes.get(nodeId);
    if (item.__type__ === 'cc.Sprite') {
      const uuid = spriteUuidFromComponent(item);
      const spriteInfo = uuid ? spriteFrameIndex.get(uuid) : null;
      const status = classifySpriteStatus(uuid, spriteInfo, node ? node.path : '');
      const record = {
        file: rel(filePath),
        componentId: index,
        nodeId,
        nodePath: node ? node.path : '',
        nodeName: node ? node.name : '',
        spriteFrameUuid: uuid,
        status,
        imagePath: spriteInfo ? spriteInfo.imagePath : null,
        width: spriteInfo ? spriteInfo.width : null,
        height: spriteInfo ? spriteInfo.height : null,
      };
      sprites.push(record);
      if (nodeId !== null) spriteByNode.set(nodeId, record);
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || item.__type__ !== 'cc.Button') continue;
    const nodeId = item.node && Number.isInteger(item.node.__id__) ? item.node.__id__ : null;
    const targetId = item.target && Number.isInteger(item.target.__id__) ? item.target.__id__ : nodeId;
    const node = nodes.get(nodeId);
    const targetNode = nodes.get(targetId);
    const ownSprite = spriteByNode.get(nodeId);
    const targetSprite = spriteByNode.get(targetId);
    const buttonStatus = buildButtonStatus(item, node, targetNode, ownSprite, targetSprite);
    buttons.push({
      file: rel(filePath),
      componentId: index,
      nodeId,
      nodePath: node ? node.path : '',
      targetId,
      targetPath: targetNode ? targetNode.path : '',
      status: buttonStatus,
      ownSpriteFrameUuid: ownSprite ? ownSprite.spriteFrameUuid : null,
      targetSpriteFrameUuid: targetSprite ? targetSprite.spriteFrameUuid : null,
    });
  }

  return { parseError: false, sprites, buttons };
}

function resourcePathExists(resourcesPath) {
  if (!resourcesPath) return false;
  const absolute = path.join(resourcesRoot, ...resourcesPath.split('/'));
  const candidates = ['.png', '.jpg', '.jpeg', '.webp'].map(ext => absolute + ext);
  return candidates.some(candidate => fs.existsSync(candidate));
}

function isTextImageCandidate(spriteInfo) {
  if (!spriteInfo || !spriteInfo.imagePath) return false;
  if (knownNonTextPatterns.some(pattern => pattern.test(spriteInfo.imagePath))) return false;
  return textImageNamePattern.test(spriteInfo.imagePath) || textImageDirPattern.test(spriteInfo.imagePath);
}

function buildI18nIssues(spriteFrameMap, spriteFrameIndex, usedSpriteUuids) {
  const mappedMissing = [];
  const missingMapCandidates = [];
  const mappedUnused = [];

  for (const [uuid, mapping] of Object.entries(spriteFrameMap)) {
    const source = spriteFrameIndex.get(uuid);
    if (!usedSpriteUuids.has(uuid)) {
      mappedUnused.push({ spriteFrameUuid: uuid, sourceImagePath: source ? source.imagePath : null, mapping });
    }
    for (const [language, targetPath] of Object.entries(mapping)) {
      if (!targetPath || !resourcePathExists(targetPath)) {
        mappedMissing.push({
          spriteFrameUuid: uuid,
          language,
          sourceImagePath: source ? source.imagePath : null,
          expectedResourcePath: targetPath || null,
          sourceWidth: source ? source.width : null,
          sourceHeight: source ? source.height : null,
        });
      }
    }
  }

  for (const uuid of usedSpriteUuids) {
    if (spriteFrameMap[uuid]) continue;
    const source = spriteFrameIndex.get(uuid);
    if (isTextImageCandidate(source)) {
      missingMapCandidates.push({
        spriteFrameUuid: uuid,
        sourceImagePath: source.imagePath,
        resourcesPath: source.resourcesPath,
        width: source.width,
        height: source.height,
        fileSize: source.fileSize,
      });
    }
  }

  return { mappedMissing, missingMapCandidates, mappedUnused };
}

function resolveRoot(root) {
  return path.isAbsolute(root) ? root : path.join(projectRoot, root);
}

function configuredRoots(values, fallback) {
  const roots = Array.isArray(values) && values.length ? values : fallback;
  return roots.map(resolveRoot);
}

function main() {
  const spriteFrameIndex = loadSpriteFrameIndex();
  const spriteFrameMap = parseSpriteFrameMap();
  const prefabRoots = configuredRoots(config.prefabRoots, [path.join(resourcesRoot, 'perfabs'), path.join(resourcesRoot, 'prefabs')]);
  const sceneRoots = configuredRoots(config.sceneRoots, [path.join(assetsRoot, 'Scene')]);
  const prefabFiles = prefabRoots.flatMap(root => walk(root, filePath => filePath.endsWith('.prefab')));
  const sceneFiles = sceneRoots.flatMap(root => walk(root, filePath => filePath.endsWith('.fire')));
  const scannedFiles = [...prefabFiles, ...sceneFiles];

  const sprites = [];
  const buttons = [];
  const parseErrors = [];
  for (const filePath of scannedFiles) {
    const result = scanPrefabLikeFile(filePath, spriteFrameIndex);
    if (result.parseError) {
      parseErrors.push(rel(filePath));
      continue;
    }
    sprites.push(...result.sprites);
    buttons.push(...result.buttons);
  }

  const usedSpriteUuids = new Set(sprites.map(sprite => sprite.spriteFrameUuid).filter(Boolean));
  const invalidSprites = sprites.filter(sprite => sprite.status === 'invalid_uuid' || sprite.status === 'missing_sprite_frame');
  const actionableInvalidSprites = invalidSprites.filter(sprite => sprite.status === 'invalid_uuid' || !dynamicSpriteNodePattern.test(sprite.nodePath || ''));
  const builtinSprites = sprites.filter(sprite => sprite.status === 'builtin_sprite_frame');
  const dynamicOrEmptySprites = sprites.filter(sprite => sprite.status === 'dynamic_or_intentionally_empty');
  const buttonsWithoutVisibleSprite = buttons.filter(button => button.status === 'no_visible_sprite');
  const rootOverlayButtons = buttons.filter(button => button.status === 'root_overlay_button');
  const i18n = buildI18nIssues(spriteFrameMap, spriteFrameIndex, usedSpriteUuids);

  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot: toPosix(projectRoot),
    summary: {
      scannedFiles: scannedFiles.length,
      parseErrors: parseErrors.length,
      indexedSpriteFrames: spriteFrameIndex.size,
      sprites: sprites.length,
      invalidSprites: invalidSprites.length,
      actionableInvalidSprites: actionableInvalidSprites.length,
      builtinSprites: builtinSprites.length,
      dynamicOrEmptySprites: dynamicOrEmptySprites.length,
      buttons: buttons.length,
      buttonsWithoutVisibleSprite: buttonsWithoutVisibleSprite.length,
      rootOverlayButtons: rootOverlayButtons.length,
      spriteFrameMapEntries: Object.keys(spriteFrameMap).length,
      mappedLocalizedImagesMissing: i18n.mappedMissing.length,
      usedTextImageCandidatesWithoutMap: i18n.missingMapCandidates.length,
      mappedSpriteFramesNotUsedInPrefabsOrScene: i18n.mappedUnused.length,
    },
    parseErrors,
    invalidSprites,
    actionableInvalidSprites,
    builtinSprites,
    dynamicOrEmptySprites,
    buttonsWithoutVisibleSprite,
    rootOverlayButtons,
    missingLocalizedImages: i18n.mappedMissing,
    textImageCandidatesWithoutI18nMap: i18n.missingMapCandidates,
    mappedSpriteFramesNotUsedInPrefabsOrScene: i18n.mappedUnused,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report written to ${rel(outputPath)}`);
}

main();
