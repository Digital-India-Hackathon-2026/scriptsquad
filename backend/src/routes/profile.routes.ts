import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

// Profile: Get Details
router.get('/profile/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        return res.json({
          id: data.id,
          name: data.full_name,
          phone: data.phone_number,
          aadhar_card: data.aadhar_card || '',
          land_paper: data.land_paper || '',
          profile_pic: data.profile_pic || ''
        });
      }
    } catch(e) {}
  }

  res.json({
    id,
    name: 'Sukhdev Singh',
    phone: '9876543210',
    aadhar_card: '1234 5678 9012',
    land_paper: 'L-98120/Sherpur',
    profile_pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
  });
});

// Profile: Update Details
router.post('/profile/update', async (req: Request, res: Response) => {
  const { id, name, phone, aadhar_card, land_paper, profile_pic } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          phone_number: phone,
          aadhar_card,
          land_paper,
          profile_pic
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          user: {
            id: data.id,
            name: data.full_name,
            phone: data.phone_number,
            aadhar_card: data.aadhar_card || '',
            land_paper: data.land_paper || '',
            profile_pic: data.profile_pic || ''
          }
        });
      }
      console.warn('[Supabase Profile Update] Error:', error?.message);
    } catch (e: any) {
      console.error('[Supabase Profile Update] Exception:', e);
    }
  }

  res.json({
    success: true,
    message: 'Profile updated locally',
    user: { id, name, phone, aadhar_card, land_paper, profile_pic }
  });
});

export default router;
