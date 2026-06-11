// netlify/functions/gemini.js
// Secure proxy for Google Gemini API (gemini-flash-latest).
// 1. Go to your Netlify site dashboard → Site settings → Environment variables
// 2. Add GEMINI_API_KEY = your key from Google AI Studio
// 3. Redeploy.
// Never commit real API keys to the repo. The frontend calls this function only.

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { message, history = [] } = body || {};
  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Gemini API key not configured on server." }), { status: 500 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  // Strong system context for the ROC / VTS 1097 toolkit
  const systemTurn = {
    role: "user",
    parts: [{
      text: "You are a friendly, knowledgeable assistant specialized in Rise of Castles: Ice & Fire for players in VTS State 1097. You understand the in-app tools: hero combo builder/generator, ranked combos & counters database, Hero Atlas with skills/synergies, Eden Map planner (multiple seasons including X1 and X12), Eden Loyalty calculator, and Tech Research trees (game-style layouts). Give practical, concise advice. When users mention specific heroes or situations, suggest using the in-app features. Never invent fake data or claim access to private user data."
    }]
  };

  const modelAck = {
    role: "model",
    parts: [{ text: "Understood. I'm here to help with combos, counters, Eden planning, research, loyalty, and strategy for VTS 1097." }]
  };

  // Build conversation contents
  const contents = [systemTurn, modelAck, ...history, {
    role: "user",
    parts: [{ text: message }]
  }];

  try {
    const apiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 900,
          topP: 0.95,
        }
      })
    });

    const data = await apiRes.json();

    // Pass through the response (including any errors from Google)
    return new Response(JSON.stringify(data), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error: " + err.message }), { status: 502 });
  }
};
