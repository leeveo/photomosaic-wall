-- This allows any operation by anyone on the projects table
CREATE POLICY "Allow all operations on projects"
ON projects
FOR ALL
USING (true)
WITH CHECK (true);

-- Do the same for other tables
CREATE POLICY "Allow all operations on setups"
ON setups
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on designs"
ON designs
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on flyers"
ON flyers
FOR ALL
USING (true)
WITH CHECK (true);

-- And for storage
CREATE POLICY "Allow all operations on backgrounds storage"
ON storage.objects
FOR ALL
USING (bucket_id = 'backgrounds')
WITH CHECK (bucket_id = 'backgrounds');
