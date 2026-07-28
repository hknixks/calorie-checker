import type { DetectedFood } from './types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const PROMPT = `You are helping estimate the calories in a photo of a meal. The user is Nigerian, so West African dishes are likely.

List every distinct food and drink you can see. Rules:
- Use the common Nigerian name where one applies (jollof rice, eba, egusi soup, dodo, moi moi, suya, ewa agoyin, amala, ogbono, ponmo, boli, akara, pap).
- Split a plate into its separate parts. "Eba and egusi soup with beef" is three items: eba, egusi soup, beef.
- Name the swallow and the soup separately, and list meat or fish separately from the soup.
- estimated_grams is the cooked weight on the plate, your single best number. Typical anchors: one wrap of eba or pounded yam 200-300 g, one ladle of soup 120-180 g, one plate of jollof 250-400 g, one piece of chicken 80-120 g, one slice of dodo 25 g, one boiled egg 50 g.
- portion_description is how a person would say it: "1 wrap", "2 ladles", "3 slices", "1 medium plate".
- confidence is high when the food is unmistakable, low when you are guessing between look-alikes such as jollof vs fried rice.
- Do not invent food that is not visible. Ignore plates, cutlery and table.
- If the photo has no food at all, return an empty list.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          portion_description: { type: 'string' },
          estimated_grams: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['name', 'portion_description', 'estimated_grams', 'confidence'],
      },
    },
  },
  required: ['items'],
};

export class GeminiError extends Error {}

function friendlyError(status: number, body: string): GeminiError {
  if (status === 400 && /api key not valid|API_KEY_INVALID/i.test(body)) {
    return new GeminiError(
      'Google rejected that API key. Check VITE_GEMINI_API_KEY in your .env file, then restart the dev server.',
    );
  }
  if (status === 403) {
    return new GeminiError(
      'Google refused the key (403). Make sure the Generative Language API is enabled for it.',
    );
  }
  if (status === 404) {
    return new GeminiError(
      'That model name was not found. Set VITE_GEMINI_MODEL in .env to a current model, e.g. gemini-2.5-flash.',
    );
  }
  if (status === 429) {
    return new GeminiError('Free-tier limit hit (429). Wait a minute and try again.');
  }
  if (status >= 500) {
    return new GeminiError('Google’s servers had a problem. Try again in a moment.');
  }
  return new GeminiError(`Gemini request failed (${status}). ${body.slice(0, 200)}`);
}

interface IdentifyArgs {
  base64: string;
  mimeType: string;
  apiKey: string;
  model: string;
}

/** Send the photo to Gemini and get back a list of foods it thinks it can see. */
export async function identifyFoods({
  base64,
  mimeType,
  apiKey,
  model,
}: IdentifyArgs): Promise<DetectedFood[]> {
  if (!apiKey) {
    throw new GeminiError('No Gemini API key found. Set VITE_GEMINI_API_KEY in .env.');
  }

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new GeminiError('Could not reach Google. Check your internet connection.');
  }

  if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ''));

  const payload = await res.json();
  const text: string | undefined = payload?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');

  if (!text) {
    const blocked = payload?.promptFeedback?.blockReason;
    throw new GeminiError(
      blocked
        ? `Gemini declined to analyse that image (${blocked}).`
        : 'Gemini returned an empty response. Try another photo.',
    );
  }

  return parseItems(text);
}

/** Tolerate a stray code fence even though we asked for raw JSON. */
function parseItems(text: string): DetectedFood[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new GeminiError('Could not read Gemini’s reply as JSON. Try again.');
  }

  const raw = Array.isArray(parsed)
    ? parsed
    : ((parsed as { items?: unknown }).items ?? []);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): DetectedFood | null => {
      const e = entry as Record<string, unknown>;
      const name = typeof e.name === 'string' ? e.name.trim() : '';
      if (!name) return null;
      const grams = Number(e.estimated_grams);
      const confidence = e.confidence;
      return {
        name,
        portion_description:
          typeof e.portion_description === 'string' ? e.portion_description : '',
        estimated_grams: Number.isFinite(grams) && grams > 0 ? Math.min(grams, 3000) : 150,
        confidence:
          confidence === 'high' || confidence === 'low' ? confidence : 'medium',
      };
    })
    .filter((x): x is DetectedFood => x !== null);
}
