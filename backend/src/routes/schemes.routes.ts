import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

// Mock Applied Schemes for offline/fallback mode
let mockAppliedSchemes: any[] = [
  {
    id: 'app-001',
    user_id: 'u-1209',
    scheme_id: 'sch-pm-kisan',
    scheme_name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    applied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Approved',
    documents: [{ name: 'Aadhar_Card.pdf', size: '1.2 MB' }, { name: 'Land_Paper_Vidisha.pdf', size: '2.4 MB' }],
    remarks: 'Documents verified. Direct benefit transfer of First Installment (INR 2,000) disbursed.',
    tracking_code: 'SCH-KISAN-9812'
  },
  {
    id: 'app-002',
    user_id: 'u-1209',
    scheme_id: 'sch-soil-card',
    scheme_name: 'Soil Health Card Scheme',
    applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Under Review',
    documents: [{ name: 'Aadhar_Card.pdf', size: '1.2 MB' }],
    remarks: 'Telemetry grid coordinates mapped. Soil sample collection pending at Vidisha Hub.',
    tracking_code: 'SCH-SOIL-4412'
  }
];

// Fetch applied schemes for a user
router.get('/schemes/applied', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id parameter' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applied_schemes')
        .select('*')
        .eq('user_id', String(user_id))
        .order('applied_at', { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      console.warn('[Supabase Schemes Fetch] Warning: falling back to mock. Error:', error?.message);
    } catch (e) {
      console.error('[Supabase Schemes Fetch Exception]', e);
    }
  }

  // Fallback to mock data matching this user
  const userMockData = mockAppliedSchemes.filter(s => s.user_id === String(user_id));
  res.json(userMockData);
});

// Apply for a scheme
router.post('/schemes/apply', async (req: Request, res: Response) => {
  const { user_id, scheme_id, scheme_name, documents, remarks } = req.body;
  if (!user_id || !scheme_id || !scheme_name) {
    return res.status(400).json({ error: 'Missing required fields: user_id, scheme_id, scheme_name' });
  }

  // Generate unique tracking code
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const trackingCode = `SCH-${scheme_id.replace('sch-', '').toUpperCase()}-${randNum}`;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applied_schemes')
        .insert({
          user_id,
          scheme_id,
          scheme_name,
          status: 'Submitted',
          documents: documents || [],
          remarks: remarks || 'Application submitted successfully. Under initial profile verification.',
          tracking_code: trackingCode
        })
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json(data);
      }
      console.warn('[Supabase Schemes Apply] Warning: falling back to mock. Error:', error?.message);
    } catch (e) {
      console.error('[Supabase Schemes Apply Exception]', e);
    }
  }

  // Fallback save to memory
  const newApp = {
    id: `app-${Math.floor(10000 + Math.random() * 90000)}`,
    user_id,
    scheme_id,
    scheme_name,
    applied_at: new Date().toISOString(),
    status: 'Submitted',
    documents: documents || [{ name: 'Uploaded_Documents.zip', size: '3.5 MB' }],
    remarks: remarks || 'Application submitted successfully. Under initial profile verification.',
    tracking_code: trackingCode
  };

  mockAppliedSchemes.unshift(newApp);
  res.status(201).json(newApp);
});

export default router;
