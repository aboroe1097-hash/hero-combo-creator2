// Z.AI (GLM) OCR function — kept for reference / local testing
// On GitHub Pages this is not called; the client falls back to browser-side Z.AI API.
const ZAI_API_KEY = process.env.ZAI_API_KEY;

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
    }

    const models = ['glm-4v-flash', 'glm-4.6v'];
    let data = null;
    let usedModel = null;

    for (const model of models) {
      const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this game screenshot containing an attack report.
Extract the following:
1. 'structure_name' (e.g. Capital, Stronghold, Temple, Gates, City. If not visible, null)
2. 'structure_level' (e.g. '5' for Lv.5. If not visible, null)
3. 'timestamp' (if visible, format as 'YYYY-MM-DD HH:MM:SS', otherwise null)
4. 'players': array of objects with 'name' (string) and 'value' (integer demolition score).

Return STRICTLY valid JSON ONLY. No markdown formatting, no \`\`\`json blocks. Just the raw JSON object.
Example:
{
  "structure_name": "Capital",
  "structure_level": "5",
  "timestamp": "2026-06-12 14:13:00",
  "players": [
    {"name": "Lord_IKR", "value": 81357}
  ]
}` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }]
        })
      });

      data = await response.json();

      if (response.ok) {
        usedModel = model;
        break;
      }

      const errMsg = data.error?.message || '';
      if (!errMsg.includes('not found') && !errMsg.includes('not support') && !errMsg.includes('not exist')) {
        return { statusCode: 500, body: JSON.stringify({ error: errMsg || 'API Error' }) };
      }
    }

    if (!usedModel) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No available Z.AI model' }) };
    }

    let text = data.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    JSON.parse(text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };

  } catch (err) {
    console.error('OCR Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
