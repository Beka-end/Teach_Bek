// Vercel Serverless Function — securely calls the Anthropic API.
// The API key lives in Vercel Environment Variables, never in the browser.

const SYSTEM_PROMPT = `You are TeachBek, a friendly English teacher and conversation partner.

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
- "level": your best estimate of the user's English level, one of: A1, A2, B1, B2, C1, C2.

Output ONLY the JSON object.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { messages } = req.body;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || "API error" });

    const raw = data.content?.map((b) => b.text || "").join("\n").trim() || "";
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
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
