# GulfWatt ⚡
### Real-Time Building Energy Intelligence for Saudi Arabia

> *Every wasted watt has a room number.*

GulfWatt is a full-stack web application that gives facility managers of hospitals, malls, offices, and hotels real-time visibility into their building's electricity consumption — floor by floor, room by room, appliance by appliance. Built for the Saudi market and aligned with Vision 2030's 43% commercial energy reduction target.

---

## The Problem

Large commercial buildings in Saudi Arabia waste 20 to 40% of their electricity on devices running in empty rooms. The SEC bill arrives at the end of the month and by then the money is already gone. Professional building management systems that solve this cost SAR 500,000 to 2,000,000 and require trained engineers to operate.

GulfWatt delivers the same room-level intelligence in a browser, at a fraction of the cost, readable by anyone.

---

## Features

### Floor Map
Interactive building blueprint showing every floor and every room color coded in real time.
- Green — normal consumption within expected baseline
- Amber — above expected, possible waste
- Red — overload or sustained high usage in unoccupied hours

Click any room to see a side panel with every appliance, its current kW draw, and which ones are flagged as wasteful.

### Live Dashboard
Real-time overview of the entire building.
- Total kW being consumed right now
- Estimated monthly bill in SAR
- Active alert count
- Sustainability score out of 100
- 24-hour consumption chart

### Smart Alerts
Three types of automated alerts:
- **Waste** — device running more than 2 hours in a room outside operating hours
- **Overload** — a room or floor drawing significantly above its kW baseline
- **Tier breach** — monthly consumption projected to cross into a higher SEC pricing band

### Bill Intelligence
Monthly breakdown aligned with SEC commercial tariff structure.
- Tier 1: 0 to 2000 kWh at 0.18 SAR/kWh
- Tier 2: 2001 to 4000 kWh at 0.26 SAR/kWh
- Tier 3: above 4000 kWh at 0.32 SAR/kWh

Floor-by-floor consumption bar chart and a single personalized action card showing the highest-impact change for next month.

### Authentication
JWT-based login and registration with bcrypt password hashing and role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Auth | JWT, bcrypt |
| Simulation | node-cron (generates live demo data) |
| Hosting | Vercel (frontend), Railway (backend), Supabase (database) |

---

## Project Structure

```
gulfwatt/
├── frontend/
│   └── index.html           ← entire UI — 5 pages in one file
├── backend/
│   ├── server.js            ← Express server + simulation cron job
│   ├── db.js                ← Supabase client
│   ├── seed.js              ← populate sample hospital data
│   ├── .env                 ← environment variables (not committed)
│   ├── package.json
│   └── routes/
│       ├── auth.js          ← register, login, JWT middleware
│       ├── buildings.js     ← floor map, stats, 24hr chart
│       ├── alerts.js        ← get, resolve, trigger alerts
│       └── readings.js      ← monthly bill breakdown
├── SUPABASE_SCHEMA.sql      ← run this once in Supabase SQL Editor
└── README.md
```

---

## Database Schema

```
ww_buildings   — id, name, type, location, floors
ww_floors      — id, building_id, floor_number, name
ww_rooms       — id, floor_id, room_number, name, type, baseline_kw
ww_appliances  — id, room_id, name, rated_kw, is_active
ww_readings    — id, appliance_id, kw_reading, recorded_at
ww_alerts      — id, building_id, room_id, type, message, is_resolved
ww_users       — id, name, email, password, role, building_id
```

The `ww_readings` table is the engine. Every appliance gets a new row every 30 seconds from the simulation layer. In production this is replaced by a real hardware ingest endpoint.

---

## Local Setup

### Prerequisites
- Node.js v18 or above
- A Supabase account (free tier is sufficient)

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and run the full contents of `SUPABASE_SCHEMA.sql`
3. Go to **Settings → API** and copy your **Project URL** and **service_role key**

### Step 2 — Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder:

```
PORT=3000
JWT_SECRET=your_secret_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Step 3 — Seed the sample hospital

Run once only:

```bash
node seed.js
```

This creates a sample hospital with 5 floors, 8 rooms per floor, and all appliances. Note the Building ID it prints at the end.

### Step 4 — Update frontend

Open `frontend/index.html` and update line:
```js
const BUILDING_ID = 1; // change to the ID printed by seed.js
```

### Step 5 — Start the server

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000) and click **Try the demo**.

---

## Deployment

### Backend → Railway
1. Push repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set root directory to `backend`
4. Add environment variables from `.env` in the Variables tab
5. Generate a public domain under Settings → Networking

### Frontend → Vercel
1. Update `const API` in `index.html` to your Railway domain:
```js
const API = 'https://your-backend.up.railway.app/api';
```
2. Go to [vercel.com](https://vercel.com) → Add New Project → select repo
3. Set root directory to `frontend`
4. Framework preset → **Other**
5. Deploy

---

## Vision 2030 Alignment

| SDG / Target | How GulfWatt contributes |
|---|---|
| 43% commercial energy reduction | Gives buildings the real-time data to reach the target |
| 50% renewable energy by 2030 | Reduces demand that renewable sources need to cover |
| Digital public services mandate | Browser-based, zero hardware lock-in, accessible to any facility |
| SEC energy audit requirements | Sustainability score maps directly onto SEC audit criteria |

---

## How It Becomes a Real Product

The simulation layer in `server.js` generates fake readings for the demo. In production it is replaced with a real ingest endpoint:

```js
app.post('/api/ingest', async (req, res) => {
  const { appliance_id, kw_reading } = req.body;
  await supabase.from('ww_readings').insert([{ appliance_id, kw_reading }]);
  res.json({ message: 'Reading recorded' });
});
```

Any smart meter or IoT sensor sends a POST request to this endpoint every 30 seconds. The rest of the system — alerts, bill calculation, floor map coloring — works identically because it just reads from the `ww_readings` table regardless of data source.

---

## Built With

- [Chart.js](https://www.chartjs.org) — live consumption charts
- [Supabase](https://supabase.com) — database and auth
- [Express](https://expressjs.com) — backend API
- [node-cron](https://www.npmjs.com/package/node-cron) — simulation layer
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) — password hashing
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) — JWT authentication

---

## License

MIT
