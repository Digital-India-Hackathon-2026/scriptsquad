import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

// Vernacular Voice AI Response Simulation
router.post('/voice-ai', async (req: Request, res: Response) => {
  const { query, language } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query input' });
  }

  const normalized = query.toLowerCase();
  let ai_response = 'I am scanning the ISRO Resourcesat multispectral indices. Your farm is looking healthy, but early drought onset is forecasted in 16 days. Consider scheduling drip irrigation.';
  let advisory_action = 'drip_irrigation';

  if (normalized.includes('disease') || normalized.includes('pesticide') || normalized.includes('leaf') || normalized.includes('stress')) {
    ai_response = 'PFRIE Pre-visual analysis indicates high intracellular stress in the northern sector. High risk of leaf spot disease. Appling biopesticides via AREX autonomous drone sprayer is recommended.';
    advisory_action = 'drone_sprayer';
  } else if (normalized.includes('market') || normalized.includes('price') || normalized.includes('sell') || normalized.includes('escrow')) {
    ai_response = 'AREX Market Engine reports soybean trading at INR 4,800/quintal. ITC Mars has an escrow contract locking 10 tons. Click to release and initiate autonomous dispatch queue.';
    advisory_action = 'market_trade';
  } else if (normalized.includes('tractor') || normalized.includes('rent') || normalized.includes('booking')) {
    ai_response = 'Retrieving available machinery in Sherpur hub. Found 1 autonomous tiller at INR 2,200/day. Ready to book for your scheduled tillage.';
    advisory_action = 'machinery_booking';
  }

  // Multi-lingual translations matching regional codes
  if (language === 'hi-IN') {
    if (advisory_action === 'drip_irrigation') {
      ai_response = 'मैं इसरो रिसोर्ससैट मल्टीस्पेक्ट्रल सूचकांकों को स्कैन कर रहा हूँ। आपकी फसल स्वस्थ है, लेकिन 16 दिनों में सूखा पड़ने का पूर्वानुमान है। टपक सिंचाई (drip irrigation) की योजना बनाएं।';
    } else if (advisory_action === 'drone_sprayer') {
      ai_response = 'PFRIE विश्लेषण से पता चलता है कि उत्तरी भाग में फसलों पर तनाव है। लीफ स्पॉट रोग की आशंका है। ड्रोन स्प्रेयर से जैविक कीटनाशक छिड़काव की सलाह दी जाती है।';
    }
  } else if (language === 'mr-IN') {
    if (advisory_action === 'drip_irrigation') {
      ai_response = 'मी इस्रो रिसोर्सेसॅट डेटा स्कॅन करत आहे. तुमची पीक परिस्थिती चांगली आहे, पण पुढील १६ दिवसात कोरड्या हवामानाचा अंदाज आहे. ठिबक सिंचन सुरू करा.';
    } else if (advisory_action === 'drone_sprayer') {
      ai_response = 'PFRIE ने पानांमधील ताण शोधला आहे. पानांवरील ठिपके रोगाची लक्षणे दिसत आहेत. स्वायत्त ड्रोनद्वारे कीटकनाशक फवारणी करण्याचा सल्ला दिला जातो.';
    }
  }

  // Write Voice log to Supabase if active
  if (supabase) {
    try {
      await supabase.from('voice_ai_logs').insert({
        language_code: language || 'en-IN',
        user_query: query,
        ai_response: ai_response,
        confidence_score: 0.985
      });
    } catch (e) {
      console.warn('[Supabase Voice Log] Could not save log entry. Table may not exist.', e);
    }
  }

  res.json({
    user_query: query,
    ai_response,
    language_code: language || 'en-IN',
    confidence_score: 0.985,
    advisory_action
  });
});

export default router;
