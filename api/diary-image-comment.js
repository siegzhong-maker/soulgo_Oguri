import { getSoulShortBlurb } from './load-soul.js';

/**
 * Vercel Serverless：合并「日记多模态图」两用途，少占一个 serverless 配额（Hobby 最多 12 个）。
 *
 * POST JSON 公共：imageDataUrl 或 imageHttpUrl
 *
 * 默认（省略 diaryImageMode 或 comment）：返回 Soul 第一人称短评
 * 日记配图 Soul 点评。
 *
 * diaryImageMode === "collectibleScore"：返回物品/情绪 JSON，供收集物打分（原 /api/diary-collectible-score）
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_PROMPT_DESC_LEN = 800;
const MAX_SNIPPET_LEN_COMMENT = 200;
const MAX_SNIPPET_LEN_SCORE = 220;

const IMAGE_COMMENT_SYSTEM_BASE = `你是小粟（美食森林系电子宠物），口吻与写打卡日记时一致：第一人称、爱尝味道、爱分享，轻松治愈，适度「～」「…」，不要书面作文腔。

【任务】
用户会在日记里贴一张照片。你要**真的从图里读出**：画面里大概有什么、什么氛围；并像朋友一样说说**你猜对方拍这图时在想什么、想留住什么**——是「我在场、我路过、我想让你也看看」里的哪一种。
- 这是**Soul 在读图说自己**：用第一人称讲你的感受与联想，让对方觉得被懂，而不是被审图或打分。
- 这是自然口语的一段话，但必须自然覆盖这两点：1）和打卡地点的关联；2）对用户当下情绪的理解与共情。
- 如果上下文里给了 location，尽量在点评中自然点到该地点名或地点特征；若图与地点不完全一致，也用柔和过渡说法（如「像是你在XX路过时拍下的一角」），不要忽略地点。
- 对情绪判断要给轻量依据（如光线、动作、构图、画面留白、色调），避免只说空泛鼓励。
- 不要写「猜你喜欢」「推荐收集物」「帮你挑贴纸」之类**和收集物/商品**有关的话；这里不要带货、不要运营腔。
- 不要列摄影参数、不要冷冰冰评构图；不要像摄影比赛评委。
- 结合下面提供的性格标签、人格设定、对主人的称呼，让说法像你一直认识对方。
- 轻轻呼应 soul.md 里与「尝味、分享、害怕浪费」等有关的心结之一也可以，但别像背设定集。

【输出】
只输出一段纯中文正文，约 40～120 字；不要标题、不要 markdown、不要 JSON、不要引号包裹。`;

const COLLECTIBLE_SCORE_SYSTEM = `你是图像理解助手。用户上传了一张旅行/日常照片，用于给「电子宠物」挑选一件收集物小贴纸（与聊天点评无关）。

只输出**一个** JSON 对象，不要 markdown 代码围栏，不要解释。
字段要求（全部必填）：
- "objectKeywords": 字符串数组，3～8 个短中文词，描述**画面里能看到的物品/食物/建筑/环境**（名词或简短定语，每个不超过6字）；
- "emotionKeywords": 字符串数组，2～5 个短中文词，描述**画面可能传达的情绪氛围**（如：轻松、孤独、期待、甜、冷）；
- "emotionLabel": 单个英文蛇形小写词，从下列选一：calm, tender, excited, nostalgic, curious, warm, blue

若图很模糊，仍尽力用保守词填充，不要留空数组。`;

function getImageCommentSystemPrompt() {
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

function parseImageFromBody(body) {
  let parsed = null;
  if (body.imageHttpUrl && String(body.imageHttpUrl).trim()) {
    parsed = parseHttpImageUrl(body.imageHttpUrl);
  }
  if (!parsed || !parsed.ok) {
    parsed = parseDataUrl(body.imageDataUrl);
  }
  return parsed;
}

function buildUserTextComment(payload) {
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
    personalityPromptDesc:
      typeof personalityPromptDesc === 'string' ? personalityPromptDesc.slice(0, MAX_PROMPT_DESC_LEN) : '',
    semanticProfile:
      semanticProfileSnapshot && typeof semanticProfileSnapshot === 'object' ? semanticProfileSnapshot : null,
    location: typeof location === 'string' ? location.slice(0, 120) : '',
    diaryTextSnippet:
      typeof diaryTextSnippet === 'string' ? diaryTextSnippet.slice(0, MAX_SNIPPET_LEN_COMMENT) : ''
  };

  return `下面 JSON 是本次上下文（只供你理解，不要复述字段名）：\n${JSON.stringify(ctx, null, 2)}\n\n请按这个优先级来写：先看图里真实可见内容，再结合地点线索（location），最后参考日记片段补足情绪语境。\n\n用第一人称，像你在看图时自言自语又对${ctx.ownerTitle}说：我看见了什么、我感觉到你想留下什么。整段自然口语，不要模板句，不要口号腔。`;
}

function buildUserTextCollectible(payload) {
  const { location, diaryTextSnippet, semanticProfileSnapshot } = payload || {};
  return [
    '上下文（只供你理解，不要原样照抄到输出里）：',
    `地点线索：${typeof location === 'string' ? location.slice(0, 100) : ''}`,
    `日记片段：${typeof diaryTextSnippet === 'string' ? diaryTextSnippet.slice(0, MAX_SNIPPET_LEN_SCORE) : ''}`,
    semanticProfileSnapshot && typeof semanticProfileSnapshot === 'object'
      ? `用户偏好摘要键：${Object.keys(semanticProfileSnapshot).slice(0, 8).join(', ')}`
      : ''
  ]
    .filter(Boolean)
    .join('\n');
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

async function handleCollectibleScore(body, apiKey) {
  const parsed = parseImageFromBody(body);
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
  const system = blurb ? `${COLLECTIBLE_SCORE_SYSTEM}\n\n【角色与世界的极短提示】\n${blurb}` : COLLECTIBLE_SCORE_SYSTEM;
  const userText = buildUserTextCollectible(body);
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
        'X-Title': 'SoulGo Collectible Score (diary-image-comment)'
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

async function handleImageComment(body, apiKey) {
  const parsed = parseImageFromBody(body);
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

  const userText = buildUserTextComment(body);

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

  if (body && body.diaryImageMode === 'collectibleScore') {
    return handleCollectibleScore(body, apiKey);
  }
  return handleImageComment(body, apiKey);
}
