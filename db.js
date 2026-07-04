require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function initDB() {
  console.log('Supabase connected.');
}

module.exports = { supabase, initDB };
