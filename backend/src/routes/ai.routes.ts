import { Router, Request, Response } from 'express';

const router = Router();

// AI Fertilizer Recommendation
router.post('/ai/fertilizer-recommendation', async (req: Request, res: Response) => {
  console.log('[AI Recommendation Request] Incoming Payload:', req.body);
  
  const moisture = Number(req.body.moisture ?? 35);
  const nitrogen = Number(req.body.nitrogen ?? req.body.N ?? req.body.nitrogen_level ?? 50);
  const phosphorus = Number(req.body.phosphorus ?? req.body.P ?? req.body.phosphorus_level ?? 35);
  const potassium = Number(req.body.potassium ?? req.body.K ?? req.body.potassium_level ?? 45);
  
  let suggestion = 'Organic Vermicompost';
  let reason = 'Balances soil health naturally.';
  let confidence = 85;

  if (nitrogen < 30) {
    suggestion = 'Nano Urea (Liquid)';
    reason = 'Low Nitrogen detected. Nano Urea provides rapid foliar nitrogen uptake.';
    confidence = 94;
  } else if (phosphorus < 20) {
    suggestion = 'DAP (Di-ammonium Phosphate)';
    reason = 'Phosphorus deficit. DAP ensures strong root development.';
    confidence = 91;
  } else if (potassium < 30) {
    suggestion = 'MOP (Muriate of Potash)';
    reason = 'Potassium deficit. MOP improves drought resistance and fruit quality.';
    confidence = 89;
  }

  console.log('[AI Recommendation Response] Output Match:', { recommended_product: suggestion, confidence_score: confidence });

  res.json({
    recommended_product: suggestion,
    reasoning: reason,
    confidence_score: confidence
  });
});

export default router;
