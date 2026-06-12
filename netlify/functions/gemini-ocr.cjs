const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No image provided' }) };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Analyze this game screenshot containing an attack report.
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
}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return { statusCode: 500, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
    }

    let text = data.candidates[0].content.parts[0].text;
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
