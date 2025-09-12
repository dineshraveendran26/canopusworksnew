-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'away', 'busy')),
  join_date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Create index on department for filtering
CREATE INDEX IF NOT EXISTS idx_team_members_department ON team_members(department);

-- Enable Row Level Security (RLS)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read team members
CREATE POLICY "Allow authenticated users to read team members" ON team_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert team members
CREATE POLICY "Allow authenticated users to insert team members" ON team_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update team members
CREATE POLICY "Allow authenticated users to update team members" ON team_members
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete team members
CREATE POLICY "Allow authenticated users to delete team members" ON team_members
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_team_members_updated_at 
  BEFORE UPDATE ON team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO team_members (name, role, department, email, phone, location, status, join_date) VALUES
  ('Alex Johnson', 'Senior Engineer', 'Production', 'alex.johnson@canopusworks.com', '+1 (555) 123-4567', 'Factory Floor A', 'active', '2022-03-15'),
  ('Maria Garcia', 'Production Manager', 'Management', 'maria.garcia@canopusworks.com', '+1 (555) 234-5678', 'Office Building', 'active', '2021-06-20'),
  ('David Chen', 'Quality Control', 'Quality', 'david.chen@canopusworks.com', '+1 (555) 345-6789', 'QC Lab', 'active', '2022-09-10'),
  ('Sarah Wilson', 'Maintenance Technician', 'Maintenance', 'sarah.wilson@canopusworks.com', '+1 (555) 456-7890', 'Maintenance Bay', 'away', '2023-01-15'),
  ('Michael Brown', 'Safety Officer', 'Safety', 'michael.brown@canopusworks.com', '+1 (555) 567-8901', 'Safety Office', 'busy', '2022-11-05'); 