import { getSoulShortBlurb } from './load-soul.js';

/**
 * Vercel Serverless: multimodal image commentary in Soul (小粟) voice via OpenRouter.
 *
 * POST JSON:
 * - imageDataUrl: string (data:image/...;base64,...) **或** imageHttpUrl: string (https://，用于外链如 AIGC)
 * - petPersonality: string
 * - ownerTitle: string
 * - personalityPromptDesc: string (optional, from client PERSONALITY_TYPES)
 * - semanticProfileSnapshot: object (optional, same shape as /api/diary)
 * - location: string (optional)
 * - diaryTextSnippet: string (optional)
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_PROMPT_DESC_LEN = 800;
const MAX_SNIPPET_LEN = 200;

const IMAGE_COMMENT_SYSTEM_BASE = `你是小粟（美食森林系电子宠物），口吻与写打卡日记时一致：第一人称、爱尝味道、爱分享，轻松治愈，适度「～」「…」，不要书面作文腔。

【任务】
用户会在日记里贴一张照片。你要**亲眼看过图**后，用简短自然的话回应（约 40～120 字）。
- 这是**陪伴式反应**，不是摄影比赛打分；不要列技术参数，不要冷冰冰点评构图。
- 结合下面提供的性格标签、人格设定、对主人的称呼，让说法像你一直认识对方。
- 同时把你的回应当作“主线在前进的一小步”：要么轻轻呼应 soul.md 的核心信念/欲望恐惧/背景秘密之一，要么用照片里的当下去点出那条主线的延伸（不需要逐句复述）。
- 如果图里和美食、自然、风景、伙伴、野餐相关，可以轻轻点一下；看不出来也没关系，诚实又温柔地说说你的感受即可。

【输出】
只输出一段纯中文正文，不要标题、不要 markdown、不要 JSON、不要引号包裹。`;

function getImageCommentSystemPrompt() {
  // 提升 soul.md 摘要长度，降低“看起来像随机聊天”的主线漂移
  const blurb = getSoulShortBlurb(1000);
  if (!blurb) return IMAGE_COMMENT_SYSTEM_BASE;
  return `${IMAGE_COMMENT_SYSTEM_BASE}\n\n【角色摘要】\n${blurb}`;
}

function stripMarkdownish(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return { ok: false, error: 'missing_image' };
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { ok: false, error: 'invalid_data_url' };
  const mime = m[1].toLowerCase();
  if (!mime.startsWith('image/')) return { ok: false, error: 'not_image' };
  const b64 = m[2];
  let raw;
  try {
    raw = Buffer.from(b64, 'base64');
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

function buildUserText(payload) {
  const {
    petPersonality,
    ownerTitle,
    personalityPromptDesc,
    semanticProfileSnapshot,
    location,
    diaryTextSnippet
  } = payload || {};

  const ctx = {
    petPersonality: petPersonality || '',
    ownerTitle: ownerTitle || '伙伴',
    personalityPromptDesc: typeof personalityPromptDesc === 'string'
      ? personalityPromptDesc.slice(0, MAX_PROMPT_DESC_LEN)
      : '',
    semanticProfile: semanticProfileSnapshot && typeof semanticProfileSnapshot === 'object'
      ? semanticProfileSnapshot
      : null,
    location: typeof location === 'string' ? location.slice(0, 120) : '',
    diaryTextSnippet: typeof diaryTextSnippet === 'string' ? diaryTextSnippet.slice(0, MAX_SNIPPET_LEN) : ''
  };

  return `下面 JSON 是本次上下文（只供你理解，不要复述字段名）：\n${JSON.stringify(ctx, null, 2)}\n\n请直接对照片说出你想对${ctx.ownerTitle}说的话。`;
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
        message:
          parsed.error === 'image_too_large'
            ? 'Image too large; compress on client and retry.'
            : 'Invalid image (need imageDataUrl or https imageHttpUrl).'
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const imageUrlForModel = parsed.imageUrlForModel;

  const model =
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_DIARY_MODEL ||
    process.env.OPENROUTER_MODEL_ID ||
    'google/gemini-2.0-flash-001';

  const userText = buildUserText(body);

  const openAiBody = {
    model,
    messages: [
      { role: 'system', content: getImageCommentSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageUrlForModel } }
        ]
      }
    ],
    max_tokens: 320,
    temperature: 0.75
  };

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'SoulGo Diary Image Comment'
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
    return new Response(
      JSON.stringify({ error: 'upstream_invalid_json' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content
      : '';

  const comment = stripMarkdownish(content);
  if (!comment) {
    return new Response(
      JSON.stringify({ error: 'empty_comment', message: 'Model returned no text.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ ok: true, comment }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
