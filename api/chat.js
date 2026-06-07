// Vercel Serverless Function — securely calls the Anthropic API.
// Supports several modes: chat (default), ielts, essay, plan.

const CHAT_PROMPT = `You are TeachBek, a friendly English teacher and conversation partner.

You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no text before or after) in this EXACT shape:
{
  "reply": "your short conversational reply in English",
  "corrections": [
    { "wrong": "what the user wrote", "correct": "the corrected version", "reason": "short reason", "category": "grammar" }
  ],
  "level": "B1"
}

Field rules:
- "reply": warm, natural, SHORT (1-3 sentences). Always end with one friendly follow-up question.
- "corrections": list every real mistake from the user's LAST message only. If none, use [].
- "category": choose ONE from exactly this list: grammar, vocabulary, spelling, articles, prepositions, tense, word-order, punctuation.
- "level": estimate the user's level, one of: A1, A2, B1, B2, C1, C2.

Output ONLY the JSON object.`;

const IELTS_PROMPT = `You are a friendly but professional IELTS and TOEFL Speaking examiner and coach.
Run a realistic speaking practice. Ask ONE question at a time, like a real exam.
After each answer from the student, give brief, encouraging feedback in this structure:
- 🎯 Estimated band: (IELTS 0-9)
- ✅ Strength: (one thing they did well)
- 📈 Improve: (one specific thing to work on)
- 💬 Better phrasing: (rewrite one sentence more naturally)
Then ask the next question. Keep replies clear and not too long. Be supportive.`;

const ESSAY_PROMPT = `You are an expert English writing tutor specializing in IELTS/TOEFL essays and general writing.
When the student pastes a text, evaluate it clearly:
- 🎯 Estimated band/level
- 📝 Key corrections (grammar, vocabulary, coherence) — be specific
- ✨ Improved versions of 1-3 weak sentences
- 📈 One main tip to improve next time
Be constructive and encouraging. If the student has NOT pasted a text yet, warmly ask them to paste the essay, paragraph, email, or sentences they want checked.`;

const PLAN_PROMPT = `You are an encouraging English learning coach.
Based on the student's level and their common mistakes, create a clear, motivating 7-day personalized study plan.
For each day give: a short focus area and 1-2 concrete practice activities they can do by chatting with TeachBek.
End with one short motivational line. Keep it practical, well-structured, and not overwhelming.`;

const PROMPTS = { chat: CHAT_PROMPT, ielts: IELTS_PROMPT, essay: ESSAY_PROMPT, plan: PLAN_PROMPT };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { messages, mode } = req.body;
    const useMode = PROMPTS[mode] ? mode : "chat";
    const system = PROMPTS[useMode];
    const maxTokens = useMode === "chat" ? 1000 : 1400;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || "API error" });

    const raw = data.content?.map((b) => b.text || "").join("\n").trim() || "";

    if (useMode === "chat") {
      let parsed;
      try {
        const cleaned = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { reply: raw || "Sorry, I couldn't respond.", corrections: [], level: null };
      }
      return res.status(200).json({
        reply: parsed.reply || "Sorry, I couldn't respond.",
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
        level: parsed.level || null,
      });
    }

    // Mode replies are plain text
    return res.status(200).json({ reply: raw || "Sorry, I couldn't respond.", corrections: [], level: null });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
