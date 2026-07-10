import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

// Real Auth: Signup / Register
router.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing email, password, or name' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone_number: phone || ''
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        message: 'Signup successful!',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: name,
          phone: phone || ''
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Fallback Mock Register
  const mockUser = {
    id: `u-${Math.floor(1000 + Math.random() * 9000)}`,
    email,
    name,
    phone: phone || '',
    aadhar_card: '',
    land_paper: '',
    profile_pic: ''
  };
  res.status(201).json({ message: 'Signup successful (Mock Local)', user: mockUser });
});

// Real Auth: Login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Retrieve profile details for full name / phone / aadhar / pic
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      return res.json({
        message: 'Login successful!',
        token: data.session?.access_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: profile?.full_name || 'Agri Farmer',
          phone: profile?.phone_number || '',
          aadhar_card: profile?.aadhar_card || '',
          land_paper: profile?.land_paper || '',
          profile_pic: profile?.profile_pic || ''
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Fallback Mock Login
  const mockUser = {
    id: 'u-1209',
    email,
    name: 'Sukhdev Singh',
    phone: '9876543210',
    aadhar_card: '1234 5678 9012',
    land_paper: 'L-98120/Sherpur',
    profile_pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
  };
  res.json({ message: 'Login successful (Mock Local)', user: mockUser });
});

export default router;
