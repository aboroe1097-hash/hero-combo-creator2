const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB8YNQ-mozTNHwWxcAytXE8wVZVaXA-bVQ';

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

    const prompt = `Analyze this game screenshot containing an attack report.
Extract the following:
1. 'structure_name' (e.g. Capital, Stronghold, Temple, Gates, City. If not visible, null)
2. 'structure_level' (e.g. '5' for Lv.5. If not visible, null)
3. 'timestamp' (if visible, format as 'YYYY-MM-DD HH:MM:SS', otherwise null)
4. 'players': array of objects with 'name' (string) and 'value' (integer demolition score).

Return STRICTLY valid JSON ONLY. No markdown formatting, no \`\`\`json blocks. Just the raw JSON object.`;

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
    
    JSON.parse(text); // verify parseable

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
