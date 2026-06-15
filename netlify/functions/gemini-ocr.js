const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function tryRepairJson(text) {
  try { return JSON.parse(text); } catch (e) {
    if (!e.message.includes('Bad escaped character') && !e.message.includes('Invalid escape') && !e.message.includes('Unexpected token') && !e.message.includes('Expected')) throw e;
  }
  let repaired = text.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
  repaired = repaired.replace(/[\x00-\x1f]/g, (match) => {
    const code = match.charCodeAt(0);
    if (code === 0x08) return '\\b'; if (code === 0x09) return '\\t'; if (code === 0x0a) return '\\n';
    if (code === 0x0c) return '\\f'; if (code === 0x0d) return '\\r';
    return '\\u' + code.toString(16).padStart(4, '0');
  });
  return JSON.parse(repaired);
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Method Not Allowed' };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'No image provided' }) };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are an expert game data analyzer. Analyze this screenshot of an attack/demolition report.
Extract ALL visible player entries accurately.

RULES FOR EXTRACTION:
1. 'structure_name': the name of the attacked building (e.g. Capital, Stronghold, Temple, Gates, City, Town). If not clearly visible, null.
2. 'structure_level': the integer level of the structure (e.g. "5"). If not visible, null.
3. 'timestamp': the date/time shown, formatted strictly as 'YYYY-MM-DD HH:MM:SS'. If not visible, null.
4. 'players': an array of objects, each containing exactly two keys: 'name' and 'value'.
   - 'name' (string): Extract the player's FULL name exactly as written. INCLUDE any alliance tags (e.g., "[ABC]Player"), numbers, and special characters. Do NOT truncate or simplify.
   - 'value' (integer): Extract the Demolition damage score or points for the player. Remove any commas (e.g., convert "1,234,567" to 1234567). Only extract the demolition score, NOT troop counts or power levels.

CRITICAL JSON FORMATTING RULES:
- Output ONLY valid, raw JSON.
- Do NOT wrap the JSON in markdown blocks (no \`\`\`json).
- Do NOT include any commentary, explanations, or text outside the JSON object.

EXPECTED JSON SCHEMA:
{
  "structure_name": "Capital",
  "structure_level": "5",
  "timestamp": "2026-06-12 14:13:00",
  "players": [
    {"name": "[VTS]Lord_IKR", "value": 81357},
    {"name": "Gamer123", "value": 1500}
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
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: data.error?.message || 'API Error' }) };
    }

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    tryRepairJson(text); // verify parseable, otherwise will throw to catch block

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: text
    };

  } catch (err) {
    console.error('OCR Error:', err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
