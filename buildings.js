require('dotenv').config();
const express = require('express');
const { supabase }    = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/buildings/:id — full building with floors and rooms
router.get('/:id', async (req, res) => {
  try {
    const buildingId = req.params.id;

    // Get building
    const { data: building } = await supabase
      .from('ww_buildings').select('*').eq('id', buildingId).single();
    if (!building) return res.status(404).json({ error: 'Building not found' });

    // Get floors
    const { data: floors } = await supabase
      .from('ww_floors').select('*')
      .eq('building_id', buildingId)
      .order('floor_number', { ascending: true });

    // Get all rooms for this building via floor ids
    const floorIds = floors.map(f => f.id);
    const { data: rooms } = await supabase
      .from('ww_rooms').select('*').in('floor_id', floorIds);

    // Get all appliances for these rooms
    const roomIds = rooms.map(r => r.id);
    const { data: appliances } = await supabase
      .from('ww_appliances').select('*').in('room_id', roomIds);

    // Get latest reading per appliance
    const appIds = appliances.map(a => a.id);
    const { data: readings } = await supabase
      .from('ww_readings')
      .select('appliance_id, kw_reading, recorded_at')
      .in('appliance_id', appIds)
      .order('recorded_at', { ascending: false });

    // Latest reading map: appliance_id -> kw_reading
    const latestMap = {};
    readings.forEach(r => {
      if (!latestMap[r.appliance_id]) latestMap[r.appliance_id] = r.kw_reading;
    });

    // Annotate appliances with current kW and wasteful flag
    const annotatedAppliances = appliances.map(a => {
      const currentKw = latestMap[a.id] || 0;
      const wasteful  = currentKw > (a.rated_kw * 1.3); // 30% above rated = wasteful
      return { ...a, current_kw: currentKw, wasteful };
    });

    // Calculate room state: sum current kW vs baseline
    const annotatedRooms = rooms.map(room => {
      const roomApps = annotatedAppliances.filter(a => a.room_id === room.id);
      const totalKw  = roomApps.reduce((sum, a) => sum + a.current_kw, 0);
      let state = 'green';
      if (totalKw > room.baseline_kw * 1.5) state = 'red';
      else if (totalKw > room.baseline_kw * 1.1) state = 'amber';
      return { ...room, total_kw: totalKw, state, appliances: roomApps };
    });

    // Attach rooms to floors
    const annotatedFloors = floors.map(floor => ({
      ...floor,
      rooms: annotatedRooms.filter(r => r.floor_id === floor.id)
    }));

    res.json({ building: { ...building, floors: annotatedFloors } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

// GET /api/buildings/:id/stats — dashboard stats
router.get('/:id/stats', async (req, res) => {
  try {
    const buildingId = Number(req.params.id);

    // Total current kW: sum latest readings for this building
    const { data: floors } = await supabase
      .from('ww_floors').select('id').eq('building_id', buildingId);
    const floorIds = floors.map(f => f.id);
    const { data: rooms } = await supabase
      .from('ww_rooms').select('id').in('floor_id', floorIds);
    const roomIds = rooms.map(r => r.id);
    const { data: appliances } = await supabase
      .from('ww_appliances').select('id').in('room_id', roomIds);
    const appIds = appliances.map(a => a.id);

    const { data: readings } = await supabase
      .from('ww_readings').select('appliance_id, kw_reading, recorded_at')
      .in('appliance_id', appIds)
      .order('recorded_at', { ascending: false });

    const latestMap = {};
    readings.forEach(r => {
      if (!latestMap[r.appliance_id]) latestMap[r.appliance_id] = r.kw_reading;
    });
    const totalKw = Object.values(latestMap).reduce((s, v) => s + v, 0);

    // Monthly kWh estimate (total kW * 24 hours * 30 days)
    const monthlyKwh = Math.round(totalKw * 24 * 30);
    // Saudi Tier 1 rate
    const rate = monthlyKwh > 4000 ? 0.32 : monthlyKwh > 2000 ? 0.26 : 0.18;
    const monthlySAR = (monthlyKwh * rate).toFixed(0);

    // Active alerts count
    const { count: alertCount } = await supabase
      .from('ww_alerts').select('id', { count: 'exact', head: true })
      .eq('building_id', buildingId).eq('is_resolved', false);

    // Sustainability score (simple: based on how much over baseline)
    const { data: allRooms } = await supabase
      .from('ww_rooms').select('baseline_kw').in('floor_id', floorIds);
    const totalBaseline = allRooms.reduce((s, r) => s + r.baseline_kw, 0);
    const ratio = totalBaseline > 0 ? totalKw / totalBaseline : 1;
    const score = Math.max(0, Math.min(100, Math.round(100 - (ratio - 1) * 100)));

    res.json({
      total_kw:     Math.round(totalKw * 10) / 10,
      monthly_kwh:  monthlyKwh,
      monthly_sar:  monthlySAR,
      alert_count:  alertCount || 0,
      score,
      tier: monthlyKwh > 4000 ? 3 : monthlyKwh > 2000 ? 2 : 1,
      rate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/buildings/:id/chart — last 24 hours hourly kW for the chart
router.get('/:id/chart', async (req, res) => {
  try {
    const buildingId = Number(req.params.id);
    const { data: floors } = await supabase
      .from('ww_floors').select('id').eq('building_id', buildingId);
    const floorIds = floors.map(f => f.id);
    const { data: rooms } = await supabase
      .from('ww_rooms').select('id').in('floor_id', floorIds);
    const roomIds = rooms.map(r => r.id);
    const { data: appliances } = await supabase
      .from('ww_appliances').select('id').in('room_id', roomIds);
    const appIds = appliances.map(a => a.id);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: readings } = await supabase
      .from('ww_readings').select('kw_reading, recorded_at')
      .in('appliance_id', appIds)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });

    // Bucket into hourly totals
    const hourBuckets = {};
    readings.forEach(r => {
      const h = new Date(r.recorded_at).getHours();
      if (!hourBuckets[h]) hourBuckets[h] = { sum: 0, count: 0 };
      hourBuckets[h].sum += r.kw_reading;
      hourBuckets[h].count += 1;
    });

    const chartData = Array.from({ length: 24 }, (_, h) => ({
      hour:  (h < 10 ? '0' : '') + h + ':00',
      kw:    hourBuckets[h] ? Math.round(hourBuckets[h].sum / hourBuckets[h].count * 10) / 10 : 0
    }));

    res.json({ chart: chartData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

module.exports = router;
