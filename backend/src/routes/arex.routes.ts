import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

const isValidUUID = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Mock database fallbacks (used if Supabase is offline or tables are not yet created)
let bookingsMock = [
  {
    id: 'b1-0092',
    machinery_type: 'drone_sprayer',
    booking_date: '2026-07-06',
    status: 'scheduled',
    cost_amount: 3500.00,
    provider_id: 'SHERPUR-COOP-04'
  },
  {
    id: 'b2-1182',
    machinery_type: 'harvester',
    booking_date: '2026-07-12',
    status: 'pending',
    cost_amount: 12000.00,
    provider_id: 'AREX-FLEET-B'
  }
];

let escrowsMock = [
  {
    id: 'e1-9982',
    buyer_name: 'Adani Agri Logistics',
    crop_type: 'Wheat (LOK-1)',
    quantity_metric_tons: 25.0,
    escrow_amount: 625000.00,
    status: 'locked',
    payout_condition_params: {
      min_protein_content: 12.0,
      max_moisture: 14.5
    },
    created_at: '2026-07-03T10:30:00Z'
  },
  {
    id: 'e2-4412',
    buyer_name: 'ITC Mars',
    crop_type: 'Soybean (JS-335)',
    quantity_metric_tons: 10.0,
    escrow_amount: 480000.00,
    status: 'released',
    payout_condition_params: {
      min_oil_content: 18.5,
      max_moisture: 12.0
    },
    created_at: '2026-06-28T14:20:00Z'
  }
];

let logisticsMock = [
  { id: 'l-4921', store_name: 'Sherpur Cold Hub 02', status: 'dispatching', temp: '4.2°C', route: 'Route A-9' },
  { id: 'l-8120', store_name: 'Vidisha Storage Center', status: 'delivered', temp: '5.0°C', route: 'Route C-2' }
];

// AREX Bookings List
router.get('/arex/bookings', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (supabase) {
    let query = supabase.from('machinery_bookings').select('*');
    if (user_id && isValidUUID(user_id as string)) {
      query = query.eq('user_id', user_id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      return res.json(data);
    }
    if (error) {
      console.warn('[Supabase Bookings Fetch] Failed. Falling back to mock data. Error:', error.message);
    }
  }
  res.json(bookingsMock);
});

// Create AREX Booking
router.post('/arex/bookings', async (req: Request, res: Response) => {
  const { machinery_type, booking_date, booking_time, cost_amount, user_id, farm_id, farmer_name, email, phone, address } = req.body;
  if (!machinery_type || !booking_date) {
    return res.status(400).json({ error: 'Missing machinery_type or booking_date' });
  }

  const cost = Number(cost_amount) || 4500.00;
  
  if (supabase) {
    const { data, error } = await supabase
      .from('machinery_bookings')
      .insert({
        user_id: user_id || null,
        farm_id: farm_id || null,
        machinery_type,
        booking_date,
        cost_amount: cost,
        status: 'pending',
        provider_id: 'AREX-FLEET-AUTONOMOUS'
      })
      .select()
      .single();

    if (!error && data) {
      // NOTE: Extra fields (email, phone, address, booking_time, farmer_name) are ignored by supabase insert 
      // unless we add them to the database schema. But they will be present in the mock fallback below.
      return res.status(201).json(data);
    }
    console.warn('[Supabase Booking Creation] Failed. Falling back to mock state. Error:', error?.message);
  }

  const newBooking = {
    id: `b-${Math.floor(1000 + Math.random() * 9000)}`,
    machinery_type,
    booking_date,
    booking_time: booking_time || '09:00',
    cost_amount: cost,
    status: 'pending_approval',
    farmer_name: farmer_name || 'Anonymous Farmer',
    email: email || '',
    phone: phone || '',
    address: address || '',
    provider_id: 'AREX-FLEET-AUTONOMOUS',
    created_at: new Date().toISOString()
  };
  
  bookingsMock.unshift(newBooking);
  res.status(201).json(newBooking);
});

// AREX Escrows List
router.get('/arex/escrows', async (req: Request, res: Response) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('escrow_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return res.json(data);
    }
    if (error) {
      console.warn('[Supabase Escrows Fetch] Failed. Falling back to mock data. Error:', error.message);
    }
  }
  res.json(escrowsMock);
});

router.get('/arex/logistics', (req: Request, res: Response) => {
  res.json(logisticsMock);
});

router.post('/arex/logistics/dispatch', (req: Request, res: Response) => {
  const { id } = req.body;
  logisticsMock = logisticsMock.map(l => l.id === id ? { ...l, status: 'in_transit' } : l);
  const updated = logisticsMock.find(l => l.id === id);
  res.json({ success: true, updated });
});

export default router;
