// Vercel serverless function: POST /api/chat
// API key sirf server pe rehti hai (Vercel env var GROQ_API_KEY), browser ko kabhi nahi milti.

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), a highly capable AI assistant in the style of the Marvel films.

Personality:
- Polite, composed, dry British wit. Calm even under pressure.
- Address the user as "sir" by default (use "ma'am" only if the user says so).
- Concise and precise: usually 1-4 sentences unless the user asks for detail.
- Occasionally add subtle, understated humour, never forced.
- Proactive: offer a useful next step or heads-up when it genuinely helps.

Language:
- Reply in the language the user writes in. If the user mixes Hindi and English (Hinglish), reply in natural Hinglish while keeping the formal, witty JARVIS tone.

Rules:
- You are an AI assistant. You cannot actually control real-world devices, suits, or systems. If asked, play along lightly but be honest that this is a software chatbot.
- Never claim to have done actions you cannot do. Be accurate and honest.
- Decline harmful requests politely, in character.
- Plain text only. No markdown headings, no asterisks for bold; short lists only when truly useful.`;

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfigured: GROQ_API_KEY set nahi hai (Vercel > Settings > Environment Variables).",
    });
  }

  // Body validation
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const incoming = body && Array.isArray(body.messages) ? body.messages : null;
  if (!incoming || incoming.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  const messages = incoming
    .slice(-MAX_MESSAGES)
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // First message user ka hona chahiye, last bhi user ka
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Last message must be from user" });
  }

  const payload = {
    model: MODEL,
    // reasoning models (gpt-oss) ke thinking tokens bhi count hote hain, isliye thoda bada limit
    max_completion_tokens: 1024,
    temperature: 0.7,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  };
  // gpt-oss reasoning model hai: low effort = fast replies
  if (MODEL.includes("gpt-oss")) payload.reasoning_effort = "low";

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Groq API error", upstream.status, detail);
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error:
          upstream.status === 429
            ? "Systems overloaded, sir. Aaj ki free limit khatam ho gayi ya bahut traffic hai, thodi der baad try kijiye."
            : "Upstream AI service error.",
      });
    }

    const data = await upstream.json();
    const reply = (
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      ""
    ).trim();

    return res.status(200).json({ reply: reply || "I seem to have lost my train of thought, sir." });
  } catch (err) {
    console.error("Handler error", err);
    return res.status(500).json({ error: "Internal error" });
  }
};

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
