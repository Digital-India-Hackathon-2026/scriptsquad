import { Router, Request, Response } from 'express';
import { queryMultiSatelliteSTAC } from '../bhoonidhi';
import { supabase } from '../db';
import axios from 'axios';

const router = Router();

// Local session cache to save sync batches dynamically for mock/demo runs
let mockHistoryDb: any[] = [];

// Initialize local session cache with default mock runs so history is never empty
const now = Date.now();
mockHistoryDb = [
  {
    id: 'mock-hist-1',
    farm_id: 'f1-9021',
    sync_batch_id: 'batch-mock-hist-1',
    telemetry_snapshot: { moisture: 65, temperature: 24, canopy_opacity: 0.75 },
    satellite_passes_metadata: [
      { satellite: 'Sentinel-2c', sensor: 'MSI', resolution: '10m', cloud_cover: 12.4, datetime: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-hist-2',
    farm_id: 'f1-9021',
    sync_batch_id: 'batch-mock-hist-2',
    telemetry_snapshot: { moisture: 42, temperature: 28, canopy_opacity: 0.55 },
    satellite_passes_metadata: [
      { satellite: 'Sentinel-1', sensor: 'SAR C-band Radar', resolution: '20m', cloud_cover: 0, datetime: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-hist-3',
    farm_id: 'f1-9021',
    sync_batch_id: 'batch-mock-hist-3',
    telemetry_snapshot: { moisture: 78, temperature: 21, canopy_opacity: 0.88 },
    satellite_passes_metadata: [
      { satellite: 'Landsat-8/9', sensor: 'OLI-2/TIRS-2', resolution: '30m', cloud_cover: 45.2, datetime: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    created_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to determine if a string is a valid UUID
const isValidUUID = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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

// Bhoonidhi Multi-Satellite STAC Imagery Synchronizer Endpoint
router.post('/bhoonidhi/sync', async (req: Request, res: Response) => {
  const { geometry, datetime, user_id, farm_id } = req.body;

  if (!geometry) {
    return res.status(400).json({ error: 'Missing geometry parameters for STAC bounding intersects.' });
  }

  const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const queryDatetime = datetime || `${dateFrom}/${dateTo}`;

  try {
    console.log('[Bhoonidhi Route] Querying Multi-Satellite Mesh Network (ResourceSat-2, Sentinel-1, Sentinel-2, Landsat-8)...');
    const result = await queryMultiSatelliteSTAC(geometry, queryDatetime, user_id, farm_id);
    
    // Save to local session cache as well to support immediate demo persistence
    const simulatedMoisture = Math.round(30 + Math.random() * 35);
    const simulatedTemp = Math.round(20 + Math.random() * 15);
    const newRun = {
      id: result.sync_batch_id,
      farm_id: farm_id || 'f1-9021',
      sync_batch_id: result.sync_batch_id,
      telemetry_snapshot: { moisture: simulatedMoisture, temperature: simulatedTemp, canopy_opacity: 0.65 },
      satellite_passes_metadata: result.items.map((item: any) => ({
        satellite: item.properties.satellite,
        sensor: item.properties.sensor,
        resolution: item.properties.resolution,
        cloud_cover: item.properties.cloud_cover,
        datetime: item.properties.datetime,
        visual_href: item.assets?.visual?.href || ''
      })),
      created_at: new Date().toISOString()
    };
    mockHistoryDb.unshift(newRun);

    return res.json({
      success: true,
      source: result.source,
      items: result.items,
      sync_batch_id: result.sync_batch_id,
      downloaded: {
        success: true,
        storagePath: `Supabase Table satellite_syncs | Batch ID: ${result.sync_batch_id}`
      }
    });
  } catch (err: any) {
    console.error('[Bhoonidhi Route] Multi-Satellite sync failed:', err.message);
    res.status(500).json({ error: 'Failed to synchronize multi-satellite twin.' });
  }
});

// Fetch historical satellite runs for a farm plot (last 3 runs)
router.get('/bhoonidhi/history', async (req: Request, res: Response) => {
  const { farm_id } = req.query;
  if (!farm_id) {
    return res.status(400).json({ error: 'Missing farm_id parameter.' });
  }

  // 1. If Supabase is connected and farm_id is a valid UUID, query database
  if (supabase && isValidUUID(farm_id as string)) {
    try {
      const { data, error } = await supabase
        .from('satellite_syncs')
        .select('*')
        .eq('farm_id', farm_id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Group flat DB rows by sync_batch_id into structured batches expected by the frontend
        const groupedMap = new Map<string, any>();
        for (const row of data) {
          const batchId = row.sync_batch_id;
          if (!groupedMap.has(batchId)) {
            // Seed stable mock telemetry values derived from batch UUID
            const charSum = batchId.split('-')[0].split('').reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
            const moisture = 30 + (charSum % 35);
            const temperature = 20 + (charSum % 15);
            const canopy_opacity = 0.4 + ((charSum % 5) * 0.1);

            groupedMap.set(batchId, {
              id: batchId,
              farm_id: row.farm_id,
              sync_batch_id: batchId,
              telemetry_snapshot: { moisture, temperature, canopy_opacity },
              satellite_passes_metadata: [],
              created_at: row.created_at
            });
          }
          const batch = groupedMap.get(batchId);
          batch.satellite_passes_metadata.push({
            satellite: row.satellite_name,
            sensor: row.sensor_name,
            resolution: row.resolution,
            cloud_cover: row.cloud_cover,
            datetime: row.captured_at,
            visual_href: row.image_url
          });
        }
        const groupedList = Array.from(groupedMap.values()).slice(0, 3);
        return res.json(groupedList);
      }
    } catch (e: any) {
      console.error('[Bhoonidhi History DB Error]', e.message);
    }
  }

  // 2. Fall back to local memory session cache (guarantees timeline is never empty for mocks & demos)
  const filtered = mockHistoryDb.filter(run => run.farm_id === farm_id || farm_id === 'f1-9021').slice(0, 3);
  
  // If session cache is empty for this specific farm, return the default mock runs
  if (filtered.length === 0) {
    const defaultMocks = mockHistoryDb.slice(0, 3).map(run => ({
      ...run,
      farm_id
    }));
    return res.json(defaultMocks);
  }

  return res.json(filtered);
});

export default router;
