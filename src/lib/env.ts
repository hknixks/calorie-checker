/**
 * Gemini config comes from the .env file at the project root, read at build /
 * dev-server start. Editing .env needs a dev-server restart to take effect.
 *
 * Worth knowing: Vite inlines VITE_* values into the JavaScript bundle, so the
 * key is readable by anyone who can load the built site. That is fine for
 * running this on your own machine or phone; if you ever host it publicly, put
 * the key behind a small server-side proxy instead.
 */
export const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();

export const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL ?? '').trim() || 'gemini-2.5-flash';

export const HAS_GEMINI_KEY = GEMINI_API_KEY.length > 0;
