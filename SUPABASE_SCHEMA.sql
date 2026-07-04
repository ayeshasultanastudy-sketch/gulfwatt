-- ================================================================
-- WattWatch Database Schema
-- Run this in Supabase SQL Editor in one go
-- ================================================================

-- 1. Buildings
CREATE TABLE ww_buildings (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  type       VARCHAR(50)  DEFAULT 'hospital',
  location   VARCHAR(200),
  floors     INT          DEFAULT 5,
  created_at TIMESTAMP    DEFAULT NOW()
);

-- 2. Floors
CREATE TABLE ww_floors (
  id            SERIAL PRIMARY KEY,
  building_id   INT NOT NULL REFERENCES ww_buildings(id) ON DELETE CASCADE,
  floor_number  INT NOT NULL,
  name          VARCHAR(100)
);

-- 3. Rooms
CREATE TABLE ww_rooms (
  id           SERIAL PRIMARY KEY,
  floor_id     INT NOT NULL REFERENCES ww_floors(id) ON DELETE CASCADE,
  room_number  VARCHAR(20),
  name         VARCHAR(100),
  type         VARCHAR(50),
  baseline_kw  FLOAT DEFAULT 2.0
);

-- 4. Appliances
CREATE TABLE ww_appliances (
  id           SERIAL PRIMARY KEY,
  room_id      INT NOT NULL REFERENCES ww_rooms(id) ON DELETE CASCADE,
  name         VARCHAR(100),
  rated_kw     FLOAT DEFAULT 1.0,
  is_active    BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 5. Readings (time-series — one row per appliance per tick)
CREATE TABLE ww_readings (
  id            SERIAL PRIMARY KEY,
  appliance_id  INT NOT NULL REFERENCES ww_appliances(id) ON DELETE CASCADE,
  kw_reading    FLOAT NOT NULL,
  recorded_at   TIMESTAMP DEFAULT NOW()
);

-- 6. Alerts
CREATE TABLE ww_alerts (
  id           SERIAL PRIMARY KEY,
  building_id  INT NOT NULL REFERENCES ww_buildings(id) ON DELETE CASCADE,
  room_id      INT REFERENCES ww_rooms(id),
  appliance_id INT REFERENCES ww_appliances(id),
  type         VARCHAR(30) NOT NULL,  -- 'waste' | 'overload' | 'tier'
  message      TEXT,
  is_resolved  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 7. Users
CREATE TABLE ww_users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(20) DEFAULT 'admin',
  building_id  INT REFERENCES ww_buildings(id),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Index on readings for fast latest-per-appliance queries
CREATE INDEX idx_readings_appliance ON ww_readings(appliance_id, recorded_at DESC);
CREATE INDEX idx_alerts_building    ON ww_alerts(building_id, is_resolved);
