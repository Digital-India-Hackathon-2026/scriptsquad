# AGRIXMBD 2.0 — Website + Digital Twin Module

## What's in this folder

```
agrixmbd-site/
├── index.html          Home page — site nav, hero, module cards
├── digital-twin.html   The 3D digital twin module (satellite + sensor fusion,
│                        multi-camera AI surveillance view, thermal mode,
│                        AI-generated daily reports)
├── assets/
│   └── site.css         Shared branding, colors, nav bar used by every page
└── backend/
    ├── server.js         Small server that generates the real AI daily report
    └── package.json
```

## How to run it

1. **Just browsing the site (no AI reports):**
   Open `index.html` directly in a browser (double-click it). Click "Digital
   Twin" in the nav to open the module. Everything works except the AI-written
   daily report — it'll fall back to a rule-based summary if the backend isn't
   running.

2. **With real AI-generated daily reports:**
   ```
   cd backend
   npm install
   export ANTHROPIC_API_KEY=sk-ant-...      (Windows: set ANTHROPIC_API_KEY=sk-ant-...)
   node server.js
   ```
   Leave that terminal running, then open `index.html` in your browser as
   normal. The "Generate today's AI fusion report" button will now produce a
   real AI-written analysis alongside the downloaded video.

## Adding more modules later

Each module is just another `.html` file in this folder that links
`assets/site.css` and includes the same `<nav id="site-nav">` block (copy it
from `digital-twin.html`). Add a link to it in `index.html`'s nav and module
card grid, and in the nav block of every other page so it stays consistent
site-wide.

## Before your presentation

- Set your **real farm GPS coordinates** in `digital-twin.html` — search for
  `FARM_LAT` and `FARM_LON` near the top of the script and replace the
  placeholder Talegaon Dabhade coordinates with your exact plot's coordinates
  (get these by right-clicking your farm's location in Google Maps).
- Video recording (the daily report button) works in Chrome and Edge; demo
  from one of those browsers.
- The satellite specs used (Cartosat-3, WorldView-3, RISAT-1A, Landsat 9) are
  real satellites with real public specifications — safe to cite as-is in
  your report.
