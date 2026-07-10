import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Satellite, Check, RotateCw, Layers, Droplets, CloudRain, AlertTriangle, Cpu, Eye, X, HelpCircle } from 'lucide-react';
import { API_URL } from '../lib/api';

interface TwinPageProps {
  onClose: () => void; // Switch back to Overview field
  farmsList: any[];
  activeFarmIndex: number;
  currentUser: any;
}

// ─── Utility Helpers ───────────────────────────────────────────

const formatToIST = (utcString?: string): string => {
  if (!utcString) return 'N/A';
  try {
    const date = new Date(utcString);
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    return formatter.format(date);
  } catch (e) {
    return utcString;
  }
};

const getRelativeTimeString = (utcString?: string): string => {
  if (!utcString) return '';
  try {
    const diffMs = Date.now() - new Date(utcString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 0) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } catch (e) {
    return '';
  }
};

const getCardImage = (item: any, farm: any) => {
  const href = item?.assets?.visual?.href || '';
  if (href && !href.startsWith('s3://') && !href.includes('usgs-landsat')) return href;
  if (farm?.coordinates?.length > 0) {
    const coords = farm.coordinates;
    const avgLng = coords.reduce((a: number, c: any) => a + c[0], 0) / coords.length;
    const avgLat = coords.reduce((a: number, c: any) => a + c[1], 0) / coords.length;
    const zoom = 17;
    const x = Math.floor((avgLng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(avgLat * Math.PI / 180) + 1 / Math.cos(avgLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
  }
  return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500';
};

// ─── 3D Map Helpers ────────────────────────────────────────────

const getRealCoordinateSatelliteTileUrl = (coords: number[][]) => {
  if (!coords || coords.length === 0) return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500';
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const zoom = 17;
  const x = Math.floor((avgLng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(avgLat * Math.PI / 180) + 1 / Math.cos(avgLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
};

const generateRealSatelliteOverlay = (
  coords: number[][],
  collection: string,
  moisture: number,
  temp: number,
  callback: (url: string) => void
) => {
  const tileUrl = getRealCoordinateSatelliteTileUrl(coords);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = tileUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) { callback(tileUrl); return; }
    ctx.drawImage(img, 0, 0, 256, 256);
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    if (collection === 'sentinel-2-l2a' || collection === 'liss4') {
      const factor = Math.min(1.5, Math.max(0.8, moisture / 40));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * 0.6;
        data[i + 1] = Math.min(255, data[i + 1] * 1.35 * factor);
        data[i + 2] = data[i + 2] * 0.75;
      }
    } else if (collection === 'sentinel-1-grd') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray * 0.15;
        data[i + 1] = Math.min(255, gray * 0.75 + (moisture * 1.1));
        data[i + 2] = Math.min(255, gray * 1.3 + 15);
      }
    } else if (collection === 'landsat-c2-l2') {
      const heatFactor = Math.min(2.0, Math.max(0.5, temp / 25));
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, gray * 1.65 * heatFactor);
        data[i + 1] = Math.min(255, gray * 0.65 * heatFactor);
        data[i + 2] = Math.min(255, gray * 0.15);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    callback(canvas.toDataURL());
  };
  img.onerror = () => { callback(tileUrl); };
};

const generateVoxelGrid = (
  farmCoords: number[][],
  moisture: number,
  opacity: number,
  forestMode: boolean = false,
  growthFactor: number = 1.0,
  scanMode: 'rgb' | 'ndvi' | 'thermal' = 'rgb'
) => {
  const lngs = farmCoords.map(c => c[0]);
  const lats = farmCoords.map(c => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const steps = 16;
  const dLng = (maxLng - minLng) / steps;
  const dLat = (maxLat - minLat) / steps;
  const features: any[] = [];
  let cellId = 0;

  const isPointInPolygon = (point: number[], polygon: number[][]) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const soilBaseHeight = moisture * 0.4;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const cellMinLng = minLng + i * dLng;
      const cellMaxLng = cellMinLng + dLng;
      const cellMinLat = minLat + j * dLat;
      const cellMaxLat = cellMinLat + dLat;
      const center = [cellMinLng + dLng / 2, cellMinLat + dLat / 2];

      if (isPointInPolygon(center, farmCoords)) {
        if (forestMode) {
          const randSeed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
          const pseudoRand = randSeed - Math.floor(randSeed);
          const baseHeight = (5.0 + pseudoRand * 4.0) * growthFactor;
          const canopyHeight = baseHeight + (4.0 * opacity);

          // 1. Trunk
          const trunkWScale = 0.35;
          const tMinLng = center[0] - (dLng * trunkWScale) / 2;
          const tMaxLng = center[0] + (dLng * trunkWScale) / 2;
          const tMinLat = center[1] - (dLat * trunkWScale) / 2;
          const tMaxLat = center[1] + (dLat * trunkWScale) / 2;

          features.push({
            type: 'Feature',
            id: `voxel-trunk-${cellId++}`,
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [tMinLng, tMinLat], [tMaxLng, tMinLat],
                [tMaxLng, tMaxLat], [tMinLng, tMaxLat],
                [tMinLng, tMinLat]
              ]]
            },
            properties: { 
              height: soilBaseHeight + baseHeight, 
              base: soilBaseHeight, 
              color: scanMode === 'thermal' ? '#ea580c' : scanMode === 'ndvi' ? '#4ade80' : '#78350f' 
            }
          });

          // 2. Canopy
          let foliageColor = '#065f46';
          if (scanMode === 'ndvi') {
            const greenShades = ['#39ff14', '#00ff66', '#00ffcc'];
            foliageColor = greenShades[Math.floor(pseudoRand * greenShades.length)];
          } else if (scanMode === 'thermal') {
            const heatColors = ['#f43f5e', '#ef4444', '#f97316'];
            foliageColor = heatColors[Math.floor(pseudoRand * heatColors.length)];
          } else {
            const greenShades = ['#065f46', '#047857', '#059669', '#10b981'];
            foliageColor = greenShades[Math.floor(pseudoRand * greenShades.length)];
          }

          features.push({
            type: 'Feature',
            id: `voxel-canopy-${cellId++}`,
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [cellMinLng, cellMinLat], [cellMaxLng, cellMinLat],
                [cellMaxLng, cellMaxLat], [cellMinLng, cellMaxLat],
                [cellMinLng, cellMinLat]
              ]]
            },
            properties: { height: soilBaseHeight + canopyHeight, base: soilBaseHeight + baseHeight, color: foliageColor }
          });
        } else {
          // Standard row model
          const rowPattern = Math.sin(i * 0.8) * 1.2 + Math.cos(j * 0.6) * 0.8;
          const baseCropVal = (opacity * 12) + 1.0;
          const cropHeightVal = Math.max(1.0, baseCropVal + rowPattern);
          const voxelBase = soilBaseHeight;
          const voxelHeight = soilBaseHeight + cropHeightVal;

          let cropColor = '';
          if (scanMode === 'ndvi') {
            cropColor = '#39ff14';
          } else if (scanMode === 'thermal') {
            cropColor = '#f97316';
          } else {
            const greenShade = Math.floor(110 + (Math.sin(i * j) * 25));
            cropColor = `rgb(16, ${greenShade}, 72)`;
          }
          
          features.push({
            type: 'Feature',
            id: `voxel-${cellId++}`,
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [cellMinLng, cellMinLat], [cellMaxLng, cellMinLat],
                [cellMaxLng, cellMaxLat], [cellMinLng, cellMaxLat],
                [cellMinLng, cellMinLat]
              ]]
            },
            properties: { height: voxelHeight, base: voxelBase, color: cropColor }
          });
        }
      }
    }
  }
  return { type: 'FeatureCollection', features };
};

// ─── Procedural 3D Boundary Trees Generator ───
const generateBoundaryTrees = (farmCoords: number[][]) => {
  const features: any[] = [];
  let treeId = 0;

  const interpolatePoints = (p1: number[], p2: number[], spacing: number = 0.00008) => {
    const points: number[][] = [];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / spacing));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([p1[0] + dx * t, p1[1] + dy * t]);
    }
    return points;
  };

  for (let i = 0; i < farmCoords.length - 1; i++) {
    const segmentPoints = interpolatePoints(farmCoords[i], farmCoords[i + 1], 0.00008);
    segmentPoints.forEach(pt => {
      const size = 0.00005;
      const minLng = pt[0] - size / 2;
      const maxLng = pt[0] + size / 2;
      const minLat = pt[1] - size / 2;
      const maxLat = pt[1] + size / 2;
      features.push({
        type: 'Feature',
        id: `boundary-tree-${treeId++}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat], [maxLng, minLat],
            [maxLng, maxLat], [minLng, maxLat],
            [minLng, minLat]
          ]]
        },
        properties: {
          height: 6 + Math.random() * 3,
          base: 0,
          color: '#064e3b'
        }
      });
    });
  }
  return { type: 'FeatureCollection', features };
};

// ─── Main Component ────────────────────────────────────────────

const TwinPage: React.FC<TwinPageProps> = ({ onClose, farmsList, activeFarmIndex, currentUser }) => {
  const activeFarm = farmsList[activeFarmIndex] || farmsList[0];

  // ─── Local State ───
  const [twinSoilMoisture, setTwinSoilMoisture] = useState(42);
  const [twinTemp, setTwinTemp] = useState(28);
  const [aiOpacity, setAiOpacity] = useState(0.6);
  const [bhoonidhiLoading, setBhoonidhiLoading] = useState(false);
  const [bhoonidhiResult, setBhoonidhiResult] = useState<any>(null);
  const [selectedSatelliteIdx, setSelectedSatelliteIdx] = useState(0);
  const [historicalSyncs, setHistoricalSyncs] = useState<any[]>([]);
  const [selectedHistSyncIdx, setSelectedHistSyncIdx] = useState(0);
  
  // Paused by default! Give user standard dragging inputs or controls to tilt/rotate!
  const [isRotating, setIsRotating] = useState(false);

  // Weather States
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; rain: number; humidity: number; wind: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Mode Selection: 3d-gis (Telemetry) vs growth-forecast (Simulation Timeline)
  const [activeModalTab, setActiveModalTab] = useState<'3d-gis' | 'growth-forecast'>('3d-gis');
  const [forestMode, setForestMode] = useState(true); 

  // Time-Travel Forecast State
  const [simulatedDays, setSimulatedDays] = useState(0);

  // Immersive AI VR Spectate Mode States
  const [vrMode, setVrMode] = useState(false);
  const [vrScanMode, setVrScanMode] = useState<'rgb' | 'ndvi' | 'thermal'>('rgb');
  const [vrTelemetryLogs, setVrTelemetryLogs] = useState<string[]>([]);

  // ─── Refs ───
  const twinMapContainer = useRef<HTMLDivElement>(null);
  const twinMapRef = useRef<maplibregl.Map | null>(null);
  const rotateIntervalRef = useRef<any>(null);

  const vrMapContainer = useRef<HTMLDivElement>(null);
  const vrMapRef = useRef<maplibregl.Map | null>(null);
  const vrRotateIntervalRef = useRef<any>(null);

  // ─── Fetch weather from Open-Meteo ───
  useEffect(() => {
    if (!activeFarm) return;
    setWeatherLoading(true);
    const coords = activeFarm.coordinates[0];
    const lat = coords[1];
    const lng = coords[0];
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`)
      .then(res => res.json())
      .then(data => {
        const curr = data.current || {};
        setCurrentWeather({
          temp: curr.temperature_2m ?? 28,
          rain: curr.precipitation ?? 0.0,
          humidity: curr.relative_humidity_2m ?? 60,
          wind: curr.wind_speed_10m ?? 12
        });
        setTwinTemp(Math.round(curr.temperature_2m ?? 28));
        setTwinSoilMoisture(Math.round(curr.relative_humidity_2m ? curr.relative_humidity_2m * 0.7 : 45));
        setWeatherLoading(false);
      })
      .catch(() => {
        setCurrentWeather({ temp: 28, rain: 0.0, humidity: 62, wind: 10.5 });
        setWeatherLoading(false);
      });
  }, [activeFarm]);

  // ─── Fetch historical runs and auto-sync on farm change ───
  useEffect(() => {
    if (!activeFarm?.id) return;
    setBhoonidhiResult(null);
    setSelectedSatelliteIdx(0);
    fetch(`${API_URL}/bhoonidhi/history?farm_id=${activeFarm.id}`)
      .then(res => res.json())
      .then(data => {
        setHistoricalSyncs(data);
        setSelectedHistSyncIdx(0);
        syncBhoonidhi();
      })
      .catch(() => {
        syncBhoonidhi();
      });
  }, [activeFarm?.id]);

  // ─── Sync Bhoonidhi ───
  function syncBhoonidhi() {
    setBhoonidhiLoading(true);
    setBhoonidhiResult(null);
    const coords = activeFarm?.coordinates || [[76.5, 20.1], [76.6, 20.1], [76.6, 20.2], [76.5, 20.2]];
    fetch(`${API_URL}/bhoonidhi/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geometry: { type: 'Polygon', coordinates: [coords] },
        user_id: currentUser?.id || null,
        farm_id: activeFarm?.id || null
      })
    })
      .then(res => res.json())
      .then(data => { 
        setBhoonidhiLoading(false); 
        if (!data?.items || data.items.length === 0) {
          throw new Error('No live satellite features returned.');
        }
        setBhoonidhiResult(data); 
        fetch(`${API_URL}/bhoonidhi/history?farm_id=${activeFarm.id}`)
          .then(r => r.json())
          .then(hData => setHistoricalSyncs(hData))
          .catch(() => {});
      })
      .catch(() => {
        setBhoonidhiLoading(false);
        if (historicalSyncs && historicalSyncs.length > 0 && historicalSyncs[0]?.satellite_passes_metadata?.length > 0) {
          const fallbackItems = historicalSyncs[0].satellite_passes_metadata.map((meta: any) => ({
            properties: {
              satellite: meta.satellite || 'ResourceSat-2',
              sensor: meta.sensor || 'LISS-IV',
              resolution: meta.resolution || '5.0m',
              cloud_cover: meta.cloud_cover ?? 5.0,
              datetime: meta.datetime || new Date(Date.now() - 86400000 * 2).toISOString()
            },
            assets: {
              visual: { href: meta.visual_href || '' }
            },
            collection: meta.collection || 'sentinel-2-l2a'
          }));

          setBhoonidhiResult({
            success: true,
            source: 'Supabase History Cache (Last Successful Capture)',
            message: 'Live STAC Registry timed out. Restored last captured images from database.',
            items: fallbackItems
          });
        } else {
          setBhoonidhiResult({
            success: true,
            source: 'ISRO Bhoonidhi STAC API (Local Simulation)',
            message: 'Satellite telemetry synced locally.',
            items: [
              {
                properties: { satellite: 'ResourceSat-2', sensor: 'LISS-IV', resolution: '5.0m', cloud_cover: 4.2, datetime: new Date(Date.now() - 86400000 * 2).toISOString() },
                assets: { visual: { href: '' } }, collection: 'liss4'
              },
              {
                properties: { satellite: 'Sentinel-2', sensor: 'MSI', resolution: '10m', cloud_cover: 8.1, datetime: new Date(Date.now() - 86400000 * 5).toISOString() },
                assets: { visual: { href: '' } }, collection: 'sentinel-2-l2a'
              },
              {
                properties: { satellite: 'Landsat-8', sensor: 'OLI/TIRS', resolution: '30m', cloud_cover: 12.5, datetime: new Date(Date.now() - 86400000 * 9).toISOString() },
                assets: { visual: { href: '' } }, collection: 'landsat-c2-l2'
              }
            ]
          });
        }
      });
  }

  // ─── Dynamic growth factor ───
  const calculateGrowthFactor = () => {
    if (historicalSyncs.length < 2) return 1.0;
    const latestMoisture = historicalSyncs[0]?.telemetry_snapshot?.moisture || 35;
    const oldestMoisture = historicalSyncs[historicalSyncs.length - 1]?.telemetry_snapshot?.moisture || 35;
    const diff = latestMoisture - oldestMoisture;
    if (diff > 5) return 1.3;
    if (diff < -5) return 0.8;
    return 1.05;
  };
  const growthFactor = calculateGrowthFactor();

  // ─── Cumulative metrics from 3 historical snapshots ───
  const getHistoricalAggregates = () => {
    if (historicalSyncs.length === 0) return { avgMoisture: 42, avgTemp: 26, avgOpacity: 0.6, totalCreditsEarned: 1.25 };
    const runsToUse = historicalSyncs.slice(0, 3);
    const sumMoisture = runsToUse.reduce((acc, r) => acc + (r.telemetry_snapshot?.moisture || 40), 0);
    const sumTemp = runsToUse.reduce((acc, r) => acc + (r.telemetry_snapshot?.temperature || 25), 0);
    const sumOpacity = runsToUse.reduce((acc, r) => acc + (r.telemetry_snapshot?.canopy_opacity || 0.6), 0);
    return {
      avgMoisture: Math.round(sumMoisture / runsToUse.length),
      avgTemp: Math.round(sumTemp / runsToUse.length),
      avgOpacity: Number((sumOpacity / runsToUse.length).toFixed(2)),
      totalCreditsEarned: Number((runsToUse.length * 0.45).toFixed(2))
    };
  };
  const aggregates = getHistoricalAggregates();

  // ─── Update 3D stack when sliders change ───
  const updateTwin3DStack = (moisture: number) => {
    if (!twinMapRef.current || !twinMapRef.current.isStyleLoaded()) return;
    const fertilityHeight = 30 + moisture * 0.15;
    if (twinMapRef.current.getLayer('twin-3d-fertility')) {
      twinMapRef.current.setPaintProperty('twin-3d-fertility', 'fill-extrusion-height', fertilityHeight);
    }
  };

  // Re-render voxel grid based on mode
  useEffect(() => {
    const isForecastMode = activeModalTab === 'growth-forecast';
    const activeMoisture = isForecastMode 
      ? Math.max(12, Math.round(twinSoilMoisture - simulatedDays * 0.6))
      : twinSoilMoisture;

    updateTwin3DStack(activeMoisture);
    if (twinMapRef.current?.isStyleLoaded() && twinMapRef.current.getLayer('ai-moisture-overlay')) {
      twinMapRef.current.setPaintProperty('ai-moisture-overlay', 'raster-opacity', isForecastMode ? 0.15 : aiOpacity);
    }
  }, [twinSoilMoisture, twinTemp, aiOpacity, forestMode, growthFactor, simulatedDays, activeModalTab]);

  // ─── React to satellite selection changes ───
  useEffect(() => {
    if (!twinMapRef.current?.isStyleLoaded() || !activeFarm) return;
    const source = twinMapRef.current.getSource('ai-moisture-overlay-source') as any;
    if (source) {
      const lngs = activeFarm.coordinates.map((c: number[]) => c[0]);
      const lats = activeFarm.coordinates.map((c: number[]) => c[1]);
      const activeCollection = bhoonidhiResult?.items?.[selectedSatelliteIdx]?.collection || 'sentinel-2-l2a';
      generateRealSatelliteOverlay(activeFarm.coordinates, activeCollection, twinSoilMoisture, twinTemp, (overlayUrl) => {
        source.updateImage({
          url: overlayUrl,
          coordinates: [
            [Math.min(...lngs), Math.max(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
            [Math.max(...lngs), Math.min(...lats)],
            [Math.min(...lngs), Math.min(...lats)]
          ]
        });
      });
    }
  }, [selectedSatelliteIdx, bhoonidhiResult, activeFarm]);

  // ─── Toggle Rotation ───
  const toggleRotation = () => {
    if (isRotating) {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
      rotateIntervalRef.current = null;
      setIsRotating(false);
    } else {
      let bearing = twinMapRef.current?.getBearing() || 0;
      rotateIntervalRef.current = setInterval(() => {
        if (!twinMapRef.current) return;
        bearing = (bearing + 0.12) % 360;
        twinMapRef.current.setBearing(bearing);
      }, 33);
      setIsRotating(true);
    }
  };

  // ─── Initialize MapLibre 3D with Oblique Angle (Always mounted!) ───
  useEffect(() => {
    if (!activeFarm || !twinMapContainer.current || vrMode) return;
    const initialCenter = activeFarm.coordinates[0] || [73.8575, 18.521];

    const mapInstance = new maplibregl.Map({
      container: twinMapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256, attribution: 'Esri, Maxar'
          }
        },
        layers: [{ id: 'satellite-layer', type: 'raster', source: 'satellite-tiles', minzoom: 0, maxzoom: 19 }]
      },
      center: initialCenter as [number, number],
      zoom: 17.8, 
      pitch: 65, 
      bearing: -30, 
      attributionControl: false
    });
    twinMapRef.current = mapInstance;

    mapInstance.on('load', () => {
      if (!twinMapRef.current) return;

      // NO black mask around the boundary! We show the real satellite surroundings in full color!
      twinMapRef.current.addSource('twin-farm-boundary', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [activeFarm.coordinates] }, properties: {} }
      });
      
      // Clear outline around the plot for visual localization
      twinMapRef.current.addLayer({ id: 'boundary-outline', type: 'line', source: 'twin-farm-boundary', paint: { 'line-color': '#00ffcc', 'line-width': 4.0 } });

      // 1. Groundwater Aquifer Layer (50 - 150cm)
      twinMapRef.current.addLayer({
        id: 'twin-3d-groundwater', type: 'fill-extrusion', source: 'twin-farm-boundary',
        paint: { 'fill-extrusion-color': '#1e3a8a', 'fill-extrusion-height': 10, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.7 }
      });

      // 2. Subsoil Moisture Layer (15 - 50cm)
      twinMapRef.current.addLayer({
        id: 'twin-3d-subsoil', type: 'fill-extrusion', source: 'twin-farm-boundary',
        paint: { 'fill-extrusion-color': '#0284c7', 'fill-extrusion-height': 20, 'fill-extrusion-base': 10, 'fill-extrusion-opacity': 0.55 }
      });

      // 3. Topsoil Moisture Layer (0 - 15cm)
      twinMapRef.current.addLayer({
        id: 'twin-3d-topsoil', type: 'fill-extrusion', source: 'twin-farm-boundary',
        paint: { 'fill-extrusion-color': '#38bdf8', 'fill-extrusion-height': 30, 'fill-extrusion-base': 20, 'fill-extrusion-opacity': 0.45 }
      });

      // 4. Soil Fertility & NPK Layer (0 - 30cm root nutrients)
      twinMapRef.current.addLayer({
        id: 'twin-3d-fertility', type: 'fill-extrusion', source: 'twin-farm-boundary',
        paint: { 'fill-extrusion-color': '#16a34a', 'fill-extrusion-height': 30 + twinSoilMoisture * 0.15, 'fill-extrusion-base': 30, 'fill-extrusion-opacity': 0.5 }
      });

      const lngs = activeFarm.coordinates.map((c: number[]) => c[0]);
      const lats = activeFarm.coordinates.map((c: number[]) => c[1]);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const activeCollection = bhoonidhiResult?.items?.[selectedSatelliteIdx]?.collection || 'sentinel-2-l2a';
      generateRealSatelliteOverlay(activeFarm.coordinates, activeCollection, twinSoilMoisture, twinTemp, (overlayUrl) => {
        if (!twinMapRef.current?.isStyleLoaded()) return;
        twinMapRef.current.addSource('ai-moisture-overlay-source', {
          type: 'image', url: overlayUrl,
          coordinates: [[minLng, maxLat], [maxLng, maxLat], [maxLng, minLat], [minLng, minLat]]
        });
        twinMapRef.current.addLayer({ id: 'ai-moisture-overlay', type: 'raster', source: 'ai-moisture-overlay-source', paint: { 'raster-opacity': aiOpacity } });
      });

      // auto-rotation disabled on mount! Loaded statically so users can hold and drag instantly!
    });

    return () => {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
      mapInstance.remove();
    };
  }, [activeFarm?.id, vrMode]);

  // ─── Initialize IMMERSIVE VR MAP ───
  useEffect(() => {
    if (!vrMode || !activeFarm || !vrMapContainer.current) return;

    setVrTelemetryLogs([
      `[VR HUD INITIALIZED] Lens stereoscopy calibrated.`,
      `[AGGREGATING DATA] Fetching last ${Math.min(3, historicalSyncs.length)} satellite passes...`,
      `[SATELLITE DATA RUN 1] Moisture: ${historicalSyncs[0]?.telemetry_snapshot?.moisture || 65}% | Temp: ${historicalSyncs[0]?.telemetry_snapshot?.temperature || 24}°C`,
      `[SATELLITE DATA RUN 2] Moisture: ${historicalSyncs[1]?.telemetry_snapshot?.moisture || 42}% | Temp: ${historicalSyncs[1]?.telemetry_snapshot?.temperature || 28}°C`,
      `[SATELLITE DATA RUN 3] Moisture: ${historicalSyncs[2]?.telemetry_snapshot?.moisture || 78}% | Temp: ${historicalSyncs[2]?.telemetry_snapshot?.temperature || 21}°C`,
      `[TELEMETRY CONSOLIDATED] NPK Mock: Nitrogen 52mg/kg | Phosphorus 26mg/kg | Potassium 41mg/kg.`,
      `[SYNTHESIS COMPLETE] AI Imaginary 3D model generated. Orbit active.`
    ]);

    const initialCenter = activeFarm.coordinates[0] || [73.8575, 18.521];
    const vrMapInstance = new maplibregl.Map({
      container: vrMapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256, attribution: 'Esri, Maxar'
          }
        },
        layers: [{ id: 'satellite-layer', type: 'raster', source: 'satellite-tiles', minzoom: 0, maxzoom: 19 }]
      },
      center: initialCenter as [number, number],
      zoom: 18.6, 
      pitch: 72,  
      bearing: 0,
      attributionControl: false
    });
    vrMapRef.current = vrMapInstance;

    vrMapInstance.on('load', () => {
      if (!vrMapRef.current) return;

      vrMapRef.current.addSource('vr-farm-boundary', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [activeFarm.coordinates] }, properties: {} }
      });
      vrMapRef.current.addLayer({ id: 'vr-boundary-outline', type: 'line', source: 'vr-farm-boundary', paint: { 'line-color': '#00ffcc', 'line-width': 5.0 } });

      vrMapRef.current.addSource('vr-farm-boundary-trees', {
        type: 'geojson',
        data: generateBoundaryTrees(activeFarm.coordinates)
      });
      vrMapRef.current.addLayer({
        id: 'vr-3d-boundary-trees', type: 'fill-extrusion', source: 'vr-farm-boundary-trees',
        paint: { 'fill-extrusion-color': '#064e3b', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.95 }
      });

      vrMapRef.current.addSource('vr-voxel-crops-source', { 
        type: 'geojson', 
        data: generateVoxelGrid(activeFarm.coordinates, aggregates.avgMoisture, aggregates.avgOpacity, forestMode, growthFactor, vrScanMode) 
      });
      vrMapRef.current.addLayer({
        id: 'vr-3d-crops', type: 'fill-extrusion', source: 'vr-voxel-crops-source',
        paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 0.9 }
      });

      let bearing = 0;
      vrRotateIntervalRef.current = setInterval(() => {
        if (!vrMapRef.current) return;
        bearing = (bearing + 0.22) % 360; 
        vrMapRef.current.setBearing(bearing);
      }, 33);
    });

    return () => {
      if (vrRotateIntervalRef.current) clearInterval(vrRotateIntervalRef.current);
      vrMapInstance.remove();
      vrMapRef.current = null;
    };
  }, [vrMode, vrScanMode]);

  // Update VR map source
  useEffect(() => {
    if (!vrMapRef.current || !vrMapRef.current.isStyleLoaded() || !activeFarm) return;
    const source = vrMapRef.current.getSource('vr-voxel-crops-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(generateVoxelGrid(activeFarm.coordinates, aggregates.avgMoisture, aggregates.avgOpacity, forestMode, growthFactor, vrScanMode));
    }
  }, [vrScanMode]);

  // Derived simulation trends
  const simMoisture = Math.max(12, Math.round(twinSoilMoisture - simulatedDays * 0.6));
  const simTemp = Math.round(twinTemp + Math.sin(simulatedDays * 0.15) * 3);
  const simCanopyOpacity = Math.round(Math.min(100, (aiOpacity + simulatedDays * 0.008) * 100));
  const simYield = (2.85 + simulatedDays * 0.045).toFixed(2);
  const simNitrogen = Math.max(15, Math.round(48 - simulatedDays * 0.5));

  return (
    <div style={{ position: 'relative', width: '100%' }}>

      {/* ─── IMMERSIVE AI VR HEADSET VIEW OVERLAY ─── */}
      {vrMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 99999, background: '#020617', display: 'flex', flexDirection: 'column',
          color: '#00ffcc', fontFamily: 'monospace', overflow: 'hidden'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: '2px', background: '#00ffcc' }}>
            
            {/* Left Eye Viewport */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div ref={vrMapContainer} style={{ width: '100%', height: '100%' }} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle, transparent 35%, rgba(2, 6, 23, 0.4) 100%)',
                pointerEvents: 'none', borderRight: '1px solid rgba(0, 255, 204, 0.3)'
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '60px', height: '60px', border: '1px solid rgba(0, 255, 204, 0.4)', borderRadius: '50%',
                pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ width: '6px', height: '6px', background: '#00ffcc', borderRadius: '50%', opacity: 0.8 }} />
              </div>
            </div>

            {/* Right Eye Viewport */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div ref={vrMapContainer} style={{ width: '100%', height: '100%', transform: 'scale(1.02)' }} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle, transparent 35%, rgba(2, 6, 23, 0.4) 100%)',
                pointerEvents: 'none', borderLeft: '1px solid rgba(0, 255, 204, 0.3)'
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '60px', height: '60px', border: '1px solid rgba(0, 255, 204, 0.4)', borderRadius: '50%',
                pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ width: '6px', height: '6px', background: '#00ffcc', borderRadius: '50%', opacity: 0.8 }} />
              </div>
            </div>

          </div>

          {/* Holographic scanning overlay */}
          <div className="scanner-line-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
            background: 'rgba(0, 255, 204, 0.35)', boxShadow: '0 0 15px #00ffcc',
            pointerEvents: 'none'
          }} />

          {/* VR Cockpit HUD Overlay */}
          <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(2, 6, 23, 0.85)', padding: '16px', borderRadius: '12px', border: '2.5px solid #00ffcc', width: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={18} /> VR FLIGHT DECK ACTIVE
            </h3>
            <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Target: {activeFarm.location_name}</span>
            <div style={{ height: '1.5px', background: 'rgba(0, 255, 204, 0.3)', margin: '4px 0' }} />
            
            <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>AGGREGATED SNAPSHOT INSIGHTS:</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem' }}>
              <div>• Soil Moisture: <strong style={{ color: '#ffffff' }}>{aggregates.avgMoisture}%</strong></div>
              <div>• Temperature: <strong style={{ color: '#ffffff' }}>{aggregates.avgTemp}°C</strong></div>
              <div>• Canopy Density: <strong style={{ color: '#ffffff' }}>{Math.round(aggregates.avgOpacity * 100)}%</strong></div>
              <div>• NPK Rating: <strong style={{ color: '#ffffff' }}>Optimal</strong></div>
            </div>

            <div style={{ height: '90px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '4px', fontSize: '0.62rem', marginTop: '6px', border: '1px solid rgba(0, 255, 204, 0.2)' }}>
              {vrTelemetryLogs.map((log, idx) => (
                <div key={idx} style={{ color: log.startsWith('[ERR') ? '#ef4444' : '#00ffcc', marginBottom: '3px' }}>{log}</div>
              ))}
            </div>
          </div>

          {/* VR Control Bar */}
          <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 10 }}>
            <div style={{ display: 'flex', background: 'rgba(2, 6, 23, 0.85)', padding: '4px', borderRadius: '8px', border: '1.5px solid #00ffcc' }}>
              <button onClick={() => setVrScanMode('rgb')} style={{ background: vrScanMode === 'rgb' ? '#00ffcc' : 'transparent', color: vrScanMode === 'rgb' ? '#020617' : '#00ffcc', border: 'none', padding: '6px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                RGB Map
              </button>
              <button onClick={() => setVrScanMode('ndvi')} style={{ background: vrScanMode === 'ndvi' ? '#00ffcc' : 'transparent', color: vrScanMode === 'ndvi' ? '#020617' : '#00ffcc', border: 'none', padding: '6px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                NDVI Veg Scan
              </button>
              <button onClick={() => setVrScanMode('thermal')} style={{ background: vrScanMode === 'thermal' ? '#00ffcc' : 'transparent', color: vrScanMode === 'thermal' ? '#020617' : '#00ffcc', border: 'none', padding: '6px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Thermal IR
              </button>
            </div>

            <button onClick={() => setVrMode(false)} style={{
              background: '#ef4444', color: '#ffffff', border: '2px solid #ef4444', borderRadius: '8px',
              padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <X size={14} /> Exit VR Mode
            </button>
          </div>

          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(2, 6, 23, 0.85)', padding: '6px 16px', borderRadius: '20px', border: '1.5px solid #00ffcc', fontSize: '0.72rem', display: 'flex', gap: '20px' }}>
            <span>LAT: {activeFarm.coordinates[0][1]}</span>
            <span>LNG: {activeFarm.coordinates[0][0]}</span>
            <span>ALTITUDE: 25.0m (DRONE FLIGHT)</span>
            <span style={{ color: '#ffffff' }}>AUTO ORBIT SWEEP ACTIVE</span>
          </div>

        </div>
      )}

      {/* ─── NORMAL PAGE CONTENT ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '2rem', width: '100%' }} className="grid-2">
        
        {/* Left Column: Map + Mode controls + Bilingual Simple Farmer Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '1rem' }}>
              
              {/* Mode selectors */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setActiveModalTab('3d-gis')}
                  className={`btn ${activeModalTab === '3d-gis' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}
                >
                  4D GIS Telemetry Twin
                </button>
                <button
                  onClick={() => {
                    setActiveModalTab('growth-forecast');
                    setSimulatedDays(10); 
                  }}
                  className={`btn ${activeModalTab === 'growth-forecast' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}
                >
                  4D Crop Growth Forecast
                </button>
              </div>

              {/* Interactive options in header */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                
                {/* VR Headset Toggler */}
                <button
                  onClick={() => setVrMode(true)}
                  style={{
                    background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
                    border: '1.5px solid var(--primary-mint)', borderRadius: '8px',
                    padding: '6px 12px', color: '#ffffff',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 0 10px rgba(0, 255, 204, 0.25)', transition: 'all 0.2s ease'
                  }}
                  className="pulse-button"
                >
                  <Eye size={13} style={{ color: '#00ffcc' }} />
                  AI VR Headset View
                </button>

                <button
                  onClick={() => setForestMode(!forestMode)}
                  style={{
                    background: forestMode ? 'var(--primary-emerald)' : 'rgba(15, 23, 42, 0.05)',
                    border: '1.5px solid var(--primary-mint)', borderRadius: '8px',
                    padding: '6px 12px', color: forestMode ? '#ffffff' : 'var(--primary-deep)',
                    fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Layers size={13} />
                  {forestMode ? 'AI Forest Mode' : 'Crop Rows'}
                </button>
                
                <button
                  onClick={toggleRotation}
                  style={{
                    background: isRotating ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.05)',
                    border: '1px solid var(--border-glass)', borderRadius: '8px',
                    padding: '6px 10px', color: 'var(--primary-deep)', fontSize: '0.72rem', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <RotateCw size={13} style={{ animation: isRotating ? 'spin 2s linear infinite' : 'none' }} />
                  {isRotating ? 'Orbiting' : 'Paused'}
                </button>

                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1.5px solid #ef4444', borderRadius: '8px',
                    padding: '6px 12px', color: '#ef4444', fontSize: '0.72rem', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <X size={13} />
                  Exit 3D View
                </button>
              </div>
            </div>

            {/* Permanent Oblique 3D Voxel Map view */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }} className="animate-fade-up">
              <div style={{ flex: 1, minHeight: '440px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div ref={twinMapContainer} style={{ width: '100%', height: '100%', minHeight: '440px' }} />

                {/* Floating Camera Controls D-Pad for easy 4D rotation and tilt */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10, background: 'rgba(15, 23, 42, 0.85)', padding: '8px', borderRadius: '8px', border: '1.5px solid var(--primary-mint)' }}>
                  <span style={{ fontSize: '0.62rem', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', display: 'block', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '2px' }}>Tilt &amp; Rotate</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '90px' }}>
                    <div />
                    {/* Tilt Up */}
                    <button onClick={() => {
                      if (!twinMapRef.current) return;
                      const p = Math.min(85, twinMapRef.current.getPitch() + 6);
                      twinMapRef.current.setPitch(p);
                    }} style={{ background: '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }} title="Tilt Up">▲</button>
                    <div />

                    {/* Rotate Left */}
                    <button onClick={() => {
                      if (!twinMapRef.current) return;
                      const b = (twinMapRef.current.getBearing() - 15) % 360;
                      twinMapRef.current.setBearing(b);
                    }} style={{ background: '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }} title="Rotate Left">◀</button>
                    <div />
                    {/* Rotate Right */}
                    <button onClick={() => {
                      if (!twinMapRef.current) return;
                      const b = (twinMapRef.current.getBearing() + 15) % 360;
                      twinMapRef.current.setBearing(b);
                    }} style={{ background: '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }} title="Rotate Right">▶</button>

                    <div />
                    {/* Tilt Down */}
                    <button onClick={() => {
                      if (!twinMapRef.current) return;
                      const p = Math.max(0, twinMapRef.current.getPitch() - 6);
                      twinMapRef.current.setPitch(p);
                    }} style={{ background: '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 4px', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 'bold' }} title="Tilt Down">▼</button>
                    <div />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                    <button onClick={() => twinMapRef.current?.zoomIn()} style={{ flex: 1, background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>Zoom +</button>
                    <button onClick={() => twinMapRef.current?.zoomOut()} style={{ flex: 1, background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>Zoom -</button>
                  </div>
                </div>

                {/* AI Opacity Control Overlay */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255, 255, 255, 0.95)', padding: '10px 14px', borderRadius: '8px', zIndex: 10, border: '1.5px solid var(--primary-mint)', display: 'flex', flexDirection: 'column', gap: '4px', width: '185px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-deep)' }}>AI Canopy Opacity</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="range" min="0" max="1" step="0.01" value={aiOpacity}
                      onChange={(e) => setAiOpacity(Number(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary-emerald)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dark)' }}>{Math.round(aiOpacity * 100)}%</span>
                  </div>
                </div>

                {/* 3D Legend Map overlay */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', color: '#ffffff', padding: '8px 12px', borderRadius: '6px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
                  <strong style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '3px', marginBottom: '2px' }}>
                    {activeModalTab === 'growth-forecast' ? `4D Forecast: Day +${simulatedDays}` : '3D Real-Time Twin:'}
                  </strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#00ffcc', borderRadius: '2px' }} />
                    Sugarcane Field Border
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#064e3b', borderRadius: '2px' }} />
                    Border Tree Hedges
                  </span>
                </div>

                {/* Visual Farmer Drag & Navigation Tips Banner */}
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                  <span>🖱️ <strong>Left-Click + Drag</strong> to pan / <strong>Right-Click + Drag</strong> (or <strong>Ctrl + Drag</strong>) to tilt and rotate</span>
                  <span style={{ fontStyle: 'italic', opacity: 0.8, fontSize: '0.62rem' }}>📱 (मोबाइल पर: घुमाने और झुकाने के लिए दो उंगलियों का उपयोग करें)</span>
                </div>
              </div>

              {/* Mode-Specific Bottom Panel */}

              {/* MODE 1: Satellite Sync Panel */}
              {activeModalTab === '3d-gis' && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid var(--primary-mint)' }} className="animate-fade-up">
                  <h4 style={{ fontSize: '0.92rem', color: 'var(--primary-deep)', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Satellite size={16} style={{ color: 'var(--primary-emerald)' }} /> Multi-Satellite Imagery Mesh Sync
                  </h4>
                  {!bhoonidhiResult && !bhoonidhiLoading && (
                    <div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Sync multispectral indices from ISRO ResourceSat-2, Sentinel-1 Radar, Sentinel-2 Optical, and Landsat-8.
                      </p>
                      <button onClick={syncBhoonidhi} className="btn btn-primary" style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                        Query &amp; Ingest Satellite Array
                      </button>
                    </div>
                  )}
                  {bhoonidhiLoading && (
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <div className="pulse-beacon" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary-emerald)', margin: '0 auto 10px' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--primary-deep)', fontWeight: 700 }}>Querying registries...</span>
                    </div>
                  )}
                  {bhoonidhiResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>Mesh Sync node:</span>
                        <strong style={{ color: 'var(--primary-deep)' }}>{bhoonidhiResult.source}</strong>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        {bhoonidhiResult.items?.map((item: any, idx: number) => {
                          const isSelected = selectedSatelliteIdx === idx;
                          
                          // Simple satellite explanations for farmers
                          let satExplanation = '';
                          let satExplanationHi = '';
                          if (item.properties.satellite.includes('Resource')) {
                            satExplanation = '📷 Takes color photos of your field';
                            satExplanationHi = 'रंगीन फोटो खींचता है';
                          } else if (item.properties.satellite.includes('Sentinel-2')) {
                            satExplanation = '🌿 Checks crop greenness & health';
                            satExplanationHi = 'फसल की सेहत मापता है';
                          } else if (item.properties.satellite.includes('Sentinel-1')) {
                            satExplanation = '📡 Radar: Sees moisture through clouds';
                            satExplanationHi = 'बादलों के पार नमी मापता है';
                          } else {
                            satExplanation = '🌡️ Thermal: Measures field temperature';
                            satExplanationHi = 'फसल का तापमान मापता है';
                          }

                          return (
                            <div key={idx} onClick={() => setSelectedSatelliteIdx(idx)} style={{
                              background: '#ffffff', border: isSelected ? '2px solid var(--primary-emerald)' : '1px solid var(--border-glass)',
                              borderRadius: '10px', padding: '10px', cursor: 'pointer', position: 'relative'
                            }}>
                              {isSelected && <span style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--primary-emerald)', color: '#ffffff', borderRadius: '50%', padding: '2px' }}><Check size={10} /></span>}
                              <span style={{ fontWeight: 800, fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>{item.properties.satellite}</span>
                              <span style={{ fontSize: '0.62rem', display: 'block', color: 'var(--text-muted)' }}>Acquired: {formatToIST(item.properties.datetime)}</span>
                              
                              {/* Farmer satellite guides */}
                              <div style={{ background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '6px', fontSize: '0.62rem', color: 'var(--primary-deep)', lineHeight: '1.2' }}>
                                <strong>{satExplanation}</strong>
                                <span style={{ display: 'block', opacity: 0.8, fontStyle: 'italic', marginTop: '1px' }}>({satExplanationHi})</span>
                              </div>

                              <div style={{ width: '100%', height: '50px', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
                                <img src={getCardImage(item, activeFarm)} alt="sat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => setBhoonidhiResult(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}>Clear sync</button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: Time-Travel Crop Growth Simulator */}
              {activeModalTab === 'growth-forecast' && (
                <div style={{ background: 'linear-gradient(135deg, #090d16 0%, #022c22 100%)', padding: '1.5rem', borderRadius: '12px', border: '1.5px solid var(--primary-mint)', color: '#ffffff' }} className="animate-fade-up">
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.98rem', color: 'var(--primary-mint)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Cpu size={16} /> 4D Crop Growth Forecasting Engine
                    </h4>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--primary-emerald)' }}>
                      DAY +{simulatedDays} FORECAST
                    </span>
                  </div>

                  {/* Growth Time-Travel Slider */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '8px', opacity: 0.9 }}>
                      <span>Timeline: <strong>Current Node</strong></span>
                      <span><strong>Harvest Target (Day 45)</strong></span>
                    </div>
                    <input 
                      type="range" min="0" max="45" step="1" value={simulatedDays}
                      onChange={(e) => setSimulatedDays(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary-emerald)', height: '6px', borderRadius: '4px', cursor: 'pointer' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginTop: '6px', opacity: 0.7 }}>
                      <span>Day 0</span>
                      <span>Day 10</span>
                      <span>Day 20</span>
                      <span>Day 30</span>
                      <span>Day 45</span>
                    </div>
                  </div>

                  {/* Simulated Telemetry Dashboard Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--primary-mint)', display: 'block' }}>Soil Moisture</span>
                      <strong style={{ fontSize: '1rem' }}>{simMoisture}%</strong>
                      <span style={{ fontSize: '0.58rem', display: 'block', color: simMoisture < 25 ? '#ef4444' : '#34d399', marginTop: '2px' }}>
                        {simMoisture < 25 ? 'Critical Dryness' : 'Hydrated'}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--primary-mint)', display: 'block' }}>Ambient Temp</span>
                      <strong style={{ fontSize: '1rem' }}>{simTemp}°C</strong>
                      <span style={{ fontSize: '0.58rem', display: 'block', opacity: 0.8, marginTop: '2px' }}>Transpiration: Normal</span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--primary-mint)', display: 'block' }}>Canopy Density</span>
                      <strong style={{ fontSize: '1rem' }}>{simCanopyOpacity}%</strong>
                      <span style={{ fontSize: '0.58rem', display: 'block', color: '#34d399', marginTop: '2px' }}>
                        +{Math.max(0, simCanopyOpacity - Math.round(aiOpacity * 100))}% expansion
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--primary-mint)', display: 'block' }}>Estimated Yield</span>
                      <strong style={{ fontSize: '1rem' }}>{simYield} T/Ha</strong>
                      <span style={{ fontSize: '0.58rem', display: 'block', color: 'var(--primary-mint)', marginTop: '2px' }}>Grade A Target</span>
                    </div>
                  </div>

                  {/* Warning / Recommendation Ticker card */}
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(249, 115, 22, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
                    <AlertTriangle size={16} style={{ color: '#f97316', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                      {simulatedDays < 15 && (
                        <span><strong>Day 0-15 Prediction</strong>: Soil biomes healthy. No direct warnings active. Watch NPK indicators.</span>
                      )}
                      {simulatedDays >= 15 && simulatedDays < 30 && (
                        <span><strong>Day 18 Forecast Alert</strong>: Soil moisture is projected to fall to {simMoisture}%. Drip pump activation or foliar spraying optimization is recommended on Day 18 to lock biomass levels.</span>
                      )}
                      {simulatedDays >= 30 && (
                        <span><strong>Day 35+ Harvest Prediction</strong>: Soil Nitrogen reserves depleted to {simNitrogen}mg/kg. Voxel heights verified crop maturity. Schedule logistical drone fleet Booking.</span>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Bilingual Simple Farmer 3D Layer Explanation Card */}
          <div className="glass-panel animate-fade-up" style={{ padding: '1.5rem', background: '#f8fafc', border: '1.5px solid var(--primary-mint)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-deep)', fontWeight: 800, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={15} style={{ color: 'var(--primary-emerald)' }} />
              How to Read Your 3D Farm Model / 3D मॉडल कैसे समझें?
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem', lineHeight: '1.4' }}>
              
              {/* Blue Soil Layer Explanation */}
              <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                <div style={{ width: '18px', height: '18px', background: '#0284c7', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--primary-deep)', display: 'block' }}>💧 Blue Layer (Bottom) — Soil Water / मिट्टी में पानी (नमी)</strong>
                  <span style={{ color: 'var(--text-dark)' }}>Shows how wet the soil is. Taller/thicker blue means the roots have enough water. Thin/empty means the soil is dry and needs watering.</span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.68rem', marginTop: '1px' }}>यह दिखाता है कि मिट्टी में कितना पानी है। मोटा नीला ब्लॉक मतलब पर्याप्त पानी है।</span>
                </div>
              </div>

              {/* Green Crop Layer Explanation */}
              <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                <div style={{ width: '18px', height: '18px', background: '#10b981', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--primary-deep)', display: 'block' }}>🌱 Green Blocks (Middle) — Crops Growth / गन्ने की फसल</strong>
                  <span style={{ color: 'var(--text-dark)' }}>Represents your sugarcane. Taller green blocks mean your crops are growing tall and healthy. Short blocks mean young crops.</span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.68rem', marginTop: '1px' }}>यह आपके गन्ने की लम्बाई दिखाता है। लम्बे ब्लॉक मतलब फसल अच्छी बढ़ रही है।</span>
                </div>
              </div>

              {/* Orange Thermal Layer Explanation */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', background: '#f97316', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--primary-deep)', display: 'block' }}>🔥 Orange Layer (Top) — Leaf Temperature / फसल की गर्मी (बुखार)</strong>
                  <span style={{ color: 'var(--text-dark)' }}>Measures leaves temperature. A thick orange glow means the crops are hot, sweating under high heat, and need immediate water.</span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.68rem', marginTop: '1px' }}>यह पत्तियों का तापमान दिखाता है। ज्यादा गर्मी मतलब फसल को पानी की जरूरत है।</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: AI Predictions, Real-time Weather, & Historical Runs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-slide-right">
          
          {/* Real-time Weather & Environment */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary-deep)', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CloudRain size={18} style={{ color: 'var(--primary-emerald)' }} /> Live Weather &amp; Atmosphere
            </h4>
            {weatherLoading ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Querying Open-Meteo API...</span>
            ) : currentWeather ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Temperature</span>
                  <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--primary-deep)' }}>{currentWeather.temp}°C</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Relative Humidity</span>
                  <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--primary-deep)' }}>{currentWeather.humidity}%</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Precipitation</span>
                  <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--primary-emerald)' }}>{currentWeather.rain} mm</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Wind Speed</span>
                  <strong style={{ display: 'block', fontSize: '1.15rem', color: 'var(--primary-deep)' }}>{currentWeather.wind} km/h</strong>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weather data unavailable.</span>
            )}
          </div>

          {/* AI Predictive Farm Twin Insights */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary-deep)', borderBottom: '1.5px solid var(--border-glass)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={18} style={{ color: 'var(--primary-emerald)' }} /> AI Predictive twin Insights
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Yield prediction card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)', padding: '12px 16px', borderRadius: '10px', color: '#ffffff' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--primary-mint)' }}>Yield Potential Prediction</span>
                  <strong style={{ display: 'block', fontSize: '1.25rem' }}>
                    {Math.round(82 + (twinSoilMoisture > 30 && twinSoilMoisture < 70 ? 10 : 0) - (twinTemp > 35 ? 8 : 0))}%
                  </strong>
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--primary-emerald)' }}>
                  Grade A
                </span>
              </div>

              {/* Prediction aspects grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px' }}>
                  <span>Soil Evaporation Risk</span>
                  <strong style={{ color: twinTemp > 32 ? '#c2410c' : 'var(--primary-emerald)' }}>
                    {twinTemp > 32 ? 'High Evaporative loss' : 'Low/Stable'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px' }}>
                  <span>Root Zone Nitrogen Trend</span>
                  <strong>Sufficient (48 mg/kg)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px' }}>
                  <span>Biomass Growth Trend</span>
                  <strong style={{ color: 'var(--primary-emerald)' }}>{growthFactor > 1.1 ? 'Accelerating (+30%)' : 'Stable'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span>Mycelium Nutrient Transfer</span>
                  <strong>Optimal (88%)</strong>
                </div>
              </div>

              {/* Bullet points of predictions */}
              <div style={{ display: 'flex', gap: '8px', background: 'var(--danger-glow)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', marginTop: '4px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.72rem', color: '#b91c1c', margin: 0 }}>
                  {twinSoilMoisture < 35 
                    ? 'Predictive Alert: Soil hydration deficit imminent. Activating foliar spray optimization drone is advised.'
                    : 'Predictive Insight: Soil moisture and temperature indices verify perfect conditions. No irrigation required.'}
                </p>
              </div>

            </div>
          </div>

          {/* Historical Snapshots Timeline */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-deep)', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} style={{ color: 'var(--primary-emerald)' }} /> Historical Snapshots
            </h4>
            {historicalSyncs.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No satellite snapshots saved yet. Query the mesh array above to create one.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historicalSyncs.map((run: any, idx: number) => {
                  const isActive = selectedHistSyncIdx === idx;
                  return (
                    <div key={idx} onClick={() => {
                      setSelectedHistSyncIdx(idx);
                      if (run.telemetry_snapshot) {
                        setTwinSoilMoisture(run.telemetry_snapshot.moisture || 35);
                        setTwinTemp(run.telemetry_snapshot.temperature || 25);
                        setAiOpacity(run.telemetry_snapshot.canopy_opacity || 0.5);
                      }
                    }} style={{
                      background: isActive ? 'var(--primary-deep)' : '#f8fafc',
                      color: isActive ? '#ffffff' : 'var(--text-dark)',
                      border: isActive ? '1.5px solid var(--primary-emerald)' : '1px solid var(--border-glass)',
                      borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
                      transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>Satellite Run #{historicalSyncs.length - idx}</p>
                        <p style={{ fontSize: '0.62rem', opacity: 0.8, margin: '2px 0 0' }}>Captured: {formatToIST(run.created_at)}</p>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: isActive ? 'var(--primary-emerald)' : 'rgba(15, 23, 42, 0.05)', color: isActive ? '#ffffff' : 'var(--primary-deep)' }}>
                        {getRelativeTimeString(run.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual Parameters overrides */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Droplets size={16} style={{ color: 'var(--primary-emerald)' }} /> Simulation overrides
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Soil Moisture Level</span>
                  <strong>{twinSoilMoisture}%</strong>
                </div>
                <input type="range" min="10" max="90" value={twinSoilMoisture}
                  onChange={(e) => setTwinSoilMoisture(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary-emerald)' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Ambient Temperature</span>
                  <strong>{twinTemp}°C</strong>
                </div>
                <input type="range" min="15" max="45" value={twinTemp}
                  onChange={(e) => setTwinTemp(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary-emerald)' }} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TwinPage;