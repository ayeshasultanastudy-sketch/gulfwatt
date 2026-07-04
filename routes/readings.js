require('dotenv').config();
const express = require('express');
const { supabase }    = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/readings/bill/:buildingId — monthly bill breakdown by floor
router.get('/bill/:buildingId', async (req, res) => {
  try {
    const buildingId = Number(req.params.buildingId);

    const { data: floors } = await supabase
      .from('ww_floors').select('id, floor_number, name')
      .eq('building_id', buildingId)
      .order('floor_number');

    const floorIds = floors.map(f => f.id);
    const { data: rooms } = await supabase
      .from('ww_rooms').select('id, floor_id, baseline_kw').in('floor_id', floorIds);
    const roomIds = rooms.map(r => r.id);
    const { data: appliances } = await supabase
      .from('ww_appliances').select('id, room_id').in('room_id', roomIds);
    const appIds = appliances.map(a => a.id);

    // All readings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const { data: readings } = await supabase
      .from('ww_readings').select('appliance_id, kw_reading')
      .in('appliance_id', appIds)
      .gte('recorded_at', startOfMonth.toISOString());

    // Sum kWh per floor
    const appToRoom = {};
    appliances.forEach(a => { appToRoom[a.id] = a.room_id; });
    const roomToFloor = {};
    rooms.forEach(r => { roomToFloor[r.id] = r.floor_id; });
    const floorKwh = {};
    floors.forEach(f => { floorKwh[f.id] = 0; });

    // Each reading is a point in kW — assume 30s interval = 30/3600 hours
    const hoursPerTick = 30 / 3600;
    readings.forEach(r => {
      const roomId  = appToRoom[r.appliance_id];
      const floorId = roomToFloor[roomId];
      if (floorId) floorKwh[floorId] += r.kw_reading * hoursPerTick;
    });

    const totalKwh = Object.values(floorKwh).reduce((s, v) => s + v, 0);
    const rate = totalKwh > 4000 ? 0.32 : totalKwh > 2000 ? 0.26 : 0.18;
    const totalSAR = totalKwh * rate;
    const tier = totalKwh > 4000 ? 3 : totalKwh > 2000 ? 2 : 1;

    const floorBreakdown = floors.map(f => ({
      floor_number: f.floor_number,
      name: f.name,
      kwh: Math.round(floorKwh[f.id] * 10) / 10,
      sar: Math.round(floorKwh[f.id] * rate * 100) / 100
    }));

    res.json({
      total_kwh:  Math.round(totalKwh * 10) / 10,
      total_sar:  Math.round(totalSAR * 100) / 100,
      rate,
      tier,
      floor_breakdown: floorBreakdown
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bill data' });
  }
});

module.exports = router;
