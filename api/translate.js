// Vercel Serverless Function — translates a single English word/phrase to Russian.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { word } = req.body;
    if (!word || typeof word !== "string") return res.status(400).json({ error: "No word" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: "You translate English to Russian. If given a single word or short phrase, reply with only its most common Russian translation (1-4 words). If given a full sentence or longer text, reply with a natural Russian translation of it. Reply with ONLY the Russian translation — no English, no explanations, no quotes.",
        messages: [{ role: "user", content: word.slice(0, 600) }],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || "API error" });
    const translation = data.content?.map((b) => b.text || "").join(" ").trim() || "—";
    return res.status(200).json({ translation });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
