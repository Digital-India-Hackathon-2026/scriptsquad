import { Router, Request, Response } from 'express';
import { supabase } from '../db';

const router = Router();

const isValidUUID = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

let farmsMock = [
  {
    id: 'f1-9021',
    location_name: "Sukhdev's Soybean Field",
    primary_crop: 'Soybean',
    health: 'Optimal Vitality',
    code: '#059669',
    coordinates: [[76.3, 20.2], [76.4, 20.2], [76.4, 20.3], [76.3, 20.3], [76.3, 20.2]]
  },
  {
    id: 'f2-8812',
    location_name: 'Adjoining Plot A',
    primary_crop: 'Wheat',
    health: 'Water Deficit Warning',
    code: '#d97706',
    coordinates: [[76.7, 20.5], [76.8, 20.5], [76.8, 20.6], [76.7, 20.6], [76.7, 20.5]]
  },
  {
    id: 'f3-3312',
    location_name: 'Adjoining Plot B',
    primary_crop: 'Cotton',
    health: 'Fungal Infection (High Risk)',
    code: '#dc2626',
    coordinates: [[76.1, 20.7], [76.2, 20.7], [76.2, 20.8], [76.1, 20.8], [76.1, 20.7]]
  }
];

const formatPostGISPolygon = (coords: number[][]) => {
  const closedCoords = [...coords];
  if (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] || 
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]) {
    closedCoords.push(closedCoords[0]);
  }
  const pointsStr = closedCoords.map(pt => `${pt[0]} ${pt[1]}`).join(', ');
  return `POLYGON((${pointsStr}))`;
};

router.get('/farms', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (supabase) {
    try {
      let query = supabase
        .from('farms')
        .select('id, location_name, primary_crop, total_area_hectares, boundary');
      
      if (user_id && isValidUUID(user_id as string)) {
        query = query.eq('user_id', user_id);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map((farm: any) => {
          let coordinates = [[76.3, 20.2], [76.4, 20.2], [76.4, 20.3], [76.3, 20.3], [76.3, 20.2]];
          if (typeof farm.boundary === 'string') {
            try {
              const matches = farm.boundary.match(/\(\((.*?)\)\)/);
              if (matches && matches[1]) {
                coordinates = matches[1].split(',').map((ptStr: string) => ptStr.trim().split(' ').map(Number));
              }
            } catch(e) {}
          } else if (farm.boundary && farm.boundary.coordinates) {
            coordinates = farm.boundary.coordinates[0];
          }
          return {
            id: farm.id,
            location_name: farm.location_name,
            primary_crop: farm.primary_crop,
            health: 'Optimal Vitality',
            code: '#059669',
            coordinates
          };
        });
        return res.json(mapped);
      }
    } catch(e) {}
  }
  res.json(farmsMock);
});

router.post('/farms', async (req: Request, res: Response) => {
  const { location_name, primary_crop, coordinates, user_id } = req.body;
  if (!location_name || !primary_crop || !coordinates) {
    return res.status(400).json({ error: 'Missing location_name, primary_crop, or coordinates array' });
  }

  const polygonWKT = formatPostGISPolygon(coordinates);
  const newId = `f-${Math.floor(1000 + Math.random() * 9000)}`;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert({
          user_id: user_id || null,
          location_name,
          primary_crop,
          boundary: polygonWKT,
          total_area_hectares: 1.5,
          soil_ph: 6.5,
          organic_matter_percent: 2.5
        })
        .select()
        .single();
      
      if (!error && data) {
        const added = {
          id: data.id,
          location_name: data.location_name,
          primary_crop: data.primary_crop,
          health: 'Optimal Vitality',
          code: '#059669',
          coordinates
        };
        farmsMock.push(added);
        return res.status(201).json(added);
      }
      console.warn('[Supabase Farm Creation] Error:', error?.message);
    } catch (e) {
      console.error('[Supabase Farm Creation] Exception:', e);
    }
  }

  const addedMock = {
    id: newId,
    location_name,
    primary_crop,
    health: 'Optimal Vitality',
    code: '#059669',
    coordinates
  };
  farmsMock.push(addedMock);
  res.status(201).json(addedMock);
});

export default router;
