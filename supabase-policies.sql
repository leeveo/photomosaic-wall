-- Enable Row Level Security on the projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read projects
CREATE POLICY "Anyone can read projects" 
ON projects 
FOR SELECT 
USING (true);

-- Create a policy that allows authenticated users to insert projects
CREATE POLICY "Authenticated users can insert projects" 
ON projects 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create a policy that allows authenticated users to update their own projects
CREATE POLICY "Authenticated users can update their own projects" 
ON projects 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- If you don't have a created_by column yet, you should add it:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create a policy for delete operations (optional, depending on your requirements)
CREATE POLICY "Authenticated users can delete their own projects" 
ON projects 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- For setups table
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read setups"
ON setups
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert setups"
ON setups
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update setups"
ON setups
FOR UPDATE
TO authenticated
USING (true);

-- For designs table
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read designs"
ON designs
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert designs"
ON designs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update designs"
ON designs
FOR UPDATE
TO authenticated
USING (true);

-- For flyers table
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flyers"
ON flyers
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert flyers"
ON flyers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update flyers"
ON flyers
FOR UPDATE
TO authenticated
USING (true);

-- For storage bucket 'backgrounds'
-- You'll need to set this in the Supabase dashboard under Storage > Policies

-- Policy for viewing/downloading files:
CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'backgrounds');

-- Policy for uploading files:
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backgrounds');

-- Policy for updating files:
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'backgrounds');

-- Policy for deleting files:
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'backgrounds');
