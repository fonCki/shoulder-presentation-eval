// -----------------------------------------------------------------------------
// OpenAI Client
// -----------------------------------------------------------------------------
// Extracts numerical labels from images using GPT-4 Vision.
// Reads tag from the corner of a photo.
// API key is read from environment variables (VITE_OPENAI_KEY).
// -----------------------------------------------------------------------------
import { parseLabelToken } from './labelParser';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;
const ENDPOINT   = 'https://api.openai.com/v1/chat/completions';

/* ---------- Helpers ---------- */
async function bitmapToDataUrl(bmp: ImageBitmap): Promise<string> {
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);

    const blob: Blob = await new Promise(res =>
        c.toBlob(b => res(b!), 'image/png', 0.8)
    );

    const b64 = await blob.arrayBuffer().then(buf => {
        let bin = ''; new Uint8Array(buf).forEach(b => bin += String.fromCharCode(b));
        return btoa(bin);
    });

    return `data:image/png;base64,${b64}`;
}

/* ---------- Label Extraction ---------- */
/**
 * Extracts a numerical label from an image using OpenAI's Vision API.
 * @param bmp The image to process.
 * @returns A number between 0 and 1, or null if no label is found.
 */
export async function openaiExtractLabel(bmp: ImageBitmap): Promise<number|null> {
    try {
        const dataURL = await bitmapToDataUrl(bmp);

        const body = {
            model: 'gpt-4o-mini',
            max_tokens: 4,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `
The top-left corner of this photo contains one of these tags:
0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1.0
If you see only the digit "1", interpret it as 1.0.
If you see something like 0.47, respond 0.4 (use first decimal).
If two digits without dot (e.g. 47) respond 0.4 (first digit / 10).
If no tag, respond exactly "none".
Reply ONLY with the tag or "none".
              `.trim()
                        },
                        {
                            type: 'image_url',
                            image_url: { url: dataURL }
                        }
                    ]
                }
            ]
        };

        const resp = await fetch(ENDPOINT, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            console.warn('OpenAI error', resp.status, await resp.text());
            return null;
        }

        const json = await resp.json();
        const raw  = json.choices?.[0]?.message?.content?.trim() ?? 'none';
        if (raw === 'none') return null;

        return parseLabelToken(raw);
    } catch (err) {
        console.error(err);
        return null;                // network / quota / parse failure → ignore
    }
}
