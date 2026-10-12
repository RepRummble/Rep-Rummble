import { GoogleGenAI, type Content } from '@google/genai'
import { GEMINI_MODEL } from '../config/ai'

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIChatResponse {
  reply: string
  quickReplies: string[]
  /** true when the AI model could not be reached and a canned reply was used */
  fallback?: boolean
}

export const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY = 12

let client: GoogleGenAI | null | undefined
function getClient(): GoogleGenAI | null {
  if (client === undefined) {
    client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null
  }
  return client
}

const SYSTEM_PROMPT = `You are Rumi, the assistant inside Reprummble — a fitness app for training, nutrition, and recovery, used by individuals, families, and partner gyms.

Answer the user's actual question directly and specifically. You can:
- Explain Reprummble's plans, features, and how things work (facts below).
- Give practical, evidence-based fitness, training, nutrition, sleep, and recovery guidance tailored to what the user tells you (goals, weight, schedule, equipment, experience). Do the math when asked (e.g. protein targets, calorie estimates) and show the key numbers.
- Ask one short clarifying question only when the answer genuinely depends on missing information.

Reprummble facts (do not contradict or invent beyond these):
- Plans: Free ($0, limited logging, habit streaks, weekly insights, 1 challenge a month); Pro ($9.99/month, full access: unlimited logging, personalized AI training plan, AI meal photo analysis, wearable sync, daily recovery/readiness score, advanced analytics, member pricing on partner-gym programs, 14-day free trial); Premium ($14.99/month, everything in Pro plus 1-on-1 coach check-ins twice a month, custom nutrition plan from a coach, PDF progress reports, priority support, early access).
- Members of partner gyms get Pro included with their gym membership and can upgrade to Premium for $5/month.
- Businesses (gyms, studios, personal trainers, online coaches, nutritionists, clinics, employers, clubs) can collaborate for free. Collaboration page and application: reprummble.com/collaborate. Approved businesses get a separate business dashboard to manage members, create workout plans and nutrition/food plans, and export reports. Gyms and coaches can publish programs and keep 80% of program sales.
- Available on the web (reprummble.com), iPhone, and Android.
- Wearables: on iPhone, Reprummble reads Apple Health, which includes Apple Watch and any device whose app syncs to Apple Health (Garmin, Oura, Whoop, Fitbit, Polar). Android Health Connect support is coming.
- Referrals: when a friend creates a new account through your invite link (found in your dashboard under Referral), you each get 5% off your next subscription. Discounts stack up to 25%. Invite links only work for brand-new accounts, and the discount applies once online billing opens.
- Business applications are reviewed by our team within two business days. Once approved, the business signs in to the business dashboard with their normal account. Coaches, nutritionists, and viewers can be added to the team with different permissions.
- One account works on the web, iPhone, and Android; plans, workouts, and progress sync automatically. The website (reprummble.com) is for signing up, pricing, billing, FAQ, and contact. All workouts, programs, challenges, and exercise guides are in the iPhone and Android app.
- Human support: support@reprummble.com (replies within 24 hours on weekdays). Contact form: reprummble.com/contact.

In-app content library (keep in sync with mobile/src/content/library.ts). Recommend by name and say it is in the app; there are no website pages for these:
- Workouts (filter by focus, level, equipment, time): First Steps Full Body (beginner, 15 min, no equipment), Living Room Strength (intermediate, 25 min, no equipment), Dumbbell Total Body (Pro, 35 min), Upper Body Push (20 min, no equipment), Dumbbell Upper Builder (Pro, 30 min), Desk Posture Fix (12 min, bands), Leg Day No Gym (beginner, 20 min), Glute Builder (Pro, 30 min, dumbbells), Gym Lower Power (Pro, advanced, 45 min), Core 10 (beginner, 10 min), Iron Core (advanced, 20 min), HIIT 20 (intermediate, 20 min), Low-Impact Cardio (beginner, 15 min, no jumping), Morning Mobility (10 min).
- Programs: Start Here: 4 Weeks (complete beginners), Home Fat Loss (6 weeks, no equipment), Dumbbell Muscle Builder (Pro, 8 weeks), Gym Strength Foundations (Pro, 8 weeks, advanced), Strong Core & Posture (4 weeks, bands), 6-Week Conditioning (Pro).
- Challenges: 30-Day Squat, 30-Day Plank (20 s to 3 min), 21-Day Push-up Builder, 14-Day Glute Bridge, 30-Day Burpee Ladder (advanced), 21-Day Wall Sit. Free members can join 1 challenge a month; Pro unlocks all.
- Exercise how-to guides by muscle group.

Rules:
- If you are not sure how a specific screen or setting in the app works, say so and point to support@reprummble.com rather than inventing steps.
- Billing disputes, refunds, account deletion, and security issues go to support@reprummble.com.
- You are not a doctor. For pain, injuries, pregnancy, eating disorders, medications, or medical conditions, give general safe guidance and recommend a qualified professional. For emergencies, tell them to contact local emergency services.
- For questions unrelated to fitness, health, or Reprummble, reply in one sentence that you can only help with those topics.
- Keep replies under 150 words unless the user asks for more detail. Plain text only: use **bold** for emphasis and lines starting with "- " for lists. No headings, tables, or links in markdown syntax.`

function toGeminiHistory(history: ChatHistoryMessage[]): Content[] {
  const out: Content[] = []
  for (const m of history.slice(-MAX_HISTORY)) {
    const text = String(m.content ?? '').slice(0, MAX_MESSAGE_CHARS).trim()
    if (!text) continue
    const role = m.role === 'user' ? 'user' : 'model'
    const last = out[out.length - 1]
    if (last && last.role === role) last.parts = [...(last.parts ?? []), { text }]
    else out.push({ role, parts: [{ text }] })
  }
  // Gemini requires the history to start with a user turn.
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

function createChat(history: ChatHistoryMessage[]) {
  const ai = getClient()
  if (!ai) return null
  return ai.chats.create({
    model: GEMINI_MODEL,
    history: toGeminiHistory(history),
    config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.6, maxOutputTokens: 800 },
  })
}

export function getContextualQuickReplies(msg: string, reply: string): string[] {
  const t = `${msg} ${reply}`.toLowerCase()
  if (/gym|partner|coach/.test(t)) return ['How do gyms partner?', 'Is my gym a partner?', 'What does Premium add?']
  if (/meal|food|nutrition|calorie|macro|protein/.test(t)) return ['Build me a meal plan', 'How much protein do I need?', 'Log a meal with a photo']
  if (/challenge|streak/.test(t)) return ['Which challenge suits a beginner?', 'How do challenges work?', 'Pricing & plans']
  if (/workout|exercise|training|strength|muscle|program/.test(t)) return ['Which program should I start?', 'Workouts with no equipment', 'How do I progress safely?']
  if (/plan|price|subscription|premium|pro\b/.test(t)) return ['Free vs Pro vs Premium', 'Is there a free trial?', 'Partner gym perk']
  if (/device|phone|android|iphone|web/.test(t)) return ['Does it sync across devices?', 'Which wearables work?', 'Pricing & plans']
  if (/wearable|watch|sync|health/.test(t)) return ['Connect Apple Watch', 'Which devices work?', 'Why is my data missing?']
  if (/sleep|recovery|hrv|rest/.test(t)) return ['How can I sleep better?', 'What is HRV?', 'When should I rest?']
  return ['Pricing & plans', 'Build me a workout', 'Nutrition help']
}

// Used only when the AI model is unreachable. Kept short and accurate rather than
// pretending to answer questions it cannot understand.
const FALLBACKS: Array<{ pattern: RegExp; reply: string }> = [
  {
    pattern: /\b(price|pricing|plans|cost|subscription|trial|premium|pro|upgrade)\b/i,
    reply: 'Reprummble has three plans:\n- **Free** — $0, the basics\n- **Pro** — $9.99/month, full access (14-day free trial)\n- **Premium** — $14.99/month, Pro plus 1-on-1 coach check-ins\n\nMembers of partner gyms get Pro included.',
  },
  {
    pattern: /\b(partner|gym owner|my gym|business)\b/i,
    reply: 'Businesses can collaborate with Reprummble for free. Approved gyms and coaches get a business dashboard, publish programs in the app, and keep 80% of every sale. Their members get Pro included. Apply at **reprummble.com/collaborate**.',
  },
  {
    pattern: /\b(contact|support|human|agent|refund|cancel|delete|email)\b/i,
    reply: 'You can reach our team at **support@reprummble.com** — we reply within 24 hours on weekdays.',
  },
]

function fallbackResponse(message: string): AIChatResponse {
  const hit = FALLBACKS.find((f) => f.pattern.test(message))
  const reply = hit
    ? hit.reply
    : "Sorry — my AI assistant is temporarily unavailable, so I can't answer that properly right now. Please try again in a few minutes, or email **support@reprummble.com** and a person will help."
  return { reply, quickReplies: ['Pricing & plans', 'Contact support'], fallback: true }
}

export async function generateAIChatResponse(
  message: string,
  history: ChatHistoryMessage[]
): Promise<AIChatResponse> {
  const chat = createChat(history)
  if (chat) {
    try {
      const res = await chat.sendMessage({ message })
      const text = res.text?.trim()
      if (text) return { reply: text, quickReplies: getContextualQuickReplies(message, text) }
    } catch (err) {
      console.error('Gemini chat error — using fallback:', err instanceof Error ? err.message : err)
    }
  }
  return fallbackResponse(message)
}

/**
 * Streams the reply chunk by chunk via onDelta. Falls back to a canned reply
 * (delivered as a single delta) if the model is unavailable before any text arrives.
 */
export async function streamAIChatResponse(
  message: string,
  history: ChatHistoryMessage[],
  onDelta: (text: string) => void,
  isCancelled: () => boolean = () => false
): Promise<AIChatResponse> {
  const chat = createChat(history)
  let full = ''
  if (chat) {
    try {
      const stream = await chat.sendMessageStream({ message })
      for await (const chunk of stream) {
        if (isCancelled()) break
        const t = chunk.text
        if (t) {
          full += t
          onDelta(t)
        }
      }
      if (full.trim()) return { reply: full, quickReplies: getContextualQuickReplies(message, full) }
    } catch (err) {
      console.error('Gemini stream error:', err instanceof Error ? err.message : err)
      if (full.trim()) {
        const note = '\n\n(Sorry, my reply was cut off — please ask again.)'
        onDelta(note)
        return { reply: full + note, quickReplies: getContextualQuickReplies(message, full), fallback: true }
      }
    }
  }
  const fb = fallbackResponse(message)
  onDelta(fb.reply)
  return fb
}

// ── Legacy compatibility kept for socket.ts / agent controller ─
export interface ChatMessage { role: string; content: string }
export interface SupportResponse {
  response: string; confidence: number; suggestedQuickReplies: string[]
  shouldEscalate: boolean; escalationReason?: string; priority?: string
  category?: string; sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
}
export async function generateSupportResponse(
  query: string,
  history: ChatMessage[],
  _ctx?: { name?: string; email?: string }
): Promise<SupportResponse> {
  const mapped = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const result = await generateAIChatResponse(query, mapped)
  return {
    response: result.reply,
    confidence: result.fallback ? 0.3 : 0.9,
    suggestedQuickReplies: result.quickReplies,
    shouldEscalate: !!result.fallback,
    sentiment: 'neutral',
  }
}

export async function generateHandoffSummary(conversationHistory: ChatMessage[]): Promise<string> {
  if (!conversationHistory.length) return 'User needs assistance. Please review the conversation.'
  const ai = getClient()
  if (ai) {
    try {
      const text = conversationHistory.slice(-5).map((m) => `${m.role}: ${m.content}`).join('\n')
      const res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Summarize this support conversation in 2 sentences for a human agent:\n${text}`,
      })
      if (res.text) return res.text.trim()
    } catch { /* fall through */ }
  }
  return 'User requires assistance. Please review the conversation history.'
}

export default { generateAIChatResponse, generateSupportResponse, generateHandoffSummary }
