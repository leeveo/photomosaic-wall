-- Ajoute les colonnes nécessaires à la table setups

ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS booth_background_color text,
  ADD COLUMN IF NOT EXISTS booth_background_image text,
  ADD COLUMN IF NOT EXISTS booth_button_color text,
  ADD COLUMN IF NOT EXISTS booth_step1_text text,
  ADD COLUMN IF NOT EXISTS booth_step2_text text,
  ADD COLUMN IF NOT EXISTS booth_step3_text text,
  ADD COLUMN IF NOT EXISTS label_format text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS rows integer,
  ADD COLUMN IF NOT EXISTS cols integer,
  ADD COLUMN IF NOT EXISTS event_date date;

-- Policies for table designs
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select" ON designs;
DROP POLICY IF EXISTS "Allow all insert" ON designs;
DROP POLICY IF EXISTS "Allow all update" ON designs;

CREATE POLICY "Allow all select"
  ON designs
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert"
  ON designs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update"
  ON designs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for table flyers
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select" ON flyers;
DROP POLICY IF EXISTS "Allow all insert" ON flyers;
DROP POLICY IF EXISTS "Allow all update" ON flyers;

CREATE POLICY "Allow all select"
  ON flyers
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert"
  ON flyers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update"
  ON flyers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
