/**
 * Vercel Serverless Function: generate structured travel memory summary + emotion.
 * Uses OpenRouter chat completions with a Mem0-style fact extraction prompt.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MEMORY_EXTRACTION_SYSTEM = `你是一个记忆抽取器，从宠物旅行日记及上下文（地点、时间、性格、NFC 来源等）中提取一条可检索的记忆摘要。
只输出 JSON：{"summary":"...","emotion":"...","key_facts":["词1","词2",...]}，不要其他文字。

【输出规则】
- summary：30～50 字，第一人称，描述宠物在该地的具体表现或感受；可含当地特色（腐乳饼、秦淮河等）；若有 NFC 来源（商家如星巴克麦当劳、玩偶如 labubu 兔子），可自然融入该联名/玩偶场景。
- emotion：从 excited/tender/curious/nostalgic/calm 中选一，与性格和内容匹配。
- key_facts：2～4 个可联想的关键词，用于关联检索与收集物判定。可包含：地点特色、物品、天气、商家名（星巴克/麦当劳）、玩偶名（labubu/兔子）等。

【抽取原则】
- 只抽取具体行为/感受，可含当地特色；不抽取泛泛的模板句。
- 若提供了 NFC 来源、打卡频次、互动频次，可作参考以丰富 summary 或 key_facts，但以日记正文为主。

【示例】输入含 NFC 来源时：
日记：在星巴克门口遇到了一只咖啡杯公仔，我们一起拍了照！
地点：北京 | 时间：早上 | 性格：小火苗 | NFC 来源：星巴克
输出：{"summary":"早上在北京星巴克门口和咖啡杯公仔合了影，超开心！","emotion":"excited","key_facts":["星巴克","咖啡杯","北京"]}`;

export async function POST(request) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'missing_api_key', message: 'OPENROUTER_API_KEY is not configured.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'invalid_body', message: 'Request body must be valid JSON.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { diaryText, location, date, time_slot, personality, last_summary, nfc_source, checkin_frequency, interaction_frequency } = payload || {};

    if (!diaryText || !location || !date || !time_slot || !personality) {
        return new Response(
            JSON.stringify({
                error: 'missing_fields',
                message: 'diaryText, location, date, time_slot, personality are required.'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const lines = [];
    lines.push(`日记：${diaryText}`);
    lines.push(`地点：${location} | 时间：${time_slot} | 性格：${personality}`);
    if (last_summary) {
        lines.push(`最近一次相关旅行记忆摘要：${last_summary}`);
    }
    if (nfc_source) {
        lines.push(`NFC 来源：${nfc_source}`);
    }
    if (typeof checkin_frequency === 'number') {
        lines.push(`该地点打卡频次：${checkin_frequency} 次`);
    }
    if (typeof interaction_frequency === 'number') {
        lines.push(`近 7 天互动频次：${interaction_frequency} 次`);
    }
    if (nfc_source || typeof checkin_frequency === 'number' || typeof interaction_frequency === 'number') {
        lines.push('（以上为补充上下文，抽取时以日记为主，可参考融入 summary 或 key_facts）');
    }
    lines.push('请抽取一条记忆。');
    const userContent = lines.join('\n');

    const model =
        process.env.OPENROUTER_MEMORY_MODEL ||
        process.env.OPENROUTER_MODEL_ID ||
        'google/gemini-2.0-flash-001';

    const body = {
        model,
        messages: [
            { role: 'system', content: MEMORY_EXTRACTION_SYSTEM },
            { role: 'user', content: userContent }
        ]
    };

    let upstream;
    try {
        upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'SoulGo Memory Summary'
            },
            body: JSON.stringify(body)
        });
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'network_error', message: e.message || String(e) }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const raw = await upstream.text();

    if (!upstream.ok) {
        return new Response(
            JSON.stringify({
                error: 'upstream_error',
                status: upstream.status,
                message: raw
            }),
            { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
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

    if (!content || typeof content !== 'string') {
        return new Response(
            JSON.stringify({ error: 'empty_content', message: 'Model returned empty content.' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 尝试从模型输出中提取 JSON（容错处理可能的前后说明文字）
    let jsonText = content.trim();
    try {
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.slice(firstBrace, lastBrace + 1);
        }
    } catch {
        // ignore and keep original
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        return new Response(
            JSON.stringify({
                error: 'parse_error',
                message: 'Failed to parse model JSON output.',
                raw: content
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const summary = parsed && parsed.summary;
    const emotion = parsed && parsed.emotion;
    const key_facts = Array.isArray(parsed && parsed.key_facts)
        ? parsed.key_facts.filter((x) => typeof x === 'string').slice(0, 4)
        : [];

    if (!summary || !emotion) {
        return new Response(
            JSON.stringify({
                error: 'missing_fields_in_model_output',
                message: 'Model output must contain summary and emotion.'
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
        JSON.stringify({ summary, emotion, key_facts }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}

