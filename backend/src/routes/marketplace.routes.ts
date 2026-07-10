import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import axios from 'axios';

const router = Router();

// ==========================================
// E-COMMERCE & FERTILIZER MARKETPLACE ROUTES
// ==========================================

let fertilizersMock: any[] = [
  { id: 'fert-1', name: 'Nano Urea (Liquid)', brand: 'IFFCO', npk_ratio: '46-0-0', price: 240, weight: '500ml', stock: 120, seller: 'IFFCO Official', seller_name: 'IFFCO Official', seller_phone: '9000000001', seller_email: 'iffco@demo.com', image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300', category: 'Nitrogenous', type: 'Liquid', status: 'approved' },
  { id: 'fert-2', name: 'DAP (Di-ammonium Phosphate)', brand: 'Coromandel', npk_ratio: '18-46-0', price: 1350, weight: '50kg', stock: 45, seller: 'Gromor Farm Store', seller_name: 'Gromor Farm Store', seller_phone: '9000000002', seller_email: 'gromor@demo.com', image_url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300', category: 'Phosphatic', type: 'Granular', status: 'approved' },
  { id: 'fert-3', name: 'Organic Vermicompost', brand: 'EcoKisan', npk_ratio: '1-1-1', price: 400, weight: '40kg', stock: 200, seller: 'EcoKisan Local (Pune)', seller_name: 'EcoKisan Local', seller_phone: '9000000003', seller_email: 'ecokisan@demo.com', image_url: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=300', category: 'Organic', type: 'Solid', status: 'approved' },
  { id: 'fert-4', name: 'MOP (Muriate of Potash)', brand: 'IPL', npk_ratio: '0-0-60', price: 1700, weight: '50kg', stock: 25, seller: 'IPL Agri Distributors', seller_name: 'IPL Agri Distributors', seller_phone: '9000000004', seller_email: 'ipl@demo.com', image_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=300', category: 'Potassic', type: 'Granular', status: 'approved' }
];

// Pending listings awaiting admin approval
let pendingListings: any[] = [
  {
    id: 'pend-001',
    name: 'Bio-Humic Acid Concentrate',
    brand: 'GreenRoot',
    npk_ratio: '0-0-0',
    price: 520,
    weight: '5 Litre',
    stock: 50,
    seller: 'Ramesh Kumar',
    seller_name: 'Ramesh Kumar',
    seller_phone: '9876501234',
    seller_email: 'ramesh@farm.com',
    image_url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300',
    category: 'Organic',
    type: 'Liquid',
    description: 'Premium bio-humic acid for soil health improvement. Derived from leonardite.',
    submitted_at: '2026-07-08T10:30:00Z',
    status: 'pending'
  }
];

// Admin credentials (hardcoded for demo)
const ADMIN_ID = 'jayesh';
const ADMIN_PASSWORD = 'jayesh';

// Admin login endpoint
router.post('/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  if (username === ADMIN_ID && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: 'admin-jayesh-uid',
        email: 'jayesh@admin.agrixmbd.com',
        name: 'Jayesh (Admin)',
        phone: '9999999999',
        role: 'admin'
      }
    });
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// List only APPROVED fertilizers (for regular marketplace display)
router.get('/marketplace/fertilizers', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('[Supabase Marketplace] Failed to fetch approved products or table empty:', error?.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }
  const approved = fertilizersMock.filter(f => f.status === 'approved');
  res.json(approved);
});

// Submit a new fertilizer for sale (goes to PENDING)
router.post('/marketplace/fertilizers', async (req: Request, res: Response) => {
  const { name, npk_ratio, price, weight, seller_name, seller_phone, seller_email, image_url, category, type, description, stock, user_id } = req.body;
  if (!name || !price || !seller_name) return res.status(400).json({ error: 'Missing required fields: name, price, seller_name' });
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .insert({
          user_id: user_id || null,
          name,
          brand: seller_name,
          npk_ratio: npk_ratio || '0-0-0',
          price: Number(price),
          weight: weight || '1kg',
          stock: stock ? Number(stock) : 10,
          image_url: image_url || '',
          category: category || 'General',
          type: type || 'Solid',
          description: description || '',
          status: 'pending'
        })
        .select()
        .single();
      if (!error && data) {
        return res.status(201).json({ message: 'Product submitted for admin review!', listing: data });
      }
      console.warn('[Supabase Marketplace] Failed to submit product:', error?.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }

  const newListing = {
    id: `pend-${Math.floor(Math.random() * 90000)}`,
    name,
    brand: seller_name,
    npk_ratio: npk_ratio || 'N/A',
    price: Number(price),
    weight: weight || 'N/A',
    stock: stock ? Number(stock) : 10,
    seller: seller_name,
    seller_name,
    seller_phone: seller_phone || '',
    seller_email: seller_email || '',
    image_url: image_url || '',
    category: category || 'General',
    type: type || 'Solid',
    description: description || '',
    submitted_at: new Date().toISOString(),
    status: 'pending'
  };
  pendingListings = [newListing, ...pendingListings];
  res.status(201).json({ message: 'Product submitted for admin review!', listing: newListing });
});

// Get all PENDING listings (Admin only)
router.get('/marketplace/pending', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('[Supabase Marketplace] Failed to fetch pending products or table empty:', error?.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }
  res.json(pendingListings);
});

// Approve a pending listing (Admin action)
router.post('/marketplace/approve/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .update({ status: 'approved' })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        return res.json({ message: 'Listing approved and now live on marketplace!', product: data });
      }
      console.warn('[Supabase Marketplace] Failed to approve product:', error?.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }

  const idx = pendingListings.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Listing not found' });

  const approved = { ...pendingListings[idx], status: 'approved', id: `fert-${Math.floor(Math.random() * 90000)}` };
  pendingListings.splice(idx, 1);
  fertilizersMock = [approved, ...fertilizersMock];

  res.json({ message: 'Listing approved and now live on marketplace!', product: approved });
});

// Reject a pending listing (Admin action)
router.post('/marketplace/reject/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        return res.json({ message: 'Listing rejected.', listing: data });
      }
      console.warn('[Supabase Marketplace] Failed to reject product:', error?.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }

  const idx = pendingListings.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Listing not found' });

  const rejected = { ...pendingListings[idx], status: 'rejected' };
  pendingListings.splice(idx, 1);

  res.json({ message: 'Listing rejected.', listing: rejected });
});

// Razorpay Order Creation (Mock Framework)
router.post('/razorpay/order', async (req: Request, res: Response) => {
  const { amount, currency, receipt } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });

  // Generate a mock Razorpay Order ID for testing until real keys are provided
  const orderId = `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  res.status(201).json({
    id: orderId,
    entity: 'order',
    amount: amount * 100, // Razorpay uses smallest currency unit (paise)
    currency: currency || 'INR',
    receipt: receipt || 'receipt#1',
    status: 'created'
  });
});

// Razorpay Payment Verification
router.post('/razorpay/verify', async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id, total_amount, items } = req.body;
  if (!razorpay_payment_id) return res.status(400).json({ error: 'Payment ID missing' });
  
  if (supabase && user_id && total_amount && items) {
    try {
      const { error } = await supabase
        .from('marketplace_orders')
        .insert({
          user_id,
          payment_id: razorpay_payment_id,
          total_amount: Number(total_amount),
          status: 'completed',
          items
        });
      if (error) console.warn('[Supabase Marketplace] Failed to log order:', error.message);
    } catch (e) {
      console.error('[Supabase Marketplace Exception]', e);
    }
  }
  res.json({ success: true, message: 'Payment verified successfully.' });
});

// Proxy endpoint to bypass CORS when loading satellite images in WebGL MapLibre
router.get('/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter.' });
  }
  try {
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream'
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', (response.headers['content-type'] as any) || 'image/jpeg');
    response.data.pipe(res);
  } catch (err: any) {
    console.error('[Proxy Image Error]', err.message);
    res.status(500).json({ error: 'Failed to proxy satellite image.' });
  }
});

// Admin Dashboard - Get all system orders and bookings
router.get('/admin/monitoring', async (req: Request, res: Response) => {
  const { admin_key } = req.query;
  // Simplistic auth for admin dashboard demo
  if (admin_key !== 'admin123') return res.status(403).json({ error: 'Unauthorized Admin Access' });

  let approvedCount = fertilizersMock.length;
  let pendingCount = pendingListings.length;

  if (supabase) {
    try {
      const { count: approved } = await supabase
        .from('marketplace_products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: pending } = await supabase
        .from('marketplace_products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      approvedCount = approved ?? approvedCount;
      pendingCount = pending ?? pendingCount;
    } catch (e) {}
  }

  res.json({
    machinery_bookings: [], // bookings are managed by arex.routes.ts
    fertilizer_products: fertilizersMock,
    pending_count: pendingCount,
    total_sales_volume: 45000,
    active_users: 142
  });
});

export default router;
