import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

const isValidUUID = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// ==================== Drone Flight Plans ====================

let dronePlansMock: any[] = [
  {
    id: 'dp-001',
    farm_id: 'f1-9021',
    waypoints: [
      [73.852, 18.517], [73.863, 18.517], [73.863, 18.519], [73.852, 18.519],
      [73.852, 18.521], [73.863, 18.521], [73.863, 18.523], [73.852, 18.523]
    ],
    flight_altitude_meters: 15.0,
    spray_rate_liters_per_ha: 10.0,
    estimated_duration_minutes: 12.5,
    estimated_battery_percent: 50,
    status: 'planned'
  }
];

// Generate serpentine/lawnmower waypoints across a polygon bounding box
const generateSerpentineWaypoints = (coordinates: number[][]): number[][] => {
  // Compute bounding box from polygon coordinates
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const pt of coordinates) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }

  // ~15m spacing in degrees (approx 0.000135 degrees latitude ≈ 15m)
  const rowSpacing = 0.000135;
  const waypoints: number[][] = [];
  let leftToRight = true;
  let lat = minLat;

  while (lat <= maxLat) {
    if (leftToRight) {
      waypoints.push([minLng, lat]);
      waypoints.push([maxLng, lat]);
    } else {
      waypoints.push([maxLng, lat]);
      waypoints.push([minLng, lat]);
    }
    leftToRight = !leftToRight;
    lat += rowSpacing;
  }

  return waypoints;
};

// List Drone Flight Plans
router.get('/drone-plans', async (req: Request, res: Response) => {
  const { farm_id } = req.query;
  if (supabase) {
    if (!farm_id || isValidUUID(farm_id)) {
      let query = supabase.from('drone_flight_plans').select('*');
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Supabase Drone Plans Fetch] Failed. Falling back to mock data. Error:', error.message);
      }
    } else {
      console.info('[Supabase Drone Plans Fetch] Bypassed query: farm_id is a mock string.');
    }
  }
  
  // Filter mock list to simulate database behavior
  const filteredMock = farm_id 
    ? dronePlansMock.filter(dp => dp.farm_id === farm_id || !dp.farm_id)
    : dronePlansMock;
  res.json(filteredMock);
});

// Generate and Save Drone Flight Plan
router.post('/drone-plans', async (req: Request, res: Response) => {
  const { farm_id, coordinates, user_id } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return res.status(400).json({ error: 'Missing or invalid coordinates. Provide an array of [lng, lat] pairs forming a polygon (min 3 points).' });
  }

  const waypoints = generateSerpentineWaypoints(coordinates);
  const durationMinutes = Number(((waypoints.length * 0.5) / 60).toFixed(1));
  const maxFlightMinutes = 25;
  const batteryPercent = Number(Math.min(100, (durationMinutes / maxFlightMinutes) * 100).toFixed(1));

  if (supabase) {
    const { data, error } = await supabase
      .from('drone_flight_plans')
      .insert({
        user_id: user_id || null,
        farm_id: farm_id || null,
        waypoints,
        flight_altitude_meters: 15.0,
        spray_rate_liters_per_ha: 10.0,
        estimated_duration_minutes: durationMinutes,
        estimated_battery_percent: batteryPercent,
        status: 'planned'
      })
      .select()
      .single();

    if (!error && data) {
      return res.status(201).json(data);
    }
    console.warn('[Supabase Drone Plan Creation] Failed. Falling back to mock state. Error:', error?.message);
  }

  const newPlan = {
    id: `dp-${Math.floor(100 + Math.random() * 900)}`,
    farm_id: farm_id || null,
    waypoints,
    flight_altitude_meters: 15.0,
    spray_rate_liters_per_ha: 10.0,
    estimated_duration_minutes: durationMinutes,
    estimated_battery_percent: batteryPercent,
    status: 'planned' as const
  };

  dronePlansMock.unshift(newPlan);
  res.status(201).json(newPlan);
});

export default router;
