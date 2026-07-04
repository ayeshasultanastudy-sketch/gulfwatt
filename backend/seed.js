// seed.js
// Run ONCE after setting up Supabase: node seed.js
// Creates the sample hospital with 5 floors, 8 rooms each, and all appliances.

require('dotenv').config();
const { supabase } = require('./db');

const HOSPITAL = {
  name:     'King Abdullah General Hospital',
  type:     'hospital',
  location: 'Riyadh, Saudi Arabia',
  floors:   5
};

// Room types per floor
const FLOOR_CONFIGS = [
  { floor_number: 1, name: 'Ground Floor', rooms: [
    { room_number: 'G01', name: 'Emergency Reception',   type: 'emergency',   baseline_kw: 8.0  },
    { room_number: 'G02', name: 'Triage Room A',         type: 'triage',      baseline_kw: 3.5  },
    { room_number: 'G03', name: 'Triage Room B',         type: 'triage',      baseline_kw: 3.5  },
    { room_number: 'G04', name: 'Pharmacy',              type: 'pharmacy',    baseline_kw: 4.0  },
    { room_number: 'G05', name: 'Radiology',             type: 'radiology',   baseline_kw: 12.0 },
    { room_number: 'G06', name: 'Admin Office',          type: 'admin',       baseline_kw: 3.0  },
    { room_number: 'G07', name: 'Cafeteria',             type: 'cafeteria',   baseline_kw: 9.0  },
    { room_number: 'G08', name: 'Server Room',           type: 'server',      baseline_kw: 14.0 },
  ]},
  { floor_number: 2, name: 'Floor 1 — General Wards', rooms: [
    { room_number: '1-01', name: 'Ward A',               type: 'ward',        baseline_kw: 5.0  },
    { room_number: '1-02', name: 'Ward B',               type: 'ward',        baseline_kw: 5.0  },
    { room_number: '1-03', name: 'Ward C',               type: 'ward',        baseline_kw: 5.0  },
    { room_number: '1-04', name: 'Nurses Station',       type: 'nurses',      baseline_kw: 2.5  },
    { room_number: '1-05', name: 'Consultation Room A',  type: 'consult',     baseline_kw: 2.0  },
    { room_number: '1-06', name: 'Consultation Room B',  type: 'consult',     baseline_kw: 2.0  },
    { room_number: '1-07', name: 'Medical Store',        type: 'storage',     baseline_kw: 3.5  },
    { room_number: '1-08', name: 'Staff Rest Room',      type: 'staff',       baseline_kw: 1.5  },
  ]},
  { floor_number: 3, name: 'Floor 2 — ICU', rooms: [
    { room_number: '2-01', name: 'ICU Bay 1',            type: 'icu',         baseline_kw: 10.0 },
    { room_number: '2-02', name: 'ICU Bay 2',            type: 'icu',         baseline_kw: 10.0 },
    { room_number: '2-03', name: 'ICU Bay 3',            type: 'icu',         baseline_kw: 10.0 },
    { room_number: '2-04', name: 'ICU Nurses Station',   type: 'nurses',      baseline_kw: 3.0  },
    { room_number: '2-05', name: 'Equipment Store',      type: 'storage',     baseline_kw: 2.0  },
    { room_number: '2-06', name: 'Relatives Waiting',    type: 'waiting',     baseline_kw: 1.5  },
    { room_number: '2-07', name: 'Doctor Office',        type: 'admin',       baseline_kw: 1.8  },
    { room_number: '2-08', name: 'Medication Room',      type: 'pharmacy',    baseline_kw: 3.0  },
  ]},
  { floor_number: 4, name: 'Floor 3 — Operating Theatres', rooms: [
    { room_number: '3-01', name: 'Theatre 1',            type: 'theatre',     baseline_kw: 18.0 },
    { room_number: '3-02', name: 'Theatre 2',            type: 'theatre',     baseline_kw: 18.0 },
    { room_number: '3-03', name: 'Theatre 3',            type: 'theatre',     baseline_kw: 18.0 },
    { room_number: '3-04', name: 'Scrub Room',           type: 'scrub',       baseline_kw: 3.0  },
    { room_number: '3-05', name: 'Recovery Room',        type: 'recovery',    baseline_kw: 6.0  },
    { room_number: '3-06', name: 'Anaesthesia Store',    type: 'storage',     baseline_kw: 2.0  },
    { room_number: '3-07', name: 'Surgical Office',      type: 'admin',       baseline_kw: 1.5  },
    { room_number: '3-08', name: 'Sterile Supply',       type: 'sterile',     baseline_kw: 5.0  },
  ]},
  { floor_number: 5, name: 'Floor 4 — Admin and Management', rooms: [
    { room_number: '4-01', name: 'Hospital Director',    type: 'admin',       baseline_kw: 1.5  },
    { room_number: '4-02', name: 'Finance Office',       type: 'admin',       baseline_kw: 2.0  },
    { room_number: '4-03', name: 'HR Office',            type: 'admin',       baseline_kw: 2.0  },
    { room_number: '4-04', name: 'IT Department',        type: 'it',          baseline_kw: 6.0  },
    { room_number: '4-05', name: 'Board Room',           type: 'meeting',     baseline_kw: 2.5  },
    { room_number: '4-06', name: 'Training Room',        type: 'training',    baseline_kw: 2.0  },
    { room_number: '4-07', name: 'Records Store',        type: 'storage',     baseline_kw: 1.0  },
    { room_number: '4-08', name: 'Staff Lounge',         type: 'staff',       baseline_kw: 1.5  },
  ]},
];

// Appliances per room type
const APPLIANCES_BY_TYPE = {
  emergency:  [{ name:'AC Unit',              rated_kw:3.5 },{ name:'Defibrillator',       rated_kw:0.5 },{ name:'Lighting',            rated_kw:1.0 },{ name:'Computers x4',        rated_kw:1.2 },{ name:'Monitoring System',   rated_kw:0.8 }],
  triage:     [{ name:'AC Unit',              rated_kw:2.0 },{ name:'Patient Monitor',      rated_kw:0.4 },{ name:'Lighting',            rated_kw:0.5 },{ name:'Computer',            rated_kw:0.3 }],
  pharmacy:   [{ name:'AC Unit',              rated_kw:1.5 },{ name:'Refrigerator',         rated_kw:0.8 },{ name:'Refrigerator 2',      rated_kw:0.8 },{ name:'Lighting',            rated_kw:0.5 },{ name:'Computers x2',        rated_kw:0.6 }],
  radiology:  [{ name:'MRI Machine',          rated_kw:6.0 },{ name:'X-Ray Unit',           rated_kw:3.5 },{ name:'AC Unit (heavy)',     rated_kw:5.0 },{ name:'Workstations x2',     rated_kw:0.8 },{ name:'Lighting',            rated_kw:0.5 }],
  admin:      [{ name:'AC Unit',              rated_kw:1.5 },{ name:'Computers x4',         rated_kw:1.2 },{ name:'Lighting',            rated_kw:0.4 },{ name:'Printer',             rated_kw:0.3 }],
  cafeteria:  [{ name:'AC Unit',              rated_kw:2.5 },{ name:'Commercial Fridge',    rated_kw:1.2 },{ name:'Commercial Fridge 2', rated_kw:1.2 },{ name:'Oven',                rated_kw:3.5 },{ name:'Lighting',            rated_kw:1.0 }],
  server:     [{ name:'Server Rack 1',        rated_kw:4.0 },{ name:'Server Rack 2',        rated_kw:4.0 },{ name:'Cooling Unit',        rated_kw:5.0 },{ name:'UPS System',          rated_kw:1.5 }],
  ward:       [{ name:'AC Unit',              rated_kw:3.0 },{ name:'Patient Monitors x4',  rated_kw:1.6 },{ name:'Lighting',            rated_kw:0.8 },{ name:'Medical Fridges',     rated_kw:0.8 }],
  nurses:     [{ name:'AC Unit',              rated_kw:1.5 },{ name:'Computers x2',         rated_kw:0.6 },{ name:'Lighting',            rated_kw:0.4 },{ name:'Medication Fridge',   rated_kw:0.5 }],
  consult:    [{ name:'AC Unit',              rated_kw:1.5 },{ name:'Computer',             rated_kw:0.3 },{ name:'Lighting',            rated_kw:0.3 }],
  storage:    [{ name:'Refrigerator',         rated_kw:0.8 },{ name:'Lighting',             rated_kw:0.3 }],
  staff:      [{ name:'AC Unit',              rated_kw:1.5 },{ name:'Refrigerator',         rated_kw:0.5 },{ name:'Lighting',            rated_kw:0.3 },{ name:'Microwave',           rated_kw:0.9 }],
  icu:        [{ name:'Ventilator x2',        rated_kw:1.6 },{ name:'Patient Monitor x2',   rated_kw:0.8 },{ name:'AC Unit',             rated_kw:3.0 },{ name:'Infusion Pumps',      rated_kw:0.4 },{ name:'Lighting',            rated_kw:0.6 }],
  waiting:    [{ name:'AC Unit',              rated_kw:2.0 },{ name:'TV',                   rated_kw:0.2 },{ name:'Lighting',            rated_kw:0.5 }],
  theatre:    [{ name:'Surgical Lights',      rated_kw:2.5 },{ name:'Anaesthesia Machine',  rated_kw:1.2 },{ name:'Ventilator',          rated_kw:0.8 },{ name:'AC Unit (surgical)', rated_kw:5.0 },{ name:'Monitors x3',         rated_kw:0.9 },{ name:'Electrosurgical Unit',rated_kw:2.0 }],
  scrub:      [{ name:'Hot Water System',     rated_kw:3.0 },{ name:'Lighting',             rated_kw:0.5 },{ name:'AC Unit',             rated_kw:1.5 }],
  recovery:   [{ name:'AC Unit',              rated_kw:3.0 },{ name:'Patient Monitors x3',  rated_kw:0.9 },{ name:'Lighting',            rated_kw:0.8 }],
  sterile:    [{ name:'Autoclave',            rated_kw:4.0 },{ name:'AC Unit',              rated_kw:2.0 },{ name:'Lighting',            rated_kw:0.5 }],
  it:         [{ name:'Workstations x6',      rated_kw:1.8 },{ name:'Server Cabinet',       rated_kw:2.0 },{ name:'AC Unit',             rated_kw:2.5 },{ name:'UPS',                 rated_kw:0.8 }],
  meeting:    [{ name:'AC Unit',              rated_kw:2.0 },{ name:'Projector/Screen',     rated_kw:0.5 },{ name:'Lighting',            rated_kw:0.5 },{ name:'Computers x2',        rated_kw:0.6 }],
  training:   [{ name:'AC Unit',              rated_kw:2.0 },{ name:'Projector',            rated_kw:0.4 },{ name:'Lighting',            rated_kw:0.6 },{ name:'Computers x10',       rated_kw:3.0 }],
};

async function seed() {
  console.log('Seeding WattWatch sample hospital...');

  // 1. Insert building
  const { data: building } = await supabase
    .from('ww_buildings').insert([HOSPITAL]).select().single();
  console.log('Building created:', building.id);

  // 2. Insert floors + rooms + appliances
  for (const fc of FLOOR_CONFIGS) {
    const { data: floor } = await supabase
      .from('ww_floors').insert([{ building_id: building.id, floor_number: fc.floor_number, name: fc.name }]).select().single();

    for (const rc of fc.rooms) {
      const { data: room } = await supabase
        .from('ww_rooms').insert([{ floor_id: floor.id, room_number: rc.room_number, name: rc.name, type: rc.type, baseline_kw: rc.baseline_kw }]).select().single();

      const appDefs = APPLIANCES_BY_TYPE[rc.type] || APPLIANCES_BY_TYPE['admin'];
      for (const ap of appDefs) {
        await supabase.from('ww_appliances').insert([{ room_id: room.id, name: ap.name, rated_kw: ap.rated_kw }]);
      }
      process.stdout.write('.');
    }
  }

  console.log('\nAll floors, rooms and appliances created.');

  // 3. Insert 30 days of historical readings (hourly)
  console.log('Inserting 30 days of historical readings...');
  const { data: allAppliances } = await supabase.from('ww_appliances').select('id, rated_kw');

  const HOUR_SHAPE = [0.35,0.30,0.28,0.28,0.30,0.38,0.60,0.80,0.90,0.88,0.85,0.87,0.88,0.85,0.87,0.90,0.92,0.98,1.00,0.97,0.93,0.85,0.70,0.50];
  const now = Date.now();
  const DAYS = 30;

  for (let d = DAYS; d >= 1; d--) {
    const batch = [];
    for (let h = 0; h < 24; h++) {
      const ts = new Date(now - d * 86400000 + h * 3600000).toISOString();
      const mult = HOUR_SHAPE[h];
      for (const app of allAppliances) {
        const wobble = 1 + (Math.random() - 0.5) * 0.3;
        batch.push({ appliance_id: app.id, kw_reading: Math.max(0, Math.round(app.rated_kw * mult * wobble * 100) / 100), recorded_at: ts });
      }
    }
    // Insert in chunks of 500
    for (let i = 0; i < batch.length; i += 500) {
      await supabase.from('ww_readings').insert(batch.slice(i, i + 500));
    }
    process.stdout.write(`Day ${DAYS - d + 1}/${DAYS} `);
  }

  console.log('\n\nSeed complete. Building ID:', building.id);
  console.log('Set BUILDING_ID =', building.id, 'in the frontend API constant.');
}

seed().catch(err => { console.error(err); process.exit(1); });
