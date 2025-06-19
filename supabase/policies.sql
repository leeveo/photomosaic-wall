-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

-- Create policies for the projects table
CREATE POLICY "Public read access for projects" 
ON projects FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for projects" 
ON projects FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create policies for the setups table
CREATE POLICY "Public read access for setups" 
ON setups FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for setups" 
ON setups FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create policies for the designs table
CREATE POLICY "Public read access for designs" 
ON designs FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for designs" 
ON designs FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create policies for the tiles table
CREATE POLICY "Public read access for tiles" 
ON tiles FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for tiles" 
ON tiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin full access for tiles" 
ON tiles FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create policies for the flyers table
CREATE POLICY "Public read access for flyers" 
ON flyers FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for flyers" 
ON flyers FOR ALL 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow anonymous access for the photobooth application
CREATE POLICY "Anonymous insert access for tiles" 
ON tiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anonymous update access for tiles" 
ON tiles FOR UPDATE 
USING (true);

-- Add service role bypass for easier server-side access
CREATE POLICY "Service role bypass for projects"
ON projects FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass for setups"
ON setups FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass for designs"
ON designs FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass for tiles"
ON tiles FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass for flyers"
ON flyers FOR ALL
USING (auth.role() = 'service_role');

-- Create admin_users table and policies if it doesn't exist already
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access for admin_users"
ON admin_users FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role bypass for admin_users"
ON admin_users FOR ALL
USING (auth.role() = 'service_role');
