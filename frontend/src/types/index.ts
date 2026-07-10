export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  aadhar_card?: string;
  land_paper?: string;
  profile_pic?: string;
  role?: string;
}

export interface Farm {
  id: string;
  location_name: string;
  primary_crop: string;
  health: string;
  code: string;
  coordinates: number[][];
}

export interface Booking {
  id: string;
  machinery_type: string;
  booking_date: string;
  booking_time?: string;
  status: string;
  cost_amount: number;
  provider_id?: string;
  farmer_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Escrow {
  id: string;
  buyer_name: string;
  crop_type: string;
  quantity_metric_tons: number;
  escrow_amount: number;
  status: string;
  payout_condition_params: any;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  npk_ratio: string;
  price: number;
  weight: string;
  stock: number;
  seller: string;
  category: string;
  type: string;
  seller_name?: string;
  seller_phone?: string;
  seller_email?: string;
  image_url?: string;
  description?: string;
  status?: string;
  submitted_at?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface PfrieScores {
  living_root_intelligence: { score: number; status: string; detail: string };
  groundwater_digital_twin: { score: number; status: string; detail: string };
  village_disease_intelligence: { score: number; status: string; detail: string };
  climate_survival_simulator: { score: number; status: string; detail: string };
  autonomous_seasonal_planner: { score: number; status: string; detail: string };
  farm_resilience_score: { score: number; status: string; detail: string };
}
