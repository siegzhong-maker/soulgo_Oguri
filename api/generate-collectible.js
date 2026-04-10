import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function normalizeStyleType(styleType, preferredCategory) {
  const s = String(styleType || '').trim().toLowerCase();
  if (s === 'food' || s === 'sculpture' || s === 'badge') return s;
  const c = String(preferredCategory || '').trim().toLowerCase();
  if (c === 'food') return 'food';
  if (c === 'sculpture') return 'sculpture';
  return 'badge';
}

const IMAGE_TEXT_RULE =
  'TEXT RULE: Absolutely no readable text in the image — no Chinese characters, no Latin letters used as words or labels, no numbers on signs, no shop signage, no food packaging typography, no captions, no logos, no watermarks. Illustration only. ';

/** Use model sidecar text as intro when it is Chinese prose (avoids second API call). */
function extractIntroFromMessage(data, maxLen = 220) {
  const message = data?.choices?.[0]?.message;
  if (!message) return '';
  let text = '';
  if (typeof message.content === 'string') {
    text = message.content;
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (!part || typeof part !== 'object') continue;
      if (part.type === 'text') {
        if (typeof part.text === 'string') text += part.text;
        else if (part.text && typeof part.text.value === 'string') text += part.text.value;
      }
    }
  }
  text = String(text)
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasCjk = /[\u4e00-\u9fff]/.test(text);
  if (!hasCjk || text.length < 10) return '';
  const bad = /^(好的|好的，|here|sure|ok)\b/i.test(text);
  if (bad && text.length < 40) return '';
  if (text.length > maxLen) {
    text = text.slice(0, maxLen).replace(/[，,、]\s*$/, '');
    return `${text}…`;
  }
  return text;
}

/** 详情页「收藏说明」：世界观化短句，避免模型名与管线术语 */
function productFactsForCollectible() {
  return [
    '随你在当地的打卡灵感即时绘成，像旅行手帐里刚贴上的那一枚。',
    '边缘已细细修过，像剪好的贴纸，方便直接摆进小屋。'
  ];
}

function productTagsForStyleType(styleType) {
  const theme = styleType === 'food' ? '食物' : styleType === 'sculpture' ? '地标' : '纪念徽章';
  return [theme, '旅途灵感'];
}

function fallbackIntroFromScene(location, styleType, memoryTag) {
  const loc = String(location || '这里').trim() || '这里';
  const tag = String(memoryTag || '').trim();
  const tagHint = tag && !tag.startsWith('dyn_') ? `与你途中记下的「${tag}」氛围相配，` : '';
  if (styleType === 'food') {
    return `${tagHint}这枚手帐风贴纸采集「${loc}」的风味印象——用色彩和线条留住舌尖与街角的一瞬，适合收进见闻柜慢慢翻。`;
  }
  if (styleType === 'sculpture') {
    return `${tagHint}这枚贴纸把「${loc}」的城市轮廓收成一枚小地标，线条轻快、留白干净，像旅行日记里随手贴上的那一角。`;
  }
  return `${tagHint}这枚旅行徽章拼起「${loc}」的符号碎片，看到它就能想起当时的光与路。`;
}

function extractImageUrl(data) {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;
  if (Array.isArray(message.images) && message.images.length > 0) {
    const first = message.images[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
    if (first?.imageUrl?.url) return first.imageUrl.url;
    if (first?.image_url?.url) return first.image_url.url;
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  }
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.type === 'image_url' && part?.image_url?.url) return part.image_url.url;
      if (part?.type === 'image' && (part?.image_url?.url || part?.url)) return part?.image_url?.url || part?.url;
    }
  }
  if (typeof message.content === 'string') {
    const txt = message.content.trim();
    const md = txt.match(/!\[.*?\]\((.*?)\)/);
    if (md?.[1]) return md[1];
    if (txt.startsWith('http') || txt.startsWith('data:')) return txt;
  }
  return null;
}

function dataUrlToBuffer(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) return null;
  return Buffer.from(m[1], 'base64');
}

function bufferToDataUrlPng(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/**
 * Low-chroma pixels only: key near-white, near-black, and dark flat mid-tones (gray/brown/blue-gray backdrops).
 * Saturated colors keep full alpha so food/landmark subjects are not hollowed out.
 */
function alphaFromFlatBackground(
  r,
  g,
  b,
  a,
  whiteThreshold,
  whiteFeather,
  blackMax,
  blackFeather,
  maxChromaDiff,
  flatDarkCap,
  darkNeutralLumMax
) {
  if (a === 0) return 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > maxChromaDiff) return a;
  const lum = (r + g + b) / 3;

  const blackEnd = blackMax + blackFeather;
  if (lum <= blackMax) return 0;
  if (lum < blackEnd) {
    const t = (lum - blackMax) / blackFeather;
    return Math.max(0, Math.min(255, Math.round(a * t)));
  }

  // Between near-black and near-white: models often output opaque dark flat mats (lum ~60–150, max RGB capped).
  if (max <= flatDarkCap && lum < darkNeutralLumMax) {
    const band = darkNeutralLumMax - blackEnd;
    if (band > 0) {
      const rawKeep = (lum - blackEnd) / band;
      const keep = Math.min(1, Math.max(0, Math.pow(rawKeep, 1.15)));
      return Math.max(0, Math.min(255, Math.round(a * keep)));
    }
  }

  const whiteStart = whiteThreshold - whiteFeather;
  if (lum >= whiteThreshold) return 0;
  if (lum > whiteStart) {
    const keep = (whiteThreshold - lum) / whiteFeather;
    return Math.max(0, Math.min(255, Math.round(a * keep)));
  }

  return a;
}

async function removeWhiteBg(pngBuf) {
  const img = sharp(pngBuf, { failOn: 'none' }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const whiteThreshold = 245;
  const whiteFeather = 20;
  const blackMax = 26;
  const blackFeather = 32;
  const maxChromaDiff = 38;
  const flatDarkCap = 112;
  const darkNeutralLumMax = 152;
  for (let i = 0; i < out.length; i += 4) {
    out[i + 3] = alphaFromFlatBackground(
      out[i],
      out[i + 1],
      out[i + 2],
      out[i + 3],
      whiteThreshold,
      whiteFeather,
      blackMax,
      blackFeather,
      maxChromaDiff,
      flatDarkCap,
      darkNeutralLumMax
    );
  }
  return sharp(out, { raw: info }).png().toBuffer();
}

function stylePrompt(styleType, location, memoryTag) {
  const loc = String(location || '某地').trim();
  const tag = String(memoryTag || '').trim();
  const hint = tag ? `Creative hint (do not render as text): ${tag}. ` : '';
  if (styleType === 'food') {
    return `${IMAGE_TEXT_RULE}${hint}Travel collectible sticker, flat light or pure white background only (no black or dark gray backdrop), one plated local signature food from ${loc}, hand-drawn doodle style, soft outlines. Repeat: zero text in the artwork.`;
  }
  if (styleType === 'sculpture') {
    return `${IMAGE_TEXT_RULE}${hint}Travel collectible sticker, flat light or pure white background only (no black or dark gray backdrop), one iconic landmark or sculpture from ${loc}, hand-drawn doodle style. No building signs or engraved lettering.`;
  }
  return `${IMAGE_TEXT_RULE}${hint}Travel fridge magnet badge for ${loc}, one concise symbolic composition, hand-drawn doodle, flat light or white background (no black backdrop), no emblems that include writing.`;
}

function sceneLabel(styleType, location) {
  const loc = String(location || '未知地点').trim() || '未知地点';
  if (styleType === 'food') return `${loc}·风味美食`;
  if (styleType === 'sculpture') return `${loc}·城市地标`;
  return `${loc}·旅行徽章`;
}

function slug(input) {
  return String(input || '')
    .trim()
    .replace(/[·／/\\:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'item';
}

function buildPersistPaths(styleType, location) {
  const root = process.cwd();
  const poolKey = slug(location || 'misc');
  const styleDir = slug(styleType || 'badge');
  const baseDir = resolve(root, '场景', 'generated', 'aigc-cutouts', styleDir, poolKey);
  const fileName = `${poolKey}-${Date.now()}.png`;
  const absFile = join(baseDir, fileName);
  const relImage = `场景/generated/aigc-cutouts/${styleDir}/${poolKey}/${fileName}`.replace(/\\/g, '/');
  const manifestPath = resolve(root, '场景', 'generated', 'aigc-cutouts', 'manifest.json');
  return { absFile, relImage, manifestPath, baseDir };
}

function persistCollectibleAsset(cutoutPng, styleType, location, scene) {
  try {
    const { absFile, relImage, manifestPath, baseDir } = buildPersistPaths(styleType, location);
    mkdirSync(baseDir, { recursive: true });
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(absFile, cutoutPng);

    let manifest = [];
    if (existsSync(manifestPath)) {
      try {
        const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
        manifest = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
      } catch {
        manifest = [];
      }
    }
    const toSave = {
      image: relImage,
      label: scene.label,
      poolKey: location,
      styleType,
      collectCategory: scene.collectCategory,
      tier: scene.tier,
      memoryTag: scene.memoryTag,
      regionLabel: scene.regionLabel,
      source: scene.source,
      intro: scene.intro,
      facts: scene.facts,
      tags: scene.tags
    };
    manifest.unshift(toSave);
    // 去重：label+image
    const seen = new Set();
    manifest = manifest.filter((it) => {
      const k = `${it.label || ''}::${it.image || ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return relImage;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'missing_api_key', message: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }
  const location = String(body?.location || '').trim();
  if (!location) return Response.json({ error: 'missing_location' }, { status: 400 });
  const styleType = normalizeStyleType(body?.styleType, body?.preferredCategory);
  const tier = ['S', 'A', 'B', 'C'].includes(String(body?.tier || '').toUpperCase()) ? String(body.tier).toUpperCase() : 'B';
  const memoryTag = String(body?.memoryTag || '').trim();
  const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

  const payload = {
    model,
    messages: [{ role: 'user', content: [{ type: 'text', text: stylePrompt(styleType, location, memoryTag) }] }],
    modalities: ['image', 'text']
  };
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'SoulGo Dynamic Collectible Gen'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: 'upstream_error', message: t.slice(0, 400) }, { status: res.status });
    }
    const data = await res.json();
    const imageUrl = extractImageUrl(data);
    if (!imageUrl) return Response.json({ error: 'no_image' }, { status: 502 });

    let rawBuf = dataUrlToBuffer(imageUrl);
    if (!rawBuf && /^https?:\/\//i.test(imageUrl)) {
      const ir = await fetch(imageUrl);
      if (ir.ok) rawBuf = Buffer.from(await ir.arrayBuffer());
    }
    if (!rawBuf) return Response.json({ error: 'invalid_image_payload' }, { status: 502 });

    const cutout = await removeWhiteBg(rawBuf);
    const imageDataUrl = bufferToDataUrlPng(cutout);
    const collectCategory = styleType === 'food' ? 'food' : (styleType === 'sculpture' ? 'sculpture' : 'souvenir');
    const introText = extractIntroFromMessage(data) || fallbackIntroFromScene(location, styleType, memoryTag);
    const scene = {
      image: imageDataUrl,
      label: sceneLabel(styleType, location),
      tier,
      source: 'checkin',
      memoryTag: memoryTag || `dyn_${Date.now()}`,
      collectCategory,
      regionLabel: location,
      assetSource: 'ai_daily',
      collectibleSourceType: 'aigc_cutout_manifest',
      intro: introText,
      facts: productFactsForCollectible(),
      tags: productTagsForStyleType(styleType)
    };
    const persistedImage = persistCollectibleAsset(cutout, styleType, location, scene);
    if (persistedImage) {
      scene.image = persistedImage;
      scene.tags = Array.isArray(scene.tags) ? [...scene.tags, '已入库'] : ['已入库'];
    }
    return Response.json({ ok: true, scene });
  } catch (err) {
    return Response.json({ error: 'internal_error', message: err?.message || String(err) }, { status: 500 });
  }
}
