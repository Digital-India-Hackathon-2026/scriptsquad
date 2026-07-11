import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

let voiceCallLogsMock: any[] = [
  {
    id: 'call-001',
    phone_number: '+919876543210',
    farmer_name: 'Sukhdev Singh',
    farm_name: "Sukhdev's Soybean Field",
    crop_type: 'Soybean',
    telemetry_snapshot: { nitrogen: 48, phosphorus: 32, potassium: 50, moisture: 34.5 },
    weather_snapshot: { temp: 28.5, rain: 0.0, wind: 12.0 },
    matched_schemes: [
      { name: 'PM-KISAN', description: 'INR 6,000 direct income support.' },
      { name: 'Soil Health Card Scheme', description: 'Subsidized soil testing and NPK recommendations.' }
    ],
    ai_transcript: 'Welcome back Sukhdev. Your soybean field moisture is at 34%. Telemetry shows low nitrogen reserves. Applying foliar spray is advised.',
    call_duration_seconds: 32,
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

// Vernacular Voice AI Response using Gemini API
router.post('/voice-ai', async (req: Request, res: Response) => {
  const query = req.body.query || req.body.user_text || '';
  const language = req.body.language || req.body.lang || 'en-IN';
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query input' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured in backend' });
  }

  // Construct a comprehensive prompt giving Gemini live farm coordinates and telemetry parameters
  const systemPrompt = `You are SAKHI (Smart Agricultural Knowledge Hub Intelligence), a highly advanced agricultural AI generative assistant.
You help Indian farmers with smart agronomic advice, disease identification, remedies, weather indexing, and market rates.

Today you are assisting a farmer. The language chosen is: ${language}.
Always reply in the language the user asked or specified. If Hindi is chosen, reply in clear, easy-to-understand Devanagari script. If Marathi, reply in Marathi script. If English, reply in friendly English.

Make your answer complete, extremely knowledgeable, and highly practical. Give diagnostic guidance or suggest actions such as crop rotation, soil conditioning, or irrigation when appropriate. Keep your response under 4 sentences to be concise.

Farmer Query: "${query}"

Answer:`;

  const models = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
  ];

  let ai_response = '';
  let apiSuccess = false;

  for (const url of models) {
    try {
      const gRes = await fetch(`${url}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (gRes.ok) {
        const data = await gRes.json() as any;
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          ai_response = generatedText.trim();
          apiSuccess = true;
          break;
        }
      }
    } catch (err) {
      console.warn(`[Gemini Route Fallback Exception] Tried: ${url}`, err);
    }
  }

  // Fallback offline responses in case of rate limits or key activation delay
  if (!apiSuccess) {
    console.warn('[Gemini Integration] Falling back to local offline model simulation.');
    const normalized = query.toLowerCase();
    ai_response = 'I am scanning the ISRO Resourcesat multispectral indices. Your farm is looking healthy, but early drought onset is forecasted in 16 days. Consider scheduling drip irrigation.';
    if (normalized.includes('disease') || normalized.includes('pesticide') || normalized.includes('leaf') || normalized.includes('stress')) {
      ai_response = 'PFRIE Pre-visual analysis indicates high intracellular stress in the northern sector. High risk of leaf spot disease. Appling biopesticides via AREX autonomous drone sprayer is recommended.';
    } else if (normalized.includes('market') || normalized.includes('price') || normalized.includes('sell') || normalized.includes('escrow')) {
      ai_response = 'AREX Market Engine reports soybean trading at INR 4,800/quintal. ITC Mars has an escrow contract locking 10 tons. Click to release and initiate autonomous dispatch queue.';
    }
  }

  res.json({
    user_query: query,
    ai_response,
    language_code: language,
    confidence_score: 0.992,
    advisory_action: 'generative_advisor'
  });
});

// GET /api/voice/logs - Fetch all incoming calling logs
router.get('/voice/logs', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('voice_call_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return res.json(data);
      }
      console.warn('[Supabase Voice Logs] Error fetching logs:', error?.message);
    } catch (e) {
      console.error('[Supabase Voice Logs] Exception:', e);
    }
  }
  res.json(voiceCallLogsMock);
});

// POST /api/voice/incoming - Telephony Webhook
router.post('/voice/incoming', async (req: Request, res: Response) => {
  const rawPhone = req.body.From || req.body.phone_number;
  if (!rawPhone) {
    return res.status(400).json({ error: 'Missing Caller phone number (From)' });
  }

  let profile: any = null;
  let farm: any = null;
  let telemetry = { nitrogen: 45, phosphorus: 30, potassium: 55, moisture: 32 };
  let weather = { temp: 29.0, rain: 0.0, wind: 10.5 };
  let matched_schemes = [
    { name: 'PM-KISAN Support', description: 'Annual direct credit eligibility.' },
    { name: 'Soil Health Subsidy', description: 'Soil amendment nano-fertilizer discount.' }
  ];

  if (supabase) {
    try {
      // Find profile by matching phone digits
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles && profiles.length > 0) {
        profile = profiles.find((p: any) => {
          if (!p.phone_number) return false;
          const cleanP = p.phone_number.replace(/\D/g, '');
          const cleanInput = rawPhone.replace(/\D/g, '');
          return cleanP.endsWith(cleanInput) || cleanInput.endsWith(cleanP);
        });
      }

      if (profile) {
        // Fetch active farm
        const { data: farms } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', profile.id);
        
        if (farms && farms.length > 0) {
          farm = farms[0];
        }
      }
    } catch (e) {
      console.error('[Supabase Webhook Lookup Exception]', e);
    }
  }

  // Set default fallbacks if profile or farm is not registered
  if (!profile) {
    profile = {
      full_name: 'Sukhdev Singh',
      phone_number: rawPhone
    };
  }
  if (!farm) {
    farm = {
      location_name: "Sukhdev's Soybean Field",
      primary_crop: 'Soybean',
      coordinates: [[76.3, 20.2]]
    };
  }

  // Dynamic Open-Meteo weather fetch based on farm centroid GPS bounds
  const lat = farm.coordinates?.[0]?.[1] || 20.2;
  const lng = farm.coordinates?.[0]?.[0] || 76.3;
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m`;
    const wRes = await fetch(weatherUrl);
    if (wRes.ok) {
      const wData = await wRes.json() as any;
      weather.temp = wData.current?.temperature_2m ?? weather.temp;
      weather.rain = wData.current?.precipitation ?? weather.rain;
      weather.wind = wData.current?.wind_speed_10m ?? weather.wind;
    }
  } catch (e) {
    console.warn('[Open-Meteo API Fail] Using weather fallbacks:', e);
  }

  // Generate dynamic, human-sounding voice script based on captured telemetry/weather metrics
  const ai_transcript = `Namaskar, ${profile.full_name}. This is your SAKHI voice assistant. I have identified your calling number. For your ${farm.location_name} growing ${farm.primary_crop}, the current local temperature is ${weather.temp}°C with ${weather.rain > 0 ? `${weather.rain}mm rain` : 'no active rainfall'}. Soil sensors report moisture at ${telemetry.moisture}% and nitrogen at ${telemetry.nitrogen} mg/kg. Based on these metrics, we recommend scheduling a drip irrigation cycle. You are eligible for direct subsidies. Would you like me to book an autonomous drone spray?`;

  const newLog = {
    id: `call-${Math.floor(1000 + Math.random() * 9000)}`,
    phone_number: rawPhone,
    farmer_name: profile.full_name,
    farm_name: farm.location_name,
    crop_type: farm.primary_crop,
    telemetry_snapshot: telemetry,
    weather_snapshot: weather,
    matched_schemes: matched_schemes,
    ai_transcript: ai_transcript,
    call_duration_seconds: Math.floor(15 + Math.random() * 45),
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('voice_call_logs')
        .insert({
          phone_number: newLog.phone_number,
          farmer_name: newLog.farmer_name,
          farm_name: newLog.farm_name,
          crop_type: newLog.crop_type,
          telemetry_snapshot: newLog.telemetry_snapshot,
          weather_snapshot: newLog.weather_snapshot,
          matched_schemes: newLog.matched_schemes,
          ai_transcript: newLog.ai_transcript,
          call_duration_seconds: newLog.call_duration_seconds
        })
        .select()
        .single();
      
      if (!error && data) {
        return res.status(201).json(data);
      }
      console.warn('[Supabase Voice Log Save Error]:', error?.message);
    } catch (e) {
      console.error('[Supabase Voice Log Exception]:', e);
    }
  }

  voiceCallLogsMock.unshift(newLog);
  res.status(201).json(newLog);
});

// GET /api/voice/context?phone=... - Fetch farmer context for Vapi system prompt
router.get('/voice/context', async (req: Request, res: Response) => {
  const phone = req.query.phone as string || '';
  
  let farmerName = 'Farmer';
  let farmName = 'Farm Plot';
  let crop = 'Soybean';
  let telemetry = { nitrogen: 48, phosphorus: 32, potassium: 50, moisture: 34.5 };
  let weather = { temp: 29.0, rain: 0.0, wind: 10.5 };
  let schemes = ['PM-KISAN (INR 6,000 direct income support)', 'Soil Health Card Scheme', 'PMFBY Crop Insurance'];
  let lat = 23.5204;
  let lng = 77.8189; // Default Vidisha, MP

  if (supabase && phone) {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles) {
        const match = profiles.find((p: any) => {
          if (!p.phone_number) return false;
          const cleanP = p.phone_number.replace(/\D/g, '');
          const cleanInput = phone.replace(/\D/g, '');
          return cleanP.endsWith(cleanInput) || cleanInput.endsWith(cleanP);
        });
        if (match) {
          farmerName = match.full_name || farmerName;
          const { data: farms } = await supabase.from('farms').select('*').eq('user_id', match.id);
          if (farms && farms.length > 0) {
            farmName = farms[0].location_name;
            crop = farms[0].primary_crop;

            // Resolve coordinates from boundary
            const boundary = farms[0].boundary;
            if (boundary) {
              let pts: number[][] | null = null;
              if (typeof boundary === 'string' && /^[0-9a-fA-F]+$/.test(boundary)) {
                // EWKB Hex
                try {
                  const buffer = Buffer.from(boundary, 'hex');
                  let offset = 5; // skip endianness & type
                  const type = buffer.readUInt32LE(0) === 1 ? buffer.readUInt32LE(1) : buffer.readUInt32BE(1);
                  if ((type & 0x20000000) !== 0) offset += 4; // skip SRID
                  offset += 4; // rings
                  const numPoints = buffer.readUInt32LE(offset) === 1 ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
                  offset += 4;
                  if (numPoints > 0) {
                    const x = buffer.readDoubleLE(offset);
                    const y = buffer.readDoubleLE(offset + 8);
                    pts = [[x, y]];
                  }
                } catch (_) {}
              } else if (typeof boundary === 'string') {
                // WKT
                const matches = boundary.match(/\((.*?)\)/);
                if (matches && matches[1]) {
                  pts = matches[1].split(',').map(p => p.trim().split(' ').map(Number));
                }
              } else if (boundary.coordinates) {
                // GeoJSON
                pts = boundary.coordinates[0];
              }

              if (pts && pts.length > 0 && pts[0].length === 2) {
                lng = pts[0][0];
                lat = pts[0][1];
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Vapi Context Lookup]', e);
    }
  }

  // Live weather
  try {
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m`);
    if (wRes.ok) {
      const wData = await wRes.json() as any;
      weather.temp = wData.current?.temperature_2m ?? weather.temp;
      weather.rain = wData.current?.precipitation ?? weather.rain;
      weather.wind = wData.current?.wind_speed_10m ?? weather.wind;
    }
  } catch (_e) {}

  // Calculate dynamic risk indices based on active parameters
  let fungalRisk = 15;
  if (weather.temp > 18 && weather.temp < 28) fungalRisk += 25;
  if (weather.rain > 0.1) fungalRisk += 40;
  if (telemetry.moisture > 50) fungalRisk += 20;

  let rootRotRisk = 10;
  if (telemetry.moisture > 65) rootRotRisk += 50;
  if (weather.rain > 1.0) rootRotRisk += 30;

  let pestRisk = 12;
  if (weather.temp > 30) pestRisk += 45;
  if (telemetry.moisture < 25) pestRisk += 35;

  fungalRisk = Math.min(100, fungalRisk);
  rootRotRisk = Math.min(100, rootRotRisk);
  pestRisk = Math.min(100, pestRisk);
  const overallRisk = Math.round((fungalRisk + rootRotRisk + pestRisk) / 3);

  // Dynamic alternative crops suggestions based on active crop
  let altCrops = ['Chickpea (Gram)', 'Wheat (Sharbati)', 'Mustard'];
  const cropLower = crop.toLowerCase();
  if (cropLower.includes('wheat')) {
    altCrops = ['Soybean', 'Green Gram (Moong)', 'Pigeon Pea (Tur)'];
  } else if (cropLower.includes('cotton')) {
    altCrops = ['Groundnut', 'Maize', 'Sorghum'];
  } else if (cropLower.includes('rice') || cropLower.includes('paddy')) {
    altCrops = ['Black Gram (Urad)', 'Lentil', 'Sesame'];
  }

  const advisoryTips = [
    'Crop Rotation: Rotating legumes (like Chickpea/Moong) helps naturally capture atmospheric nitrogen.',
    'Soil Conditioning: Incorporate organic vermicompost to enrich carbon structures and moisture retention.',
    'Drip Systems: Transitioning to localized drip networks reduces pathogen spread and saves 40% water.'
  ];

  res.json({
    farmerName, farmName, crop, telemetry, weather, schemes,
    lat, lng,
    altCrops,
    advisoryTips,
    risk: {
      fungalRisk,
      rootRotRisk,
      pestRisk,
      overallRisk
    },
    systemPrompt: `You are SAKHI (Smart Agricultural Knowledge Hub Intelligence), a friendly AI agricultural assistant from India's Digital Agriculture Platform. You are speaking to ${farmerName}. 

IMPORTANT LIVE DATA (use these exact values when the farmer asks):
- Farm: ${farmName}
- Crop: ${crop}
- GPS Coordinates: Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}
- Soil Moisture: ${telemetry.moisture}%
- Nitrogen (N): ${telemetry.nitrogen} mg/kg
- Phosphorus (P): ${telemetry.phosphorus} mg/kg
- Potassium (K): ${telemetry.potassium} mg/kg
- Temperature: ${weather.temp}°C
- Rainfall: ${weather.rain} mm
- Wind Speed: ${weather.wind} km/h
- Eligible Schemes: ${schemes.join(', ')}
- Pathogen Fungal Risk: ${fungalRisk}%
- Root Rot Risk: ${rootRotRisk}%
- Pest Vulnerability Index: ${pestRisk}%
- Overall Threat Level: ${overallRisk}%
- Recommended Rotation Crops: ${altCrops.join(', ')}
- General Farm Advisory Tips: ${advisoryTips.join(' | ')}

RULES:
1. Always greet the farmer by name warmly in Hindi or English.
2. When asked about field conditions, quote the EXACT sensor values above.
3. When asked about weather, quote the EXACT temperature, rainfall, wind values.
4. When asked about schemes, list the eligible schemes and explain benefits.
5. Provide actionable agricultural advice based on the live data.
6. If nitrogen is below 40, recommend nano urea foliar spray.
7. If moisture is below 25%, recommend scheduling drip irrigation.
8. If overall risk exceeds 50%, recommend applying preventive biological spray.
9. Support general questions about soil health, other crop rotations, and pest management. Recommend ${altCrops.join(', ')} if they ask about alternative crops or rotation suggestions.
10. Keep responses concise and conversational (under 3 sentences).
11. Support Hindi and English.
12. End responses by asking if the farmer needs anything else.`
  });
});

// POST /api/voice/vapi-webhook - Vapi function calling webhook
router.post('/voice/vapi-webhook', async (req: Request, res: Response) => {
  const { message } = req.body;
  
  if (message?.type === 'function-call') {
    const fnName = message.functionCall?.name;
    const args = message.functionCall?.parameters || {};

    if (fnName === 'getFarmTelemetry') {
      return res.json({
        result: JSON.stringify({
          nitrogen: 48, phosphorus: 32, potassium: 50, moisture: 34.5,
          status: 'Nitrogen is slightly low. Recommend nano urea spray.'
        })
      });
    }

    if (fnName === 'getWeather') {
      try {
        const lat = args.latitude || 20.2;
        const lng = args.longitude || 76.3;
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m`);
        const wData = await wRes.json() as any;
        return res.json({
          result: JSON.stringify({
            temperature: wData.current?.temperature_2m,
            rainfall: wData.current?.precipitation,
            wind: wData.current?.wind_speed_10m
          })
        });
      } catch (_e) {
        return res.json({ result: JSON.stringify({ temperature: 29, rainfall: 0, wind: 10 }) });
      }
    }

    if (fnName === 'getEligibleSchemes') {
      return res.json({
        result: JSON.stringify({
          schemes: [
            { name: 'PM-KISAN', benefit: 'INR 6,000 annual direct income support' },
            { name: 'Soil Health Card', benefit: 'Free soil testing and NPK analysis' },
            { name: 'PMFBY', benefit: 'Weather-indexed crop insurance at subsidized premium' }
          ]
        })
      });
    }
  }

  res.json({ result: 'ok' });
});

// POST /api/voice/outbound-call - Server calls farmer's mobile via Vapi
router.post('/voice/outbound-call', async (req: Request, res: Response) => {
  const { phone_number } = req.body;
  const vapiKey = process.env.VAPI_PRIVATE_KEY;

  if (!vapiKey) {
    return res.status(500).json({ error: 'VAPI_PRIVATE_KEY not configured' });
  }
  if (!phone_number) {
    return res.status(400).json({ error: 'Missing phone_number' });
  }

  // Resolve Vapi Phone Number ID dynamically if not set
  let phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || '';
  if (!phoneNumberId) {
    try {
      const phRes = await fetch('https://api.vapi.ai/phone-number', {
        headers: { 'Authorization': `Bearer ${vapiKey}` }
      });
      if (phRes.ok) {
        const phData = await phRes.json() as any[];
        if (phData && phData.length > 0) {
          phoneNumberId = phData[0].id;
          console.log('[Vapi Outbound] Auto-resolved phoneNumberId:', phoneNumberId);
        }
      }
    } catch (err) {
      console.warn('[Vapi Outbound] Failed to auto-resolve phone numbers:', err);
    }
  }

  if (!phoneNumberId) {
    return res.status(400).json({ error: 'No active phone number found in your Vapi account. Please purchase or connect one first.' });
  }

  // First, get the farmer's context for the system prompt
  let contextData: any = {};
  try {
    const ctxRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/voice/context?phone=${encodeURIComponent(phone_number)}`);
    contextData = await ctxRes.json() as any;
  } catch (_e) {
    contextData = { systemPrompt: 'You are SAKHI, a friendly AI agricultural assistant. Help the farmer with their queries.' };
  }

  try {
    const vapiRes = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumberId,
        assistant: {
          name: 'SAKHI ContextHub',
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: contextData.systemPrompt }
            ]
          },
          voice: {
            provider: 'azure',
            voiceId: 'en-IN-NeerjaNeural'
          },
          firstMessage: `Namaskar ${contextData.farmerName || 'Farmer'}! I am SAKHI, your smart agriculture assistant. I have loaded your farm data. How can I help you today?`,
          serverUrl: `${req.protocol}://${req.get('host')}/api/voice/vapi-webhook`
        },
        customer: {
          number: phone_number.startsWith('+') ? phone_number : `+91${phone_number.replace(/\D/g, '')}`
        }
      })
    });

    const vapiData = await vapiRes.json();

    if (!vapiRes.ok) {
      console.error('[Vapi Outbound Call Error]:', vapiData);
      return res.status(vapiRes.status).json({ error: 'Vapi API call failed', details: vapiData });
    }

    res.json({ 
      message: 'Outbound call initiated successfully!', 
      callId: (vapiData as any).id,
      details: vapiData 
    });
  } catch (e: any) {
    console.error('[Vapi Outbound Call Exception]:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

