
/**
 * Vercel Serverless Function: Generate image using OpenRouter API.
 * 
 * Input: { "prompt": "string", "model": "optional_string" }
 * Output: { "image_url": "string (base64 or http url)" }
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

    const { prompt, model: userModel } = body;
    if (!prompt) {
        return new Response(
            JSON.stringify({ error: 'missing_prompt', message: 'Prompt is required.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 约束：不在图中生成任何文字，避免乱码
    const noTextInstruction = 'Important: The image must not contain any text, words, letters, signs, labels, captions, or writing. No text overlay. Pure visual scene only. ';
    const finalPrompt = noTextInstruction + prompt;

    // Prefer environment variable, then user input, then default (image-capable model)
    // Use google/gemini-2.5-flash-image; -preview suffix can 404 on OpenRouter
    const model = process.env.OPENROUTER_IMAGE_MODEL || userModel || 'google/gemini-2.5-flash-image';

    const payload = {
        model,
        messages: [
            {
                role: 'user',
                // Use array format for better Gemini compatibility (per OpenRouter docs)
                content: [{ type: 'text', text: finalPrompt }]
            }
        ],
        // OpenRouter: use ["image", "text"] for multimodal models (e.g. Gemini)
        modalities: ["image", "text"]
    };

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'SoulGo Travel Diary Image Gen'
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
        
        // Extract image from response
        // OpenRouter/Gemini can return images in multiple formats:
        // 1. message.images[] with imageUrl.url or image_url.url (Base64 data URL)
        // 2. message.content as array of parts: { type: "image_url", image_url: { url } }
        // 3. message.content as string with markdown image or plain URL
        let imageUrl = null;
        const message = data.choices && data.choices[0] && data.choices[0].message;

        if (message) {
            // 1. Check for images array (Base64 or URL object)
            if (message.images && message.images.length > 0) {
                const firstImage = message.images[0];
                if (typeof firstImage === 'string') {
                    imageUrl = firstImage;
                } else if (firstImage.url) {
                    imageUrl = firstImage.url;
                } else if (firstImage.imageUrl && firstImage.imageUrl.url) {
                    imageUrl = firstImage.imageUrl.url;  // camelCase (OpenRouter docs)
                } else if (firstImage.image_url && firstImage.image_url.url) {
                    imageUrl = firstImage.image_url.url;
                } else if (firstImage.b64_json) {
                    imageUrl = `data:image/png;base64,${firstImage.b64_json}`;
                }
            }
            
            // 2. Check content as array of parts (OpenAI-style multimodal)
            if (!imageUrl && Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'image_url' && part.image_url && part.image_url.url) {
                        imageUrl = part.image_url.url;
                        break;
                    }
                    if (part.type === 'image' && (part.image_url || part.url)) {
                        imageUrl = (part.image_url && part.image_url.url) || part.url;
                        break;
                    }
                }
            }
            
            // 3. Check content as string (markdown image or plain URL)
            if (!imageUrl && typeof message.content === 'string') {
                const content = message.content;
                const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
                if (mdMatch && mdMatch[1]) {
                    imageUrl = mdMatch[1];
                } else if (content.startsWith('http') || content.startsWith('data:')) {
                    imageUrl = content.trim();
                }
            }
        }

        if (!imageUrl) {
            // Log structure for debugging (avoid exposing full raw_response to client)
            console.error('[generate-image] Unparseable response structure:', JSON.stringify({
                hasChoices: !!(data.choices && data.choices.length),
                messageKeys: message ? Object.keys(message) : null,
                hasImages: message?.images?.length,
                contentType: message?.content ? (Array.isArray(message.content) ? 'array' : typeof message.content) : null
            }));
            return new Response(
                JSON.stringify({ error: 'no_image_generated', message: 'Model did not return a recognizable image.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ image_url: imageUrl }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'internal_error', message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
