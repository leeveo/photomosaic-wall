-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup configuration table
CREATE TABLE IF NOT EXISTS setups (
  project_slug TEXT PRIMARY KEY REFERENCES projects(slug) ON DELETE CASCADE,
  image TEXT,
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  event_date DATE,
  label_format TEXT,
  
  -- Additional fields from FlyerGenerator
  flyer_title TEXT,
  flyer_subtitle TEXT,
  flyer_title_color TEXT,
  flyer_title_size TEXT,
  flyer_title_font TEXT,
  flyer_title_position TEXT,
  flyer_subtitle_color TEXT,
  flyer_subtitle_size TEXT,
  flyer_subtitle_font TEXT,
  flyer_subtitle_position TEXT,
  flyer_qr_code_position TEXT,
  flyer_background TEXT,
  flyer_background_image TEXT,
  flyer_background_blur INTEGER,
  
  -- Additional fields from PhotoBoothCustomizer
  booth_background_color TEXT,
  booth_background_image TEXT,
  booth_button_color TEXT,
  booth_step1_text TEXT,
  booth_step2_text TEXT,
  booth_step3_text TEXT
);

-- Design configuration table (can be used alongside or replace setups fields)
CREATE TABLE IF NOT EXISTS designs (
  project_slug TEXT PRIMARY KEY REFERENCES projects(slug) ON DELETE CASCADE,
  background_color TEXT,
  background_image TEXT,
  button_color TEXT,
  step1_text TEXT,
  step2_text TEXT,
  step3_text TEXT
);

-- Flyer configuration table (can be used alongside or replace setups fields)
CREATE TABLE IF NOT EXISTS flyers (
  project_slug TEXT PRIMARY KEY REFERENCES projects(slug) ON DELETE CASCADE,
  title TEXT,
  subtitle TEXT,
  title_color TEXT,
  title_size TEXT,
  title_font TEXT,
  title_position TEXT,
  subtitle_color TEXT,
  subtitle_size TEXT,
  subtitle_font TEXT,
  subtitle_position TEXT,
  qr_code_position TEXT,
  background TEXT,
  background_image TEXT,
  background_blur INTEGER
);

-- Tiles (photos) table
CREATE TABLE IF NOT EXISTS tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug TEXT REFERENCES projects(slug) ON DELETE CASCADE,
  image_url TEXT,
  row INTEGER,
  col INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each tile location is unique per project
  UNIQUE (project_slug, row, col)
);
