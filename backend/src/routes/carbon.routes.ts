import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

const isValidUUID = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// ==================== Carbon Credits ====================

let carbonMock: any[] = [
  {
    id: 'cc-001',
    credit_type: 'soil_sequestration',
    metric_tons_co2: 2.45,
    verification_status: 'verified',
    market_rate_per_ton: 1200,
    period_start: '2026-01-01',
    period_end: '2026-06-30'
  },
  {
    id: 'cc-002',
    credit_type: 'cover_crop_offset',
    metric_tons_co2: 1.12,
    verification_status: 'pending',
    market_rate_per_ton: 1200,
    period_start: '2026-04-01',
    period_end: '2026-07-05'
  }
];

// List Carbon Credits
router.get('/carbon-credits', async (req: Request, res: Response) => {
  const { farm_id } = req.query;
  if (supabase) {
    if (!farm_id || isValidUUID(farm_id)) {
      let query = supabase.from('carbon_credits').select('*');
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Supabase Carbon Credits Fetch] Failed. Falling back to mock data. Error:', error.message);
      }
    } else {
      console.info('[Supabase Carbon Credits Fetch] Bypassed query: farm_id is a mock string.');
    }
  }
  
  // Filter mock list to simulate database behavior
  const filteredMock = farm_id 
    ? carbonMock.filter(c => c.farm_id === farm_id || !c.farm_id)
    : carbonMock;
  res.json(filteredMock);
});

// Log Carbon Credit Entry
router.post('/carbon-credits', async (req: Request, res: Response) => {
  const { credit_type, metric_tons_co2, market_rate_per_ton, period_start, period_end, farm_id, user_id } = req.body;
  if (!metric_tons_co2 || !period_start || !period_end) {
    return res.status(400).json({ error: 'Missing required fields: metric_tons_co2, period_start, period_end' });
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('carbon_credits')
      .insert({
        user_id: user_id || null,
        farm_id: farm_id || null,
        credit_type: credit_type || 'soil_sequestration',
        metric_tons_co2: Number(metric_tons_co2),
        verification_status: 'pending',
        market_rate_per_ton: Number(market_rate_per_ton) || 1200.00,
        period_start,
        period_end
      })
      .select()
      .single();

    if (!error && data) {
      return res.status(201).json(data);
    }
    console.warn('[Supabase Carbon Credit Creation] Failed. Falling back to mock state. Error:', error?.message);
  }

  const newCredit = {
    id: `cc-${Math.floor(100 + Math.random() * 900)}`,
    credit_type: credit_type || 'soil_sequestration',
    metric_tons_co2: Number(metric_tons_co2),
    verification_status: 'pending' as const,
    market_rate_per_ton: Number(market_rate_per_ton) || 1200.00,
    period_start,
    period_end
  };

  carbonMock.unshift(newCredit);
  res.status(201).json(newCredit);
});

export default router;
