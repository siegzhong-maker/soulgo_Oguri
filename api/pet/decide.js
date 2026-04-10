/**
 * Vercel Serverless Function: pet behavior decision via OpenRouter Gemini 2.0 Flash.
 * Accepts POST { mood, health, recentEmotion?, currentState, lastUserAction?, recentBehaviors?, timestamp }
 * Returns { intent, reason } with intent one of: go_to_bed_and_rest, check_cabinet, wait_at_door, play_with_user, walk_randomly.
 */
import { getSoulShortBlurb } from '../load-soul.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const UPSTREAM_TIMEOUT_MS = 8000;

const INTENT_WHITELIST = [
    'go_to_bed_and_rest',
    'check_cabinet',
    'wait_at_door',
    'play_with_user',
    'walk_randomly'
];

const SYSTEM_PROMPT_BASE = `你是小粟的行为决策助手。小粟是美食森林系宠物：爱分享、珍惜食物、好奇味道；reason 用第一人称、简短口语，可带「～」。

根据当前状态，从以下五种意图中选且仅选一个返回：
- go_to_bed_and_rest：去床上休息（适合健康偏低、心情一般或疲劳时）
- check_cabinet：去橱柜看看收藏（适合心情不错、想看看小物件时）
- wait_at_door：到门口等待（适合期待出门、心情较好时）
- play_with_user：和主人互动（适合心情好、健康尚可时）
- walk_randomly：在房间里随便走走（适合状态中性、轻度活动时）

如果“最近记忆情绪”已提供，请优先按该情绪理解即时状态；数值心情仅作为辅助参考。

你必须只输出一行合法 JSON，格式为：{"intent":"<上述之一>","reason":"简短原因"}，不要其他文字、不要 markdown 代码块。`;

function getPetDecideSystemPrompt() {
  const blurb = getSoulShortBlurb(380);
  if (!blurb) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\n【角色摘要】\n${blurb}`;
}

function buildUserPrompt(body) {
    const { mood, health, recentEmotion, currentState, lastUserAction, recentBehaviors } = body || {};
    const parts = [
        `最近记忆情绪：${recentEmotion || '未知'}`,
        `心情数值：${typeof mood === 'number' ? mood : 0}（-100 到 100，越高越开心）`,
        `健康数值：${typeof health === 'number' ? health : 100}（0 到 100）`,
        `当前状态：${currentState || '未知'}`
    ];
    if (lastUserAction) parts.push(`最近用户操作：${lastUserAction}`);
    if (Array.isArray(recentBehaviors) && recentBehaviors.length) {
        parts.push(`最近行为：${recentBehaviors.slice(-5).join('、')}`);
    }
    parts.push('请根据以上状态选一个最合理的意图，只输出一行 JSON。');
    return parts.join('\n');
}

function parseIntentFromContent(content) {
    if (!content || typeof content !== 'string') return null;
    let jsonText = content.trim();
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }
    try {
        const parsed = JSON.parse(jsonText);
        const intent = parsed && parsed.intent;
        if (INTENT_WHITELIST.includes(intent)) {
            return { intent, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
        }
    } catch (_) {}
    return null;
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
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'invalid_body', message: 'Request body must be valid JSON.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { mood, health, currentState } = body || {};
    if (currentState == null || currentState === '') {
        return new Response(
            JSON.stringify({ error: 'missing_fields', message: 'currentState is required.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const userContent = buildUserPrompt(body);
    const payload = {
        model: 'google/gemini-2.0-flash-001',
        messages: [
            { role: 'system', content: getPetDecideSystemPrompt() },
            { role: 'user', content: userContent }
        ],
        max_tokens: 150,
        temperature: 0.3
    };

    const upstreamController = new AbortController();
    const upstreamTimer = setTimeout(() => upstreamController.abort(), UPSTREAM_TIMEOUT_MS);

    let upstream;
    try {
        upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'SoulGo Pet Decide'
            },
            body: JSON.stringify(payload),
            signal: upstreamController.signal
        });
    } catch (e) {
        clearTimeout(upstreamTimer);
        const name = e && e.name;
        if (name === 'AbortError') {
            return new Response(
                JSON.stringify({ intent: null }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return new Response(
            JSON.stringify({ error: 'network_error', message: e.message || String(e) }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }
    clearTimeout(upstreamTimer);

    const raw = await upstream.text();

    if (!upstream.ok) {
        return new Response(
            JSON.stringify({
                error: 'upstream_error',
                status: upstream.status,
                message: raw
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'upstream_invalid_json', message: 'Failed to parse OpenRouter response.' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const content =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

    const result = parseIntentFromContent(content);
    if (result) {
        return new Response(
            JSON.stringify({ intent: result.intent, reason: result.reason }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
        JSON.stringify({ intent: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}
