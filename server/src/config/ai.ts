// "gemini-flash-latest" always points at Google's current Flash model, so a
// retired model name can't silently break the app. Override with GEMINI_MODEL.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
