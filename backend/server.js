require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const cron    = require('node-cron');
const { initDB, supabase } = require('./db');

const { router: authRouter } = require('./routes/auth');
const buildingsRouter        = require('./routes/buildings');
const alertsRouter           = require('./routes/alerts');
const readingsRouter         = require('./routes/readings');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',      authRouter);
app.use('/api/buildings', buildingsRouter);
app.use('/api/alerts',    alertsRouter);
app.use('/api/readings',  readingsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'WattWatch API running' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── SIMULATION LAYER ─────────────────────────────────────────────────────────
// Runs every 30 seconds. Inserts a realistic kW reading for every appliance
// in the database. Uses a time-of-day demand shape so the chart looks real.

const HOUR_SHAPE = [
  0.35, 0.30, 0.28, 0.28, 0.30, 0.38,  // midnight to 5am
  0.60, 0.80, 0.90, 0.88, 0.85, 0.87,  // 6am to 11am
  0.88, 0.85, 0.87, 0.90, 0.92, 0.98,  // noon to 5pm
  1.00, 0.97, 0.93, 0.85, 0.70, 0.50   // 6pm to 11pm
];

async function runSimulation() {
  try {
    const { data: appliances } = await supabase
      .from('ww_appliances').select('id, rated_kw, is_active');
    if (!appliances || appliances.length === 0) return;

    const hour       = new Date().getHours();
    const multiplier = HOUR_SHAPE[hour];

    const readings = appliances
      .filter(a => a.is_active)
      .map(a => {
        // Add realistic variation: ±15% random wobble
        const wobble = 1 + (Math.random() - 0.5) * 0.3;
        const kw     = Math.round(a.rated_kw * multiplier * wobble * 100) / 100;
        return { appliance_id: a.id, kw_reading: Math.max(0, kw) };
      });

    await supabase.from('ww_readings').insert(readings);

    // Alert check: flag appliances drawing 40% above rated as wasteful
    const wasteAlerts = appliances.filter(a => {
      const reading = readings.find(r => r.appliance_id === a.id);
      return reading && reading.kw_reading > a.rated_kw * 1.4;
    });

    // Only create alerts for night hours (waste = device on when not needed)
    if (hour >= 22 || hour <= 5) {
      for (const a of wasteAlerts.slice(0, 2)) { // max 2 alerts per tick
        // Check not already alerted in last hour
        const { data: recent } = await supabase
          .from('ww_alerts')
          .select('id')
          .eq('appliance_id', a.id)
          .eq('is_resolved', false)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString())
          .maybeSingle();

        if (!recent) {
          // Find room and building for this appliance
          const { data: room } = await supabase
            .from('ww_rooms').select('id, name, floor_id')
            .eq('id', (await supabase.from('ww_appliances').select('room_id').eq('id', a.id).single()).data.room_id)
            .single();
          if (room) {
            const { data: floor } = await supabase
              .from('ww_floors').select('building_id, floor_number').eq('id', room.floor_id).single();
            if (floor) {
              await supabase.from('ww_alerts').insert([{
                building_id:  floor.building_id,
                room_id:      room.id,
                appliance_id: a.id,
                type:         'waste',
                message:      `Device in ${room.name} drawing ${readings.find(r=>r.appliance_id===a.id)?.kw_reading} kW at ${hour}:00 — possible unnecessary usage`
              }]);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Simulation error:', err.message);
  }
}

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\nWattWatch running at http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health\n`);
  });
  // Run simulation every 30 seconds
  cron.schedule('*/30 * * * * *', runSimulation);
  console.log('Simulation layer started — inserting readings every 30 seconds.');
}

start();
