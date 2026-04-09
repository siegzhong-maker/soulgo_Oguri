
/**
 * Vercel Serverless Function: Generate furniture asset using OpenRouter API.
 * 
 * Input: { "location": "string", "diary_excerpt": "string", "city": "string" }
 * Output: { "image_url": "string", "item_name": "string", "assetSource": "ai_daily", "scarcity": "soft_capped", "source_location": "string" }
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

    const { location, diary_excerpt, city } = body;
    if (!location) {
        return new Response(
            JSON.stringify({ error: 'missing_location', message: 'Location is required.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const cityStr = city ? `(${city})` : '';
    const imagePrompt = `TEXT RULE: No readable text anywhere — no Chinese, no Latin words or labels, no numbers on signs, no packaging typography, no logos, no watermarks. Pure illustration only.

Design a single piece of furniture/decor item inspired by this location: "${location}" ${cityStr}. 
    Style: Isometric 3D game asset, cute cartoon style, soft cream background (hex #fffaf0 or #fdfbf7), soft lighting, 3D render, Blender style. 
    Subject: A single object (e.g., chair, table, lamp, decor) that fits the location's theme. 
    Constraint: Absolutely zero text in the image; no shop signs or captions. 
    Context: ${diary_excerpt ? diary_excerpt.slice(0, 100) : ''}...`;

    const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

    const payload = {
        model,
        messages: [
            {
                role: 'user',
                content: imagePrompt
            }
        ],
        modalities: ["image", "text"]
    };

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'SoulGo Furniture Gen'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            return new Response(
                JSON.stringify({ error: 'upstream_error', message: errorText, status: res.status }),
                { status: res.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await res.json();
        
        // Extract image
        let imageUrl = null;
        let itemName = `Souvenir from ${location}`; // Default name
        
        const message = data.choices && data.choices[0] && data.choices[0].message;

        if (message) {
            // Try to extract image
            if (message.images && message.images.length > 0) {
                const firstImage = message.images[0];
                if (typeof firstImage === 'string') {
                    imageUrl = firstImage;
                } else if (firstImage.url) {
                    imageUrl = firstImage.url;
                } else if (firstImage.image_url && firstImage.image_url.url) {
                    imageUrl = firstImage.image_url.url;
                } else if (firstImage.b64_json) {
                    imageUrl = `data:image/png;base64,${firstImage.b64_json}`;
                }
            } 
            
            if (!imageUrl && message.content) {
                const content = message.content;
                const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
                if (mdMatch && mdMatch[1]) {
                    imageUrl = mdMatch[1];
                } else if (content.startsWith('http')) {
                    imageUrl = content.trim();
                }
            }
            
            // Try to extract a name if the model generated text along with the image
            // This depends on the model's behavior. Gemini often outputs text + image.
            if (message.content) {
                // Heuristic: If content is short and not a URL, it might be a description.
                // But let's just stick to a safe default for now to avoid breaking things.
                // We could try to parse "Item: [Name]" if we prompted for it, but let's keep it robust.
            }
        }

        if (!imageUrl) {
            return new Response(
                JSON.stringify({ error: 'no_image_generated', message: 'Model did not return a recognizable image.', raw_response: data }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                image_url: imageUrl,
                item_name: itemName,
                assetSource: 'ai_daily',
                scarcity: 'soft_capped',
                source_location: String(location || '').trim()
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'internal_error', message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
