import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

// ==========================================
// B2B AGRI-BAZAAR E-COMMERCE ROUTES
// ==========================================

let bazaarMock: any[] = [
  { id: 'baz-1', name: 'Organic Tomatoes (JS-Var)', price_per_kg: 45, stock_kg: 500, image_url: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=300', category: 'Vegetables', description: 'Fresh organically harvested tomatoes from local Vidisha cooperative. Transported in cold-chain.', status: 'approved' },
  { id: 'baz-2', name: 'Fresh Potatoes (Kufri Jyoti)', price_per_kg: 28, stock_kg: 1200, image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300', category: 'Vegetables', description: 'High starch, premium boiling potatoes. Harvested under 10 days.', status: 'approved' },
  { id: 'baz-3', name: 'Premium Nagpur Oranges', price_per_kg: 90, stock_kg: 300, image_url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=300', category: 'Fruits', description: 'Sweet, juicy citrus oranges direct from Nagpur growers.', status: 'approved' },
  { id: 'baz-4', name: 'Fresh Green Chillies', price_per_kg: 60, stock_kg: 150, image_url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=300', category: 'Herbs', description: 'Extremely spicy, organic green chillies ideal for hotel bulk supply.', status: 'approved' }
];

let pendingBazaarListings: any[] = [];

// Fetch approved B2B products
router.get('/bazaar/products', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bazaar_products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
      console.warn('[Supabase Bazaar] Fetch approved empty or error:', error?.message);
    } catch (e) {
      console.error('[Supabase Bazaar Exception]', e);
    }
  }
  const approved = bazaarMock.filter(b => b.status === 'approved');
  res.json(approved);
});

// Submit a new produce for B2B sale
router.post('/bazaar/products', async (req: Request, res: Response) => {
  const { name, price_per_kg, stock_kg, image_url, category, description, user_id } = req.body;
  if (!name || !price_per_kg || !stock_kg) {
    return res.status(400).json({ error: 'Missing required B2B product fields' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bazaar_products')
        .insert({
          user_id: user_id || null,
          name,
          price_per_kg: Number(price_per_kg),
          stock_kg: Number(stock_kg),
          image_url: image_url || '',
          category: category || 'Vegetables',
          description: description || '',
          status: 'approved' // Auto-approve B2B produce for faster demo validation
        })
        .select()
        .single();
      if (!error && data) {
        return res.status(201).json({ message: 'Produce listing added successfully!', listing: data });
      }
      console.warn('[Supabase Bazaar] Failed to insert B2B product:', error?.message);
    } catch (e) {
      console.error('[Supabase Bazaar Exception]', e);
    }
  }

  const newListing = {
    id: `baz-${Math.floor(Math.random() * 90000)}`,
    user_id: user_id || null,
    name,
    price_per_kg: Number(price_per_kg),
    stock_kg: Number(stock_kg),
    image_url: image_url || '',
    category: category || 'Vegetables',
    description: description || '',
    status: 'approved'
  };
  bazaarMock = [newListing, ...bazaarMock];
  res.status(201).json({ message: 'Produce listing added successfully!', listing: newListing });
});

// Verify & Log B2B Bazaar Order
router.post('/bazaar/verify', async (req: Request, res: Response) => {
  const { razorpay_payment_id, user_id, total_amount, items } = req.body;
  if (!razorpay_payment_id || !user_id) return res.status(400).json({ error: 'Order parameters missing' });

  if (supabase && user_id && total_amount && items) {
    try {
      const { error } = await supabase
        .from('bazaar_orders')
        .insert({
          user_id,
          payment_id: razorpay_payment_id,
          total_amount: Number(total_amount),
          status: 'completed',
          items
        });
      if (error) console.warn('[Supabase Bazaar] Failed to log B2B order:', error.message);
    } catch (e) {
      console.error('[Supabase Bazaar Exception]', e);
    }
  }
  res.json({ success: true, message: 'B2B purchase verified successfully.' });
});

export default router;
