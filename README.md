# AGRIXMBD 2.0 - Technical Documentation & User Manual

Welcome to **AGRIXMBD 2.0**, an AI-Native Agricultural Intelligence Cloud uniting ISRO satellite telemetry, thermodynamic soil digital twins, and autonomous rural economy engines (AREX) into a unified, device-responsive web application.

The design utilizes a clean, high-contrast **Green and White light theme** optimized for ease of use, featuring icon-coded diagnostics and built-in **Text-To-Speech (audio reading)** for illiterate or semi-literate users.

---

## 📱 Unified Responsive Architecture

AGRIXMBD 2.0 features a responsive layout designed to adapt to any user:
* **Desktop Layout**: Displays the modules as full-width dashboards. Users can switch between modules using the top navigation bar (**Field GIS & Risk**, **Soil Digital Twin**, **AREX Economy**, and **Voice AI Advisor**).
* **Mobile Viewport (Under 768px)**: Reflows automatically into a native-app PWA interface. The desktop header, hero banners, and footers are hidden to save screen space, and the active module fills the screen. A persistent **bottom navigation bar** enables quick, single-tap switching between views.

---

## ⚙️ Core Modules: How They Work & Data Flows

Below is the mapping of how data is fetched (**Pick Source**) from Supabase/PostgreSQL, where it displays (**Landing Location**), and how to use it:

### 1. Field GIS & Yield Analytics
* **Description**: Visualizes agricultural parcels, regional yields, and crop health models.
* **How to Use**:
  * In the **GIS Satellite Map** sub-tab (Web Portal), click on any polygon boundaries. A popup appears displaying crop health metrics.
  * In the **Gov Analytics** sub-tab, view projected crop yields (Soybean, Wheat) and active regional disease hazards.
* **Data Flow**:
  * **Pick Source**: `public.farms` table ➔ `boundary` column (type: `GEOMETRY(Polygon, 4326)`) and `primary_crop`.
  * **Landing Location**: Rendered as vector overlays on the MapLibre GL map container and as CSS graphs on the Gov Dashboard.

### 2. Pre-Visual Early Risk Diagnostics (PFRIE)
* **Description**: Forecasts intracellular plant stress and disease risks before physical symptoms (such as leaf yellowing) appear.
* **How to Use**:
  * On the **Overview** page, select the **Pre-Visual Stress Diagnostics** sub-tab.
  * Read the warning box showing estimated days until drought onset.
* **Data Flow**:
  * **Pick Source**: `public.telemetry` table ➔ `sensor_type = 'soil_moisture_npk'` ➔ `reading_value` column (type: `JSONB` containing moisture telemetry).
  * **Landing Location**: Renders inside the **Intracellular Diagnostics** card displaying intracellular water tension percentages (e.g. 74% Stress).

### 3. Soil Digital Twin (PFRIE)
* **Description**: A 3D thermodynamic soil simulator calculating evaporation, vapor flux, and heat coefficients.
* **How to Use**:
  * Go to the **Soil Digital Twin** tab.
  * Adjust the **Soil Moisture Level** and **Ambient Temperature** sliders. The Canvas grid updates its thermal colors immediately.
* **Data Flow**:
  * **Pick Source**: User UI Sliders + `public.telemetry` table ➔ `reading_value` JSONB values.
  * **Landing Location**: Inputs feed into the HTML5 Canvas coordinate loops to dynamically redraw grid vapor patterns.

### 4. AREX Escrow Contracts Ledger
* **Description**: Secures crop trade funds in a locked escrow account, releasing them only when moisture/oil content standards are met.
* **How to Use**:
  * Select the **AREX Economy** tab.
  * View active escrows showing the locking corporate buyer (Adani, ITC), crop tonnage, payment amount, and verification criteria.
* **Data Flow**:
  * **Pick Source**: `public.escrow_contracts` table ➔ `escrow_amount`, `status`, and `payout_condition_params` (type: `JSONB`).
  * **Landing Location**: Renders as ledger cards showing whether funds are `LOCKED` or `RELEASED`.

### 5. AREX Autonomous Machinery Booking
* **Description**: Schedules autonomous agricultural machinery (tillers, drone sprayers) for field work.
* **How to Use**:
  * Under the **Book Autonomous Machinery** panel, select a machinery type and scheduled date, then click **Book Now**.
  * The reservation is logged and appears in the **Schedule Status** queue.
* **Data Flow**:
  * **Pick Source**: Form inputs POST to Express `/api/arex/bookings` and write to the `public.machinery_bookings` table.
  * **Landing Location**: Refreshes the booking list at the bottom of the scheduling panel.

### 6. AREX Cold Chain Logistics Dispatch
* **Description**: Coordinates cold-storage trucks to transport harvested crops while monitoring transit temperatures.
* **How to Use**:
  * Locate the **Cold Storage Dispatching** queue on the AREX tab.
  * Click **Dispatch**. The truck status shifts from "Dispatching" to "In Transit" (monitored at 4.2°C).
* **Data Flow**:
  * **Pick Source**: Clicking dispatch triggers a POST request to `/api/arex/logistics/dispatch` which updates the database.
  * **Landing Location**: Updates the status indicator text dynamically.

### 7. Voice AI Vernacular Assistant (PFRIE)
* **Description**: Natural language voice interaction support featuring native TTS (Text-To-Speech) output.
* **How to Use**:
  * Go to the **Voice AI Advisor** tab.
  * Select a language (English, Hindi, Marathi).
  * Click the circular **Microphone Button** (pulses red to simulate listening) or select a quick question box (e.g. *Check Water*).
  * The response is typed in the chat. Click the **Listen Speaker Icon** next to the message to hear it read out loud in your chosen language.
* **Data Flow**:
  * **Pick Source**: Query input is sent to `/api/voice-ai` and saves queries to the `public.voice_ai_logs` table.
  * **Landing Location**: Returns structured text which lands inside the scrollable chat container and feeds into the browser's `SpeechSynthesisUtterance` interface.

---

## 🛠️ Step-by-Step Installation & Setup

### 1. Initialize Supabase Database Tables
1. Go to your [Supabase Console](https://supabase.com).
2. Choose project ID: `lmfdntatkengnupccbqi`.
3. Open the **SQL Editor** tab from the left sidebar.
4. Copy all content from [`supabase_schema.sql`](supabase_schema.sql) and paste it into the editor.
5. Click **Run** (This resets tables using `CASCADE` drops to ensure columns like `user_id` are created cleanly).

### 2. Launch the Express Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   *The API server runs on `http://localhost:5000`.*

### 3. Launch the Vite + React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend client:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

## 📡 IoT Integration Guide: Connecting Physical Sensors & Adding Your Land

Here is the developer blueprint explaining how to add your own land coordinates to the MapLibre GIS engine and link physical IoT hardware (e.g. ESP32, Arduino) to feed live crop telemetry data:

### 1. How to Add Your Land Boundaries (PostGIS Coordinates)
To draw your own fields and overlay them on the GIS Satellite Map:
1. Open [geojson.io](https://geojson.io) (or any GIS coordinate drawer).
2. Zoom into your physical land parcel and draw a polygon outline around your field bounds.
3. On the right panel, copy the JSON coordinate points array of your polygon.
4. Execute an SQL insert statement in your **Supabase SQL Editor** to write this boundary to the `farms` table:
   ```sql
   INSERT INTO public.farms (
     user_id,
     location_name,
     boundary,
     total_area_hectares,
     soil_ph,
     organic_matter_percent,
     primary_crop
   )
   VALUES (
     'YOUR-USER-UUID', -- Retrieve this from your Supabase auth.users or local sign-in session
     'My Active Field Plot',
     ST_GeomFromText('POLYGON((76.3 20.2, 76.4 20.2, 76.4 20.3, 76.3 20.3, 76.3 20.2))', 4326),
     1.45,
     6.2,
     2.35,
     'Sugarcane'
   );
   ```
5. When the user logs in, MapLibre GL pulls coordinates from the `boundary` column, calculates overlays, and highlights your sugarcane field on the GIS dashboard dynamically.

### 2. How to Connect Physical IoT Sensors
Your physical edge microcontrollers (ESP32 / ESP8266 / Raspberry Pi Pico W) equipped with soil moisture NPK sensors can transmit telemetry directly to the platform via HTTP POST:

1. **IoT Sensor Payload Structure**:
   Program your microcontroller to capture sensor analog/digital signals and send an HTTP POST request to the API:
   * **URL**: `http://YOUR-SERVER-IP:5000/api/telemetry/ingest`
   * **Headers**: `Content-Type: application/json`
   * **Payload**:
     ```json
     {
       "device_id": "ESP32-SOIL-RS485",
       "farm_id": "YOUR-FARM-UUID",
       "user_id": "YOUR-USER-UUID",
       "moisture": 32.5,
       "N": 48,
       "P": 32,
       "K": 50
     }
     ```

2. **Microcontroller code outline (Arduino C++ for ESP32)**:
   ```cpp
   #include <WiFi.h>
   #include <HTTPClient.h>

   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/telemetry/ingest";

   void setup() {
     WiFi.begin(ssid, password);
     while (WiFi.status() != WL_CONNECTED) { delay(500); }
   }

   void loop() {
     if (WiFi.status() == WL_CONNECTED) {
       HTTPClient http;
       http.begin(serverUrl);
       http.addHeader("Content-Type", "application/json");

       // Read values from your physical soil/NPK sensors
       float rawMoisture = readSoilMoistureSensor();
       int nitrogenVal = readNitrogenSensor();

       String payload = "{\"device_id\":\"ESP32-NODE-01\",\"moisture\":" + String(rawMoisture) + ",\"N\":" + String(nitrogenVal) + ",\"P\":32,\"K\":50}";

       int httpResponseCode = http.POST(payload);
       http.end();
     }
     delay(10000); // Poll sensors and transmit every 10 seconds
   }
   ```

3. **Data Landing**:
   * The Express API receives the POST request on the `/api/telemetry/ingest` endpoint.
   * If Supabase is connected, the backend inserts the record into the **`public.telemetry`** database table (landing inside `reading_value` JSONB column).
   * The API updates the in-memory telemetry queue, which the React client polls every 3 seconds. The web interface and dials immediately update to reflect your physical sensor's moisture and NPK outputs in real-time.

