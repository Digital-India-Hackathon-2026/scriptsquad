import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Map as MapIcon, Cpu, ShoppingBag, MessageSquare, Activity, User as UserIcon, Award } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import OverviewPage from './pages/OverviewPage';
import TwinPage from './pages/TwinPage';
import MarketPage from './pages/MarketPage';
import VoicePage from './pages/VoicePage';
import PfriePage from './pages/PfriePage';
import ProfilePage from './pages/ProfilePage';
import SchemesPage from './pages/SchemesPage';
import { API_URL } from './lib/api';
import type { Farm, Booking, Product, CartItem, PfrieScores } from './types';
import { translations, type LangType } from './lib/locale';

export default function App() {
  const { currentUser, setCurrentUser, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');

  // Multilingual localization state
  const [lang, setLang] = useState<LangType>('en');
  const t = translations[lang];

  // Tab selections
  const [activeTab, setActiveTab] = useState<'field' | 'twin' | 'market' | 'voice' | 'profile' | 'pfrie' | 'schemes'>('field');
  const [overviewSubTab, setOverviewSubTab] = useState<'map' | 'risk'>('map');
  const [portalTab, setPortalTab] = useState<'gis' | 'gov' | 'schema'>('gis');

  // Sidebar navigation expansion state
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Profile Edit states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAadhar, setProfileAadhar] = useState('');
  const [profileLandPaper, setProfileLandPaper] = useState('');
  const [profilePic, setProfilePic] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');

  // Global Active Farm Plot selector state
  const [activeFarmIndex, setActiveFarmIndex] = useState(0);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const speechActive = true;

  // Farm GIS states
  const [farmsList, setFarmsList] = useState<Farm[]>([]);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmCrop, setNewFarmCrop] = useState('Soybean');
  const [newFarmCoords, setNewFarmCoords] = useState('76.5, 20.1; 76.6, 20.1; 76.6, 20.2; 76.5, 20.2');

  const [liveTelemetry, setLiveTelemetry] = useState({
    moisture: 34.5,
    nitrogen: 48,
    phosphorus: 32,
    potassium: 50,
    timestamp: '00:00:00'
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [newBookingType, setNewBookingType] = useState('drone_sprayer');
  const [newBookingDate, setNewBookingDate] = useState('2026-07-07');
  const [bookingCost, setBookingCost] = useState('3500');

  // AREX E-Commerce & Fleet States
  const [marketSubTab, setMarketSubTab] = useState<'shop' | 'fleet' | 'logistics' | 'admin' | 'bazaar'>('shop');
  const [marketProducts, setMarketProducts] = useState<Product[]>([]);
  const [bazaarProducts, setBazaarProducts] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  
  // New Fleet Booking Fields
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');

  // Sell Fertilizer form
  const [sellFertName, setSellFertName] = useState('');
  const [sellFertPrice, setSellFertPrice] = useState('');
  const [sellFertNpk, setSellFertNpk] = useState('');
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Admin Dashboard State
  const [adminData, setAdminData] = useState<any>(null);

  // Pending Listings for admin verification
  const [pendingListings, setPendingListings] = useState<any[]>([]);

  // PFRIE Analytics states
  const [pfrieScores, setPfrieScores] = useState<PfrieScores | null>(null);
  const [pfrieLoading, setPfrieLoading] = useState(false);

  // ESP32 IoT Sensor Connection states
  const [espConnectionMode, setEspConnectionMode] = useState<'wifi' | 'ble' | 'serial'>('wifi');
  const [espStatus, setEspStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [espWifiSsid, setEspWifiSsid] = useState('Agri-ESP32-AP');
  const [espWifiIp, setEspWifiIp] = useState('192.168.4.1');
  const [espLogs, setEspLogs] = useState<string[]>([
    '[System] ESP32 Serial Monitor initialized. Offline.'
  ]);

  // Insurance states
  const [insurancePolicies, setInsurancePolicies] = useState<any[]>([]);

  // Carbon Credits states
  const [carbonCredits, setCarbonCredits] = useState<any[]>([]);

  // Drone Flight Plan states
  const [dronePlans, setDronePlans] = useState<any[]>([]);
  const [droneGenerating, setDroneGenerating] = useState(false);

  // Separate longitude/latitude coordinate inputs
  const [coordInputMode, setCoordInputMode] = useState<'single' | 'polygon'>('single');
  const [singleLat, setSingleLat] = useState('18.521');
  const [singleLng, setSingleLng] = useState('73.8575');
  const [singleRadius, setSingleRadius] = useState('50');

  // Voice AI simulation logs
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const [voiceLogs, setVoiceLogs] = useState<any[]>([
    {
      sender: 'ai',
      text: 'Namaskar! I am your SAKHI assistant. Click any visual prompt or hold the microphone button to ask a question.',
      textHi: 'नमस्कार! मैं आपका SAKHI सहायक हूँ। प्रश्न पूछने के लिए नीचे दिए बटनों को दबाएं।',
      textMr: 'नमस्कार! मी आपला SAKHI सहाय्यक आहे. प्रश्न विचारण्यासाठी खालील बटण दाबा.',
      time: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // References
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Sync profile details state
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAadhar(currentUser.aadhar_card || '');
      setProfileLandPaper(currentUser.land_paper || '');
      setProfilePic(currentUser.profile_pic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    }
  }, [currentUser]);

  // Fetch live backend states once upon login
  useEffect(() => {
    if (!currentUser) return;

    fetch(`${API_URL}/arex/bookings?user_id=${currentUser.id}`)
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(() => {
        setBookings([
          { id: 'b1-0092', machinery_type: 'drone_sprayer', booking_date: '2026-07-06', status: 'scheduled', cost_amount: 3500.00, provider_id: 'SHERPUR-COOP-04' },
          { id: 'b2-1182', machinery_type: 'harvester', booking_date: '2026-07-12', status: 'pending', cost_amount: 12000.00, provider_id: 'AREX-FLEET-B' }
        ]);
      });



    fetch(`${API_URL}/marketplace/fertilizers`)
      .then(res => res.json())
      .then(data => setMarketProducts(data))
      .catch(() => {});

    fetch(`${API_URL}/bazaar/products`)
      .then(res => res.json())
      .then(data => setBazaarProducts(data))
      .catch(() => {});

    if (currentUser.email === 'admin@demo.com' || currentUser.role === 'admin') {
      fetch(`${API_URL}/admin/monitoring?admin_key=admin123`)
        .then(res => res.json())
        .then(data => setAdminData(data))
        .catch(() => {});

      // Fetch pending listings for admin
      fetch(`${API_URL}/marketplace/pending`)
        .then(res => res.json())
        .then(data => setPendingListings(data))
        .catch(() => {
          setPendingListings([
            { id: 'pend-demo', name: 'Bio-Humic Acid Concentrate', brand: 'GreenRoot', npk_ratio: '0-0-0', price: 520, weight: '5 Litre', stock: 50, seller: 'Ramesh Kumar', seller_name: 'Ramesh Kumar', seller_phone: '9876501234', seller_email: 'ramesh@farm.com', image_url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300', category: 'Organic', type: 'Liquid', description: 'Premium bio-humic acid for soil health improvement.', submitted_at: '2026-07-08T10:30:00Z', status: 'pending' }
          ]);
        });
    }

    fetch(`${API_URL}/farms?user_id=${currentUser.id}`)
      .then(res => res.json())
      .then(data => setFarmsList(data))
      .catch(() => {
        setFarmsList([
          {
            id: 'f1-9021',
            location_name: "Sukhdev's Soybean Field",
            primary_crop: 'Soybean',
            health: 'Optimal Vitality',
            code: '#15803d',
            coordinates: [[76.3, 20.2], [76.4, 20.2], [76.4, 20.3], [76.3, 20.3], [76.3, 20.2]]
          },
          {
            id: 'f2-8812',
            location_name: 'Adjoining Plot A',
            primary_crop: 'Wheat',
            health: 'Water Deficit Warning',
            code: '#c2410c',
            coordinates: [[76.7, 20.5], [76.8, 20.5], [76.8, 20.6], [76.7, 20.6], [76.7, 20.5]]
          },
          {
            id: 'f3-3312',
            location_name: 'Adjoining Plot B',
            primary_crop: 'Cotton',
            health: 'Fungal Infection (High Risk)',
            code: '#b91c1c',
            coordinates: [[76.1, 20.7], [76.2, 20.7], [76.2, 20.8], [76.1, 20.8], [76.1, 20.7]]
          }
        ]);
      });

    fetch(`${API_URL}/insurance`)
      .then(res => res.json())
      .then(data => setInsurancePolicies(data))
      .catch(() => {
        setInsurancePolicies([
          { id: 'ins-001', policy_name: 'Kharif Rainfall Shield 2026', coverage_amount: 150000, premium_amount: 4500, trigger_type: 'rainfall_deficit', trigger_params: { threshold_mm: 12, consecutive_days: 7 }, status: 'active', valid_from: '2026-06-01', valid_until: '2026-11-30' },
          { id: 'ins-002', policy_name: 'Hailstorm Protection Plan', coverage_amount: 75000, premium_amount: 2200, trigger_type: 'hailstorm', trigger_params: { hail_diameter_mm: 10, wind_speed_kmh: 60 }, status: 'active', valid_from: '2026-07-01', valid_until: '2026-10-31' }
        ]);
      });

    fetch(`${API_URL}/carbon-credits`)
      .then(res => res.json())
      .then(data => setCarbonCredits(data))
      .catch(() => {
        setCarbonCredits([
          { id: 'cc-001', credit_type: 'soil_sequestration', metric_tons_co2: 2.45, verification_status: 'verified', market_rate_per_ton: 1200, period_start: '2026-01-01', period_end: '2026-06-30' },
          { id: 'cc-002', credit_type: 'cover_crop_offset', metric_tons_co2: 1.12, verification_status: 'pending', market_rate_per_ton: 1200, period_start: '2026-04-01', period_end: '2026-07-05' }
        ]);
      });

    fetch(`${API_URL}/drone-plans`)
      .then(res => res.json())
      .then(data => setDronePlans(data))
      .catch(() => {
        setDronePlans([
          { id: 'dp-001', farm_id: 'f1-9021', waypoints: [[73.852, 18.517], [73.863, 18.517], [73.863, 18.519], [73.852, 18.519], [73.852, 18.521], [73.863, 18.521], [73.863, 18.523], [73.852, 18.523]], flight_altitude_meters: 15.0, spray_rate_liters_per_ha: 10.0, estimated_duration_minutes: 12.5, estimated_battery_percent: 50, status: 'planned' }
        ]);
      });

    setPfrieLoading(true);
    fetch(`${API_URL}/pfrie/analytics`)
      .then(res => res.json())
      .then(data => { setPfrieScores(data); setPfrieLoading(false); })
      .catch(() => {
        setPfrieScores({
          living_root_intelligence: { score: 82, status: 'healthy', detail: 'Root biomass density optimal. Mycorrhizal activity normal.' },
          groundwater_digital_twin: { score: 71, status: 'moderate', detail: 'Water table depth: 8.2m. Recharge rate: 0.3mm/day.' },
          village_disease_intelligence: { score: 88, status: 'safe', detail: 'No active pathogen vectors in 25km radius. Sentinel monitoring active.' },
          climate_survival_simulator: { score: 64, status: 'warning', detail: 'Drought probability 38% in next 21 days. Heat stress index rising.' },
          autonomous_seasonal_planner: { score: 91, status: 'optimal', detail: 'Current phase: Vegetative Growth. Next action: Foliar spray in 3 days.' },
          farm_resilience_score: { score: 78, status: 'good', detail: 'Composite index: 78/100. Credit eligibility: Grade A.' }
        });
        setPfrieLoading(false);
      });
  }, [currentUser]);

  // Telemetry Poller Hook
  useEffect(() => {
    if (!currentUser || farmsList.length === 0) return;

    const pollTelemetry = () => {
      const activeFarm = farmsList[activeFarmIndex];
      const url = activeFarm ? `${API_URL}/telemetry?farm_id=${activeFarm.id}` : `${API_URL}/telemetry`;
      fetch(url)
        .then(res => res.json())
        .then(data => setLiveTelemetry(data))
        .catch(() => {
          const time = new Date().toLocaleTimeString('en-US', { hour12: false });
          const idx = activeFarmIndex % 4;
          let mockMoisture = 35;
          let mockN = 65;
          let mockP = 45;
          let mockK = 55;
          
          if (idx === 0) {
            mockN = 25; // Low Nitrogen -> Nano Urea
          } else if (idx === 1) {
            mockP = 12; // Low Phosphorus -> DAP
          } else if (idx === 2) {
            mockK = 18; // Low Potassium -> MOP
          } else {
            mockMoisture = 55; // Optimal -> Organic Vermicompost
          }

          const driftMoisture = Number((mockMoisture + Math.random() * 1.5).toFixed(1));
          const driftN = Math.round(mockN + (Math.random() - 0.5) * 2);
          const driftP = Math.round(mockP + (Math.random() - 0.5) * 1.5);
          const driftK = Math.round(mockK + (Math.random() - 0.5) * 2);
          
          setLiveTelemetry({ 
            timestamp: time, 
            moisture: driftMoisture, 
            nitrogen: driftN, 
            phosphorus: driftP, 
            potassium: driftK 
          });
        });
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 3000);
    return () => clearInterval(interval);
  }, [currentUser, activeFarmIndex, farmsList]);

  // Reset AI recommendation on active farm change
  useEffect(() => {
    setAiRecommendation(null);
  }, [activeFarmIndex]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!currentUser || activeTab !== 'field' || overviewSubTab !== 'map' || !mapContainer.current) return;

    const activeFarm = farmsList[activeFarmIndex] || farmsList[0];
    const initialCenter = activeFarm ? activeFarm.coordinates[0] : [76.5, 20.5];

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar'
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: initialCenter as [number, number],
      zoom: activeFarm ? 15 : 6,
      attributionControl: false
    });
    mapRef.current = mapInstance;

    mapInstance.on('load', () => {
      if (!mapRef.current) return;

      mapRef.current.addSource('farm-plots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: farmsList.map(farm => ({
            type: 'Feature',
            properties: { name: farm.location_name, health: farm.health, code: farm.code },
            geometry: {
              type: 'Polygon',
              coordinates: [farm.coordinates]
            }
          }))
        }
      });

      mapRef.current.addLayer({
        id: 'farm-plots-fill',
        type: 'fill',
        source: 'farm-plots',
        paint: {
          'fill-color': ['get', 'code'],
          'fill-opacity': 0.25
        }
      });

      mapRef.current.addLayer({
        id: 'farm-plots-outline',
        type: 'line',
        source: 'farm-plots',
        paint: {
          'line-color': ['get', 'code'],
          'line-width': 3.0
        }
      });
    });

    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [currentUser, activeTab, overviewSubTab, activeFarmIndex, farmsList]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        if (authEmail === 'farmer@demo.com' && authPassword === 'farmer123') {
          setCurrentUser({
            id: 'demo-farmer-uid',
            email: 'farmer@demo.com',
            name: 'Sukhdev Singh',
            phone: '9876543210',
            aadhar_card: '1234-5678-9012',
            land_paper: 'Khasra-4921/B',
            profile_pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          });
        } else if (authEmail === 'admin@demo.com' && authPassword === 'admin123') {
          setCurrentUser({
            id: 'demo-admin-uid',
            email: 'admin@demo.com',
            name: 'System Admin Coordinator',
            phone: '9988776655'
          });
        } else {
          alert('Invalid credentials. Use farmer@demo.com / farmer123 for testing.');
        }
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, name: authName, phone: authPhone })
        });
        if (!res.ok) throw new Error();
        await res.json();
        alert('Registration successful! Please login.');
        setAuthMode('login');
      } catch (err) {
        alert('Registration failed. Try logging in with farmer@demo.com');
      }
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCurrentUser(data.user);
      setActiveTab('market');
      setMarketSubTab('admin');
    } catch (err) {
      // Fallback mock: check hardcoded admin credentials
      if (username === 'jayesh' && password === 'jayesh') {
        setCurrentUser({
          id: 'admin-jayesh-uid',
          email: 'jayesh@admin.agrixmbd.com',
          name: 'Jayesh (Admin)',
          phone: '9999999999',
          role: 'admin'
        } as any);
        setActiveTab('market');
        setMarketSubTab('admin');
      } else {
        alert('Invalid admin credentials.');
      }
    }
  };



  // Register Farm Boundary
  const handleFarmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      let coordPairs: number[][] = [];
      
      if (coordInputMode === 'single') {
        let latVal = parseFloat(singleLat.trim());
        let lngVal = parseFloat(singleLng.trim());
        const rVal = parseFloat(singleRadius.trim()) || 50;
        
        if (isNaN(latVal) || isNaN(lngVal)) throw new Error();
        
        // Auto-detect and flip if user swapped lat/lng inputs
        if (latVal >= 68.0 && latVal <= 98.0 && lngVal >= 8.0 && lngVal <= 38.0) {
          const temp = latVal;
          latVal = lngVal;
          lngVal = temp;
        }
        
        const dLat = rVal / 111000;
        const dLng = rVal / (111000 * Math.cos(latVal * Math.PI / 180));
        
        coordPairs = [
          [lngVal - dLng, latVal - dLat],
          [lngVal + dLng, latVal - dLat],
          [lngVal + dLng, latVal + dLat],
          [lngVal - dLng, latVal + dLat],
          [lngVal - dLng, latVal - dLat]
        ];
      } else {
        coordPairs = newFarmCoords.split(';').map(pair => {
          const parts = pair.split(',');
          if (parts.length !== 2) throw new Error();
          const val1 = parseFloat(parts[0].trim());
          const val2 = parseFloat(parts[1].trim());
          if (isNaN(val1) || isNaN(val2)) throw new Error();
          
          let lng = val1;
          let lat = val2;
          if (val1 >= 8.0 && val1 <= 38.0 && val2 >= 68.0 && val2 <= 98.0) {
            lng = val2;
            lat = val1;
          }
          return [lng, lat];
        });
      }

      if (coordPairs.length < 3) {
        alert('Coordinates polygon must have at least 3 vertices.');
        return;
      }
      if (
        coordPairs[0][0] !== coordPairs[coordPairs.length - 1][0] ||
        coordPairs[0][1] !== coordPairs[coordPairs.length - 1][1]
      ) {
        coordPairs.push(coordPairs[0]);
      }

      const res = await fetch(`${API_URL}/farms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          location_name: newFarmName,
          primary_crop: newFarmCrop,
          coordinates: coordPairs
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newFarm = data.farm || data;
      setFarmsList(prev => [...prev, newFarm]);
      setNewFarmName('');
      alert('Plot boundary registered successfully!');
    } catch (err) {
      alert('Failed to register. Vertices must be formatted: lng, lat; lng, lat...');
    }
  };

  // Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          name: profileName,
          phone: profilePhone,
          aadhar_card: profileAadhar,
          land_paper: profileLandPaper,
          profile_pic: profilePic
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCurrentUser(data.user);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Profile update failed.');
    }
  };

  // Machinery Fleet Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const activeFarm = farmsList[activeFarmIndex];
    try {
      const res = await fetch(`${API_URL}/arex/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          farm_id: activeFarm ? activeFarm.id : null,
          machinery_type: newBookingType,
          booking_date: newBookingDate,
          booking_time: bookingTime,
          cost_amount: parseFloat(bookingCost),
          farmer_name: currentUser.name,
          email: bookingEmail,
          phone: bookingPhone,
          address: bookingAddress
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(prev => [...prev, data.booking]);
      alert('Booking request submitted!');
    } catch (err) {
      alert('Failed to submit booking.');
    }
  };

  // Add Marketplace to Cart
  const handleAddToCart = (prod: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  // E-Commerce Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0 || !currentUser) return;
    setRazorpayLoading(true);
    try {
      const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
      
      // 1. Create order on backend
      const orderRes = await fetch(`${API_URL}/razorpay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: `rcpt_${Math.floor(Math.random() * 100000)}`
        })
      });
      if (!orderRes.ok) throw new Error('Order creation failed.');
      const orderData = await orderRes.json();

      // 2. Call verify on backend to log order in Supabase
      const verifyRes = await fetch(`${API_URL}/razorpay/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderData.id,
          razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          razorpay_signature: 'mock_signature',
          user_id: currentUser.id,
          total_amount: totalAmount,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price
          }))
        })
      });
      if (!verifyRes.ok) throw new Error('Payment verification failed.');

      setCartItems([]);
      setIsCartOpen(false);
      alert('Transaction Successful! Order logged in database. Cold-Storage logistics node dispatched.');
    } catch (err: any) {
      alert(`Checkout failed: ${err.message || 'Server error'}`);
    } finally {
      setRazorpayLoading(false);
    }
  };

  // Sell Fertilizer (submits for admin review)
  const handleSellSubmit = async (formData: any) => {
    try {
      const res = await fetch(`${API_URL}/marketplace/fertilizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || sellFertName,
          npk_ratio: formData.npk_ratio || sellFertNpk,
          price: parseFloat(formData.price || sellFertPrice),
          weight: formData.weight || '50kg',
          stock: parseInt(formData.stock) || 10,
          category: formData.category || 'General',
          type: 'Solid',
          description: formData.description || '',
          seller_name: currentUser ? currentUser.name : 'Unknown Seller',
          seller_phone: formData.seller_phone || currentUser?.phone || '',
          seller_email: formData.seller_email || currentUser?.email || '',
          image_url: formData.image_url || '',
          seller: currentUser ? currentUser.name : 'Unknown Seller',
          user_id: currentUser ? currentUser.id : null
        })
      });
      if (!res.ok) throw new Error();
      setSellFertName('');
      setSellFertPrice('');
      setSellFertNpk('');
      setIsSellModalOpen(false);
      alert('Product submitted for admin review! It will appear on the marketplace once approved.');
    } catch (err) {
      // Mock fallback - add to pending locally
      const mockPending = {
        id: `pend-${Math.floor(Math.random() * 90000)}`,
        name: formData.name || sellFertName,
        npk_ratio: formData.npk_ratio || sellFertNpk,
        price: parseFloat(formData.price || sellFertPrice),
        weight: formData.weight || '50kg',
        stock: parseInt(formData.stock) || 10,
        category: formData.category || 'General',
        type: 'Solid',
        description: formData.description || '',
        seller_name: currentUser ? currentUser.name : 'Unknown Seller',
        seller_phone: formData.seller_phone || currentUser?.phone || '',
        seller_email: formData.seller_email || currentUser?.email || '',
        image_url: formData.image_url || '',
        seller: currentUser ? currentUser.name : 'Unknown Seller',
        submitted_at: new Date().toISOString(),
        status: 'pending'
      };
      setPendingListings(prev => [mockPending, ...prev]);
      setSellFertName('');
      setSellFertPrice('');
      setSellFertNpk('');
      setIsSellModalOpen(false);
      alert('Product submitted for admin review! It will appear on the marketplace once approved.');
    }
  };

  // Fetch B2B Agri-Bazaar Produce
  const fetchBazaarProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/bazaar/products`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBazaarProducts(data);
    } catch (err) {
      console.warn('[Bazaar Products Catch]', err);
    }
  };

  // Sell Bazaar Produce Submit
  const handleSellBazaarSubmit = async (formData: any) => {
    try {
      const res = await fetch(`${API_URL}/bazaar/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          price_per_kg: parseFloat(formData.price_per_kg),
          stock_kg: parseFloat(formData.stock_kg),
          category: formData.category || 'Vegetables',
          description: formData.description || '',
          image_url: formData.image_url || '',
          user_id: currentUser ? currentUser.id : null
        })
      });
      if (!res.ok) throw new Error();
      alert('B2B Produce listing added successfully!');
      fetchBazaarProducts();
    } catch (err) {
      // Mock Fallback
      const newMockProduce = {
        id: `baz-${Math.floor(Math.random() * 90000)}`,
        user_id: currentUser ? currentUser.id : null,
        name: formData.name,
        price_per_kg: parseFloat(formData.price_per_kg),
        stock_kg: parseFloat(formData.stock_kg),
        category: formData.category || 'Vegetables',
        description: formData.description || '',
        image_url: formData.image_url || 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=300',
        status: 'approved'
      };
      setBazaarProducts(prev => [newMockProduce, ...prev]);
      alert('B2B Produce listing added successfully! (Local Fallback)');
    }
  };

  // Bazaar Cart Checkout
  const handleBazaarCheckout = async (items: any[], total: number) => {
    if (!currentUser) return;
    try {
      const verifyRes = await fetch(`${API_URL}/bazaar/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          user_id: currentUser.id,
          total_amount: total,
          items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price_per_kg }))
        })
      });
      if (!verifyRes.ok) throw new Error();
      alert('B2B Agri-Bazaar Checkout Successful! Cold-Chain transport vehicle dispatched to seller node.');
      fetchBazaarProducts();
    } catch (err) {
      alert('B2B Checkout Successful! (Cold-Chain node dispatched)');
    }
  };

  // Admin: Approve pending listing
  const handleApproveListing = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/marketplace/approve/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPendingListings(prev => prev.filter(p => p.id !== id));
      setMarketProducts(prev => [data.product, ...prev]);
      alert('Listing approved and now live on marketplace!');
    } catch (err) {
      // Mock fallback
      const item = pendingListings.find(p => p.id === id);
      if (item) {
        setPendingListings(prev => prev.filter(p => p.id !== id));
        setMarketProducts(prev => [{ ...item, status: 'approved', id: `fert-${Math.floor(Math.random() * 90000)}` }, ...prev]);
        alert('Listing approved and now live on marketplace!');
      }
    }
  };

  // Admin: Reject pending listing
  const handleRejectListing = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/marketplace/reject/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setPendingListings(prev => prev.filter(p => p.id !== id));
      alert('Listing rejected.');
    } catch (err) {
      setPendingListings(prev => prev.filter(p => p.id !== id));
      alert('Listing rejected.');
    }
  };



  // Fetch Fertilizer Recommendations
  const fetchAIRecommendation = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/fertilizer-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moisture: liveTelemetry.moisture,
          nitrogen: liveTelemetry.nitrogen,
          phosphorus: liveTelemetry.phosphorus,
          potassium: liveTelemetry.potassium
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiRecommendation(data);
    } catch (err) {
      setAiRecommendation({
        recommendation: 'Based on moisture parameters, apply NPK 12-32-16 composite.',
        dosage: '120 kg per Hectare',
        precautions: 'Apply during central morning. Avoid water logging.'
      });
    }
  };

  // ESP32 Serial Node simulated connection
  const connectEsp32 = () => {
    setEspStatus('connecting');
    setEspLogs(prev => [...prev, `[System] Opening WebSocket node at ${espWifiIp}...`]);
    setTimeout(() => {
      setEspStatus('connected');
      setEspLogs(prev => [...prev, '[ESP32] Connection established successfully via WiFi.', '[ESP32] Ingesting real-time telemetry stream: moisture=41.2%']);
    }, 1500);
  };

  const disconnectEsp32 = () => {
    setEspStatus('disconnected');
    setEspLogs(prev => [...prev, '[System] WebSocket closed. ESP32 node offline.']);
  };

  // Generate drone waypoints plan
  const generateDronePlan = async (farmId: string) => {
    setDroneGenerating(true);
    const activeFarm = farmsList.find(f => f.id === farmId);
    if (!activeFarm) return;
    try {
      const res = await fetch(`${API_URL}/drone-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: farmId, coordinates: activeFarm.coordinates })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDronePlans(prev => [data.plan, ...prev]);
      setDroneGenerating(false);
      alert('Drone flight waypoints optimized!');
    } catch (err) {
      setDroneGenerating(false);
      alert('Failed to generate drone path.');
    }
  };

  // File Weather Crop Insurance Claim
  const fileInsuranceClaim = async (policyId: string) => {
    try {
      const res = await fetch(`${API_URL}/insurance/${policyId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      await res.json();
      setInsurancePolicies(prev => prev.map(p => p.id === policyId ? { ...p, status: 'claimed' } : p));
      alert('Claim filed successfully! Payout processing active.');
    } catch (err) {
      alert('Failed to process claim.');
    }
  };

  // Voice AI handler
  const handleVoiceSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceQuery.trim()) return;

    const userMsg = {
      sender: 'user',
      text: voiceQuery,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setVoiceLogs(prev => [...prev, userMsg]);
    const userText = voiceQuery;
    setVoiceQuery('');
    setIsTyping(true);

    fetch(`${API_URL}/voice-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_text: userText, lang: voiceLang })
    })
      .then(res => res.json())
      .then(data => {
        setIsTyping(false);
        setVoiceLogs(prev => [...prev, {
          sender: 'ai',
          text: data.ai_response,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
        speakText(data.ai_response);
      })
      .catch(() => {
        setIsTyping(false);
        let responseText = 'Soil levels are normal. Moisture balance index safe.';
        if (userText.toLowerCase().includes('stress') || userText.includes('तनाव') || userText.includes('ताण')) {
          responseText = voiceLang === 'hi-IN' 
            ? 'चेतावनी: उत्तरी क्षेत्र में पानी की कमी पाई गई है। जल्द ही सिंचाई की योजना बनाएं।'
            : voiceLang === 'mr-IN'
            ? 'चेतावणी: उत्तर क्षेत्रामध्ये पाण्याची कमतरता आढळली आहे. लवकर सिंचन सुरू करा.'
            : 'Warning: Water deficit detected in North Sector. Drip irrigation recommended.';
        } else if (userText.toLowerCase().includes('price') || userText.includes('भाव') || userText.includes('दर')) {
          responseText = voiceLang === 'hi-IN'
            ? 'बाजार भाव: सोयाबीन ४,८०० रुपये प्रति क्विंटल। गेहूं २,४५० रुपये प्रति क्विंटल।'
            : voiceLang === 'mr-IN'
            ? 'बाजार दर: सोयाबीन ४,८०० रुपये प्रति क्विंटल. गहू २,४५० रुपये प्रति क्विंटल।'
            : 'Market rates: Soybean INR 4,800/quintal. Wheat INR 2,450/quintal.';
        }

        setVoiceLogs(prev => [...prev, {
          sender: 'ai',
          text: responseText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
        speakText(responseText);
      });
  };

  const startMockSpeech = () => {
    setIsListening(true);
    speakText('Listening for voice commands...');
    
    setTimeout(() => {
      setIsListening(false);
      let queryText = 'Is my crop stressed?';
      if (voiceLang === 'hi-IN') queryText = 'क्या मेरी फसल में तनाव है?';
      else if (voiceLang === 'mr-IN') queryText = 'माझ्या पिकाला पाणी पाहिजे का?';
      setVoiceQuery(queryText);
    }, 2000);
  };

  const triggerQuickVoice = (text: string) => {
    setVoiceQuery(text);
  };

  const speakText = (txt: string) => {
    if (!speechActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = voiceLang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="dashboard-viewport">
      
      {/* Navbar Banner Header */}
      <Navbar 
        currentUser={currentUser}
        farmsList={farmsList}
        activeFarmIndex={activeFarmIndex}
        setActiveFarmIndex={setActiveFarmIndex}
        onLogout={logout}
        lang={lang}
        setLang={setLang}
      />

      <div className="dashboard-main-content">
        {!currentUser ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LandingPage 
              authMode={authMode}
              setAuthMode={setAuthMode}
              authEmail={authEmail}
              setAuthEmail={setAuthEmail}
              authPassword={authPassword}
              setAuthPassword={setAuthPassword}
              authName={authName}
              setAuthName={setAuthName}
              authPhone={authPhone}
              setAuthPhone={setAuthPhone}
              onSubmit={handleAuthSubmit}
              onAdminLogin={handleAdminLogin}
            />
          </div>
        ) : (
          <>
            {/* Collapsible left side navigation bar */}
            <nav 
              className="sidebar-container"
              style={{ width: sidebarExpanded ? '240px' : '64px' }}
              onMouseEnter={() => setSidebarExpanded(true)}
              onMouseLeave={() => setSidebarExpanded(false)}
            >
              <button 
                onClick={() => setActiveTab('field')} 
                className={`sidebar-nav-item ${activeTab === 'field' ? 'active' : ''}`}
                title={t.tabOverview}
              >
                <MapIcon size={20} />
                {sidebarExpanded && <span>{t.tabOverview}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('twin')} 
                className={`sidebar-nav-item ${activeTab === 'twin' ? 'active' : ''}`}
                title={t.tabTwin}
              >
                <Cpu size={20} />
                {sidebarExpanded && <span>{t.tabTwin}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('market')} 
                className={`sidebar-nav-item ${activeTab === 'market' ? 'active' : ''}`}
                title={t.tabMarket}
              >
                <ShoppingBag size={20} />
                {sidebarExpanded && <span>{t.tabMarket}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('voice')} 
                className={`sidebar-nav-item ${activeTab === 'voice' ? 'active' : ''}`}
                title={t.tabVoice}
              >
                <MessageSquare size={20} />
                {sidebarExpanded && <span>{t.tabVoice}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('pfrie')} 
                className={`sidebar-nav-item ${activeTab === 'pfrie' ? 'active' : ''}`}
                title={t.tabPfrie}
              >
                <Activity size={20} />
                {sidebarExpanded && <span>{t.tabPfrie}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('schemes')} 
                className={`sidebar-nav-item ${activeTab === 'schemes' ? 'active' : ''}`}
                title={lang === 'hi' ? 'योजनाएं और बीमा' : lang === 'mr' ? 'योजना आणि विमा' : 'Schemes & Insurance'}
              >
                <Award size={20} />
                {sidebarExpanded && <span>{lang === 'hi' ? 'योजनाएं और बीमा' : lang === 'mr' ? 'योजना आणि विमा' : 'Schemes & Insurance'}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                title={t.tabProfile}
              >
                <UserIcon size={20} />
                {sidebarExpanded && <span>{t.tabProfile}</span>}
              </button>
            </nav>

            {/* Display Pane taking full remaining width and height */}
            <div className="page-wrapper-compact">
              {activeTab === 'field' && (
                <OverviewPage 
                  mapContainer={mapContainer}
                  farmsList={farmsList}
                  activeFarmIndex={activeFarmIndex}
                  setActiveFarmIndex={setActiveFarmIndex}
                  liveTelemetry={liveTelemetry}
                  overviewSubTab={overviewSubTab}
                  setOverviewSubTab={setOverviewSubTab}
                  portalTab={portalTab}
                  setPortalTab={setPortalTab}
                  coordInputMode={coordInputMode}
                  setCoordInputMode={setCoordInputMode}
                  newFarmName={newFarmName}
                  setNewFarmName={setNewFarmName}
                  newFarmCrop={newFarmCrop}
                  setNewFarmCrop={setNewFarmCrop}
                  newFarmCoords={newFarmCoords}
                  setNewFarmCoords={setNewFarmCoords}
                  singleLat={singleLat}
                  setSingleLat={setSingleLat}
                  singleLng={singleLng}
                  setSingleLng={setSingleLng}
                  singleRadius={singleRadius}
                  setSingleRadius={setSingleRadius}
                  voiceLang={voiceLang}
                  speakText={speakText}
                  onFarmSubmit={handleFarmSubmit}
                  onNavigateToVoiceBookDrone={() => {
                    setActiveTab('voice');
                    triggerQuickVoice('Book drone sprayer');
                  }}
                  lang={lang}
                />
              )}

              {activeTab === 'market' && (
                <MarketPage 
                  currentUser={currentUser}
                  marketSubTab={marketSubTab}
                  setMarketSubTab={setMarketSubTab}
                  marketProducts={marketProducts}
                  cartItems={cartItems}
                  isCartOpen={isCartOpen}
                  setIsCartOpen={setIsCartOpen}
                  razorpayLoading={razorpayLoading}
                  aiRecommendation={aiRecommendation}
                  bookingTime={bookingTime}
                  setBookingTime={setBookingTime}
                  bookingEmail={bookingEmail}
                  setBookingEmail={setBookingEmail}
                  bookingPhone={bookingPhone}
                  setBookingPhone={setBookingPhone}
                  bookingAddress={bookingAddress}
                  setBookingAddress={setBookingAddress}
                  newBookingType={newBookingType}
                  setNewBookingType={setNewBookingType}
                  newBookingDate={newBookingDate}
                  setNewBookingDate={setNewBookingDate}
                  bookingCost={bookingCost}
                  setBookingCost={setBookingCost}
                  bookings={bookings}
                  adminData={adminData}
                  isSellModalOpen={isSellModalOpen}
                  setIsSellModalOpen={setIsSellModalOpen}
                  sellFertName={sellFertName}
                  setSellFertName={setSellFertName}
                  sellFertPrice={sellFertPrice}
                  setSellFertPrice={setSellFertPrice}
                  sellFertNpk={sellFertNpk}
                  setSellFertNpk={setSellFertNpk}
                  onAddToCart={handleAddToCart}
                  onCheckout={handleCheckout}
                  onSellSubmit={handleSellSubmit}
                  onBookingSubmit={handleBookingSubmit}
                  onFetchAIRecommendation={fetchAIRecommendation}
                  pendingListings={pendingListings}
                  onApproveListing={handleApproveListing}
                  onRejectListing={handleRejectListing}
                  lang={lang}
                  bazaarProducts={bazaarProducts}
                  onSellBazaarSubmit={handleSellBazaarSubmit}
                  onBazaarCheckout={handleBazaarCheckout}
                />
              )}

              {activeTab === 'voice' && (
                <VoicePage 
                  voiceLang={voiceLang}
                  setVoiceLang={setVoiceLang}
                  voiceLogs={voiceLogs}
                  isTyping={isTyping}
                  isListening={isListening}
                  voiceQuery={voiceQuery}
                  setVoiceQuery={setVoiceQuery}
                  speakText={speakText}
                  onVoiceSend={handleVoiceSend}
                  onStartMockSpeech={startMockSpeech}
                  onTriggerQuickVoice={triggerQuickVoice}
                  lang={lang}
                />
              )}

              {activeTab === 'pfrie' && (
                <PfriePage 
                  pfrieScores={pfrieScores}
                  pfrieLoading={pfrieLoading}
                  espStatus={espStatus}
                  espConnectionMode={espConnectionMode}
                  setEspConnectionMode={setEspConnectionMode}
                  espWifiSsid={espWifiSsid}
                  setEspWifiSsid={setEspWifiSsid}
                  espWifiIp={espWifiIp}
                  setEspWifiIp={setEspWifiIp}
                  connectEsp32={connectEsp32}
                  disconnectEsp32={disconnectEsp32}
                  espLogs={espLogs}
                  farmsList={farmsList}
                  dronePlans={dronePlans}
                  droneGenerating={droneGenerating}
                  generateDronePlan={generateDronePlan}
                  insurancePolicies={insurancePolicies}
                  fileInsuranceClaim={fileInsuranceClaim}
                  carbonCredits={carbonCredits}
                  lang={lang}
                  liveTelemetry={liveTelemetry}
                  activeFarmIndex={activeFarmIndex}
                  onNavigateToVoiceBookDrone={() => {
                    setActiveTab('voice');
                    triggerQuickVoice('Book drone sprayer');
                  }}
                />
              )}

              {activeTab === 'profile' && (
                <ProfilePage 
                  profileName={profileName}
                  setProfileName={setProfileName}
                  profilePhone={profilePhone}
                  setProfilePhone={setProfilePhone}
                  profileAadhar={profileAadhar}
                  setProfileAadhar={setProfileAadhar}
                  profileLandPaper={profileLandPaper}
                  setProfileLandPaper={setProfileLandPaper}
                  profilePic={profilePic}
                  setProfilePic={setProfilePic}
                  handleProfileUpdate={handleProfileUpdate}
                  setActiveTab={setActiveTab}
                  farmsList={farmsList}
                  insurancePolicies={insurancePolicies}
                  carbonCredits={carbonCredits}
                  bookings={bookings}
                  lang={lang}
                  currentUser={currentUser}
                  marketProducts={marketProducts}
                  bazaarProducts={bazaarProducts}
                />
              )}

              {activeTab === 'schemes' && (
                <SchemesPage 
                  currentUser={currentUser}
                  lang={lang}
                  farmsList={farmsList}
                  activeFarmIndex={activeFarmIndex}
                  liveTelemetry={liveTelemetry}
                  insurancePolicies={insurancePolicies}
                  setInsurancePolicies={setInsurancePolicies}
                />
              )}

              {activeTab === 'twin' && (
                <TwinPage 
                  onClose={() => setActiveTab('field')}
                  farmsList={farmsList}
                  activeFarmIndex={activeFarmIndex}
                  currentUser={currentUser}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
