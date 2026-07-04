require('dotenv').config();
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { supabase } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const { data: existing, error: selectErr } = await supabase
      .from('ww_users').select('id').eq('email', email).maybeSingle();
    if (selectErr) throw new Error('DB read failed: ' + selectErr.message);
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const { error: insertErr } = await supabase.from('ww_users').insert([{ name, email, password: hashed }]);
    if (insertErr) throw new Error(insertErr.message);
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data: user } = await supabase
      .from('ww_users').select('*').eq('email', email).maybeSingle();
    if (!user) return res.status(401).json({ error: 'No account found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, role: user.role, buildingId: user.building_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, requireAuth };
