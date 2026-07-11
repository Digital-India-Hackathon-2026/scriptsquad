-- AGRIXMBD 2.0 - AI-Native Agricultural Intelligence Cloud
-- Supabase / PostgreSQL Database Schema with Auth & Row Level Security (RLS)
-- RUNNING THIS SCRIPT WILL RESET EXISTING AGRIXMBD TABLES AND RE-CREATE THEM CLEANLY

-- 0. Clean up existing tables to prevent "column does not exist" errors from older versions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_farms_near_point(numeric, numeric, double precision) CASCADE;
DROP TABLE IF EXISTS public.satellite_syncs CASCADE;
DROP TABLE IF EXISTS public.drone_flight_plans CASCADE;
DROP TABLE IF EXISTS public.carbon_credits CASCADE;
DROP TABLE IF EXISTS public.insurance_policies CASCADE;
DROP TABLE IF EXISTS public.voice_ai_logs CASCADE;
DROP TABLE IF EXISTS public.escrow_contracts CASCADE;
DROP TABLE IF EXISTS public.machinery_bookings CASCADE;
DROP TABLE IF EXISTS public.telemetry CASCADE;
DROP TABLE IF EXISTS public.farms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable PostGIS extension for Geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Profiles Table (Linked to Supabase Auth users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    aadhar_card VARCHAR(20),
    land_paper TEXT,
    profile_pic TEXT,
    language_preference VARCHAR(10) DEFAULT 'en-IN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. Farms Table (Geospatial Bounds mapped per User)
CREATE TABLE public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    location_name VARCHAR(150),
    boundary GEOMETRY(Polygon, 4326), -- PostGIS Polygon bounds
    total_area_hectares NUMERIC(8, 2),
    soil_ph NUMERIC(3, 1),
    organic_matter_percent NUMERIC(4, 2),
    primary_crop VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for farms
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own farms" 
    ON public.farms FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own farms" 
    ON public.farms FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own farms" 
    ON public.farms FOR UPDATE 
    USING (auth.uid() = user_id);

-- Add spatial index
CREATE INDEX IF NOT EXISTS farms_boundary_idx ON public.farms USING GIST (boundary);

-- 3. Telemetry Table (Edge sensors)
CREATE TABLE public.telemetry (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    device_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(30) NOT NULL, -- e.g. 'soil_moisture_npk'
    reading_value JSONB NOT NULL, -- e.g. {"moisture": 34, "N": 45, "P": 30, "K": 50}
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for telemetry
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own telemetry" 
    ON public.telemetry FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to log their own telemetry" 
    ON public.telemetry FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. AREX Machinery Bookings
CREATE TABLE public.machinery_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    machinery_type VARCHAR(50) NOT NULL, -- 'tractor', 'drone_sprayer', 'harvester'
    booking_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    provider_id VARCHAR(50) DEFAULT 'AREX-FLEET-AUTONOMOUS',
    cost_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for bookings
ALTER TABLE public.machinery_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own bookings" 
    ON public.machinery_bookings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own bookings" 
    ON public.machinery_bookings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 5. AREX Escrow Contracts (Read-only listings for marketplace buyer agreements)
CREATE TABLE public.escrow_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    buyer_name VARCHAR(100) NOT NULL,
    crop_type VARCHAR(50) NOT NULL,
    quantity_metric_tons NUMERIC(10, 2) NOT NULL,
    escrow_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'disputed')),
    payout_condition_params JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for escrows
ALTER TABLE public.escrow_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view related escrow contracts" 
    ON public.escrow_contracts FOR SELECT 
    USING (true); -- Public marketplace listings can be viewed by all authenticated users

-- 6. Voice AI logs
CREATE TABLE public.voice_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for voice logs
ALTER TABLE public.voice_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own voice logs" 
    ON public.voice_ai_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own voice logs" 
    ON public.voice_ai_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 7. Insurance Policies (Weather-Indexed Crop Insurance)
CREATE TABLE public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    policy_name VARCHAR(150) NOT NULL,
    coverage_amount NUMERIC(12, 2) NOT NULL,
    premium_amount NUMERIC(10, 2) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'rainfall_deficit',
    trigger_params JSONB NOT NULL DEFAULT '{"threshold_mm": 12, "consecutive_days": 7}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'payout_released')),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own insurance policies" ON public.insurance_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own insurance policies" ON public.insurance_policies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Carbon Credits Ledger
CREATE TABLE public.carbon_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    credit_type VARCHAR(50) NOT NULL DEFAULT 'soil_sequestration',
    metric_tons_co2 NUMERIC(10, 4) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'traded', 'retired')),
    market_rate_per_ton NUMERIC(10, 2) DEFAULT 1200.00,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.carbon_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own carbon credits" ON public.carbon_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own carbon credits" ON public.carbon_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Drone Flight Plans
CREATE TABLE public.drone_flight_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    waypoints JSONB NOT NULL,
    flight_altitude_meters NUMERIC(5, 1) DEFAULT 15.0,
    spray_rate_liters_per_ha NUMERIC(6, 2) DEFAULT 10.0,
    estimated_duration_minutes NUMERIC(5, 1),
    estimated_battery_percent NUMERIC(5, 1),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_flight', 'completed', 'aborted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.drone_flight_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own drone plans" ON public.drone_flight_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own drone plans" ON public.drone_flight_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Satellite Imagery Sync Runs
CREATE TABLE public.satellite_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_batch_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    satellite_name VARCHAR(100) NOT NULL,
    sensor_name VARCHAR(100) NOT NULL,
    resolution VARCHAR(20) NOT NULL,
    cloud_cover NUMERIC(5,2) DEFAULT 0.0,
    image_url TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.satellite_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own satellite syncs" ON public.satellite_syncs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own satellite syncs" ON public.satellite_syncs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, language_preference, aadhar_card, land_paper, profile_pic)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Agri Farmer'),
        COALESCE(new.raw_user_meta_data->>'phone_number', ''),
        'en-IN',
        '',
        '',
        ''
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution link
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =======================================================
-- 11. E-Commerce Marketplace Products
-- =======================================================
DROP TABLE IF EXISTS public.marketplace_products CASCADE;
CREATE TABLE public.marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    npk_ratio VARCHAR(30) DEFAULT '0-0-0',
    price NUMERIC(10, 2) NOT NULL,
    weight VARCHAR(50) DEFAULT '1kg',
    stock INTEGER DEFAULT 10,
    image_url TEXT,
    category VARCHAR(50) DEFAULT 'General',
    type VARCHAR(50) DEFAULT 'Solid',
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for all" ON public.marketplace_products FOR SELECT USING (true);
CREATE POLICY "Allow insert for all" ON public.marketplace_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON public.marketplace_products FOR UPDATE USING (true);

-- Seed default approved products
INSERT INTO public.marketplace_products (name, brand, npk_ratio, price, weight, stock, image_url, category, type, status)
VALUES 
('Nano Urea (Liquid)', 'IFFCO', '46-0-0', 240.00, '500ml', 120, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300', 'Nitrogenous', 'Liquid', 'approved'),
('DAP (Di-ammonium Phosphate)', 'Coromandel', '18-46-0', 1350.00, '50kg', 45, 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300', 'Phosphatic', 'Granular', 'approved'),
('Organic Vermicompost', 'EcoKisan', '1-1-1', 400.00, '40kg', 200, 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=300', 'Organic', 'Solid', 'approved'),
('MOP (Muriate of Potash)', 'IPL', '0-0-60', 1700.00, '50kg', 25, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=300', 'Potassic', 'Granular', 'approved');


-- =======================================================
-- 12. E-Commerce Orders
-- =======================================================
DROP TABLE IF EXISTS public.marketplace_orders CASCADE;
CREATE TABLE public.marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    payment_id VARCHAR(100),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own orders" ON public.marketplace_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow insert for all orders" ON public.marketplace_orders FOR INSERT WITH CHECK (true);


-- =======================================================
-- 13. B2B Agri-Bazaar Produce Listings (Vegetables & Fruits)
-- =======================================================
DROP TABLE IF EXISTS public.bazaar_products CASCADE;
CREATE TABLE public.bazaar_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    price_per_kg NUMERIC(10, 2) NOT NULL,
    stock_kg NUMERIC(10, 2) DEFAULT 100.00,
    image_url TEXT,
    category VARCHAR(50) DEFAULT 'Vegetables' CHECK (category IN ('Vegetables', 'Fruits', 'Herbs', 'Grains')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bazaar_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for all bazaar products" ON public.bazaar_products FOR SELECT USING (true);
CREATE POLICY "Allow insert for all bazaar products" ON public.bazaar_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all bazaar products" ON public.bazaar_products FOR UPDATE USING (true);

-- Seed default approved B2B produce items
INSERT INTO public.bazaar_products (name, price_per_kg, stock_kg, image_url, category, description, status)
VALUES 
('Organic Tomatoes (JS-Var)', 45.00, 500, 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=300', 'Vegetables', 'Fresh organically harvested tomatoes from local Vidisha cooperative. Transported in cold-chain.', 'approved'),
('Fresh Potatoes (Kufri Jyoti)', 28.00, 1200, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300', 'Vegetables', 'High starch, premium boiling potatoes. Harvested under 10 days.', 'approved'),
('Premium Nagpur Oranges', 90.00, 300, 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=300', 'Fruits', 'Sweet, juicy citrus oranges direct from Nagpur growers.', 'approved'),
('Fresh Green Chillies', 60.00, 150, 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=300', 'Herbs', 'Extremely spicy, organic green chillies ideal for hotel bulk supply.', 'approved');


-- =======================================================
-- 14. B2B Agri-Bazaar Orders
-- =======================================================
DROP TABLE IF EXISTS public.bazaar_orders CASCADE;
CREATE TABLE public.bazaar_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    payment_id VARCHAR(100),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bazaar_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own bazaar orders" ON public.bazaar_orders FOR SELECT USING (true);
CREATE POLICY "Allow insert for all bazaar orders" ON public.bazaar_orders FOR INSERT WITH CHECK (true);

-- =======================================================
-- 15. Applied Government Schemes Ledger
-- =======================================================
DROP TABLE IF EXISTS public.applied_schemes CASCADE;
CREATE TABLE public.applied_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    scheme_id VARCHAR(100) NOT NULL,
    scheme_name VARCHAR(200) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) DEFAULT 'Under Review' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected', 'Disbursed')),
    documents JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    tracking_code VARCHAR(100) NOT NULL
);

ALTER TABLE public.applied_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for all applied schemes" ON public.applied_schemes FOR SELECT USING (true);
CREATE POLICY "Allow insert for all applied schemes" ON public.applied_schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all applied schemes" ON public.applied_schemes FOR UPDATE USING (true);

-- =======================================================
-- 16. Telephony Call Center Logs & Snapshots
-- =======================================================
DROP TABLE IF EXISTS public.voice_call_logs CASCADE;
CREATE TABLE public.voice_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    farmer_name VARCHAR(150),
    farm_name VARCHAR(150),
    crop_type VARCHAR(50),
    telemetry_snapshot JSONB NOT NULL,
    weather_snapshot JSONB NOT NULL,
    matched_schemes JSONB NOT NULL,
    ai_transcript TEXT NOT NULL,
    call_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for all voice logs" ON public.voice_call_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert for all voice logs" ON public.voice_call_logs FOR INSERT WITH CHECK (true);



