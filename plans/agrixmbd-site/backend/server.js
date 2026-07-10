// AGRIXMBD 2.0 — Daily AI Fusion Report backend
//
// Why this exists: the frontend (agrixmbd-digital-twin.html) can never safely
// hold your Anthropic API key, because anyone who opens the file can read it
// straight out of the page source. This tiny server holds the key instead,
// and the frontend calls THIS server, never Anthropic directly.
//
// SETUP:
//   1) npm install
//   2) set your key:  export ANTHROPIC_API_KEY=sk-ant-...   (Mac/Linux)
//                      set ANTHROPIC_API_KEY=sk-ant-...      (Windows cmd)
//   3) node server.js
//   4) leave this running — the HTML file will call http://localhost:3001

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.warn('\n⚠️  ANTHROPIC_API_KEY is not set. The /api/daily-summary endpoint will return an error until you set it.\n');
}

app.post('/api/daily-summary', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server has no ANTHROPIC_API_KEY configured. See setup instructions in server.js.' });
  }

  const { fields } = req.body;
  if (!Array.isArray(fields)) {
    return res.status(400).json({ error: 'Expected { fields: [...] } in request body.' });
  }

  // Build a compact, factual data prompt — the model should analyze, not invent numbers.
  const dataBlock = fields.map(f =>
    `- ${f.name} (${f.crop}): status=${f.status}, disease_risk=${Math.round(f.risk*100)}%, soil_moisture=${Math.round(f.moisture)}%, NDVI=${f.ndvi.toFixed(2)}, temp=${f.temp.toFixed(1)}°C, humidity=${Math.round(f.humidity)}%, satellites_reporting=${f.satellitesActive.join(', ') || 'none (full cloud cover)'}, satellites_blocked=${f.satellitesBlocked.join(', ') || 'none'}`
  ).join('\n');

  const prompt = `You are an agronomy analyst writing a short daily field report for a farmer, based on fused satellite and IoT sensor data below. Be concise, practical, and specific to each field. Flag real risks plainly but do not exaggerate. End with 2-3 concrete recommended actions for today. Do not invent data not given below.

Farm field data (fused from Cartosat-3, WorldView-3, RISAT-1A SAR, and Landsat 9 thermal, cross-checked with ground IoT sensors):
${dataBlock}

Write the report now, under 220 words.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Anthropic API request failed', detail: errText });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('\n').trim();
    res.json({ summary: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reach Anthropic API', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`AGRIXMBD daily report backend running at http://localhost:${PORT}`);
});
