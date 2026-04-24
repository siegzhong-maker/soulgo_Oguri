import { getSoulShortBlurb } from './load-soul.js';

/**
 * POST JSON: imageDataUrl | imageHttpUrl, optional location, diaryTextSnippet, semanticProfileSnapshot
 * Returns: { ok, objectKeywords, emotionKeywords, emotionLabel }
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_SNIPPET_LEN = 220;

const SYSTEM = `你是图像理解助手。用户上传了一张旅行/日常照片，用于给「电子宠物」挑选一件收集物小贴纸（与聊天点评无关）。

只输出**一个** JSON 对象，不要 markdown 代码围栏，不要解释。
字段要求（全部必填）：
- "objectKeywords": 字符串数组，3～8 个短中文词，描述**画面里能看到的物品/食物/建筑/环境**（名词或简短定语，每个不超过6字）；
- "emotionKeywords": 字符串数组，2～5 个短中文词，描述**画面可能传达的情绪氛围**（如：轻松、孤独、期待、甜、冷）；
- "emotionLabel": 单个英文蛇形小写词，从下列选一：calm, tender, excited, nostalgic, curious, warm, blue

若图很模糊，仍尽力用保守词填充，不要留空数组。`;

function buildUserText(payload) {
  const { location, diaryTextSnippet, semanticProfileSnapshot } = payload || {};
  return [
    '上下文（只供你理解，不要原样照抄到输出里）：',
    `地点线索：${typeof location === 'string' ? location.slice(0, 100) : ''}`,
    `日记片段：${typeof diaryTextSnippet === 'string' ? diaryTextSnippet.slice(0, MAX_SNIPPET_LEN) : ''}`,
    semanticProfileSnapshot && typeof semanticProfileSnapshot === 'object'
      ? `用户偏好摘要键：${Object.keys(semanticProfileSnapshot).slice(0, 8).join(', ')}`
      : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return { ok: false, error: 'missing_image' };
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { ok: false, error: 'invalid_data_url' };
  const mime = m[1].toLowerCase();
  if (!mime.startsWith('image/')) return { ok: false, error: 'not_image' };
  let raw;
  try {
    raw = Buffer.from(m[2], 'base64');
  } catch {
    return { ok: false, error: 'invalid_base64' };
  }
  if (raw.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'image_too_large', maxBytes: MAX_IMAGE_BYTES };
  }
  return { ok: true, imageUrlForModel: dataUrl };
}

function parseHttpImageUrl(url) {
  if (!url || typeof url !== 'string') return { ok: false, error: 'missing_image' };
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return { ok: false, error: 'invalid_http_url' };
  if (trimmed.length > 2048) return { ok: false, error: 'url_too_long' };
  return { ok: true, imageUrlForModel: trimmed };
}

function getVisionModel() {
  return (
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_DIARY_MODEL ||
    process.env.OPENROUTER_MODEL_ID ||
    'google/gemini-2.0-flash-001'
  );
}

function safeJsonParseObject(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeEmotionLabel(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  const allowed = new Set(['calm', 'tender', 'excited', 'nostalgic', 'curious', 'warm', 'blue']);
  if (allowed.has(s)) return s;
  return 'curious';
}

function normalizeKeywordArray(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function POST(request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'missing_api_key', message: 'OPENROUTER_API_KEY is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_body', message: 'Request body must be valid JSON.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let parsed = null;
  if (body.imageHttpUrl && String(body.imageHttpUrl).trim()) {
    parsed = parseHttpImageUrl(body.imageHttpUrl);
  }
  if (!parsed || !parsed.ok) {
    parsed = parseDataUrl(body.imageDataUrl);
  }
  if (!parsed.ok) {
    const status = parsed.error === 'image_too_large' ? 413 : 400;
    return new Response(
      JSON.stringify({
        error: parsed.error,
        message: parsed.error === 'image_too_large' ? 'Image too large.' : 'Invalid image payload.'
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const imageUrlForModel = parsed.imageUrlForModel;

  const blurb = getSoulShortBlurb(400);
  const system = blurb ? `${SYSTEM}\n\n【角色与世界的极短提示】\n${blurb}` : SYSTEM;
  const userText = buildUserText(body);
  const model = getVisionModel();

  const openAiBody = {
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText || '请分析此图。' },
          { type: 'image_url', image_url: { url: imageUrlForModel } }
        ]
      }
    ],
    max_tokens: 400,
    temperature: 0.35
  };

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'SoulGo Diary Collectible Score'
      },
      body: JSON.stringify(openAiBody)
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'network_error', message: String(e) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const raw = await upstream.text();
  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        error: 'upstream_error',
        status: upstream.status,
        message: raw.slice(0, 500)
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_invalid_json' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const text =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content
      : '';
  const obj = safeJsonParseObject(text);
  if (!obj || typeof obj !== 'object') {
    return new Response(
      JSON.stringify({ error: 'parse_error', message: 'Model did not return valid JSON.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const objectKeywords = normalizeKeywordArray(obj.objectKeywords);
  const emotionKeywords = normalizeKeywordArray(obj.emotionKeywords);
  const emotionLabel = normalizeEmotionLabel(obj.emotionLabel);

  if (objectKeywords.length === 0) {
    objectKeywords.push('旅行', '日常');
  }
  if (emotionKeywords.length === 0) {
    emotionKeywords.push('平静');
  }

  return new Response(
    JSON.stringify({
      ok: true,
      objectKeywords,
      emotionKeywords,
      emotionLabel
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
