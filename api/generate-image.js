
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

    // Prefer environment variable, then user input, then default
    const model = process.env.OPENROUTER_IMAGE_MODEL || userModel || 'google/gemini-2.0-flash-exp';

    const payload = {
        model,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        // OpenRouter specific parameter for image generation
        modalities: ["image"]
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
        // OpenRouter image generation typically returns images in message.images array (Base64)
        // or sometimes as a URL in content depending on the model.
        // We will try to find it in both places.
        
        let imageUrl = null;
        const message = data.choices && data.choices[0] && data.choices[0].message;

        if (message) {
            // Check for images array (Base64 or URL object)
            if (message.images && message.images.length > 0) {
                // Some models return { url: "..." } or { b64_json: "..." } inside images array
                // The search result example showed: image.image_url.url
                // Let's handle a few common structures safely
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
            
            // If not found in images array, check content for markdown image syntax or plain URL
            if (!imageUrl && message.content) {
                const content = message.content;
                // Regex for markdown image: ![alt](url)
                const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
                if (mdMatch && mdMatch[1]) {
                    imageUrl = mdMatch[1];
                } else if (content.startsWith('http')) {
                    imageUrl = content.trim();
                }
            }
        }

        if (!imageUrl) {
            return new Response(
                JSON.stringify({ error: 'no_image_generated', message: 'Model did not return a recognizable image.', raw_response: data }),
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
