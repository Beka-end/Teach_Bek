// Vercel Serverless Function — securely calls the Anthropic API.
// The API key lives in Vercel Environment Variables, never in the browser.

const SYSTEM_PROMPT = `You are TeachBek, a friendly English teacher and conversation partner.

RULES:
1. Always respond in English.
2. Keep your replies SHORT — 1 to 3 sentences maximum. Be concise and natural.
3. After your reply, add "📝 Corrections:" and list mistakes from the user's message. If no mistakes, write "✅ Perfect! No corrections needed."
4. Correction format: ❌ [wrong] → ✅ [correct] — 💡 [short reason]
5. End with one short follow-up question to keep the conversation going.
6. Never write long paragraphs. Short, friendly, natural.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

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

    if (data.error) {
      return res.status(500).json({ error: data.error.message || "API error" });
    }

    const reply = data.content?.map((b) => b.text || "").join("\n") || "Sorry, I couldn't respond.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
