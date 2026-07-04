require('dotenv').config();
const express = require('express');
const { supabase }    = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/alerts/:buildingId — all alerts for a building
router.get('/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { type, resolved } = req.query;

    let query = supabase
      .from('ww_alerts')
      .select(`*, ww_rooms(name, room_number, ww_floors(floor_number, name))`)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false });

    if (type)     query = query.eq('type', type);
    if (resolved !== undefined) query = query.eq('is_resolved', resolved === 'true');

    const { data } = await query;
    res.json({ alerts: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PATCH /api/alerts/:id/resolve — mark alert resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    await supabase
      .from('ww_alerts')
      .update({ is_resolved: true })
      .eq('id', req.params.id);
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// POST /api/alerts/trigger — demo trigger (injects a fake alert)
router.post('/trigger', async (req, res) => {
  try {
    const { buildingId, roomId, type, message } = req.body;
    await supabase.from('ww_alerts').insert([{
      building_id:  buildingId,
      room_id:      roomId || null,
      type:         type || 'overload',
      message:      message || 'Demo triggered alert',
      is_resolved:  false
    }]);
    res.status(201).json({ message: 'Alert triggered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

module.exports = router;
