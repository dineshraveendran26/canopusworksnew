-- Create team_member table for task assignment pool
-- Migration: 013_create_team_member_table.sql

CREATE TABLE public.team_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic identification
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Role and department info
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100), -- e.g., "Floor Worker", "Supervisor", "Manager"
  
  -- Work details
  employee_id VARCHAR(50) UNIQUE, -- Company employee ID
  hire_date DATE,
  status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  
  -- Location and contact
  location VARCHAR(255),
  supervisor_id UUID REFERENCES public.users(id), -- Links to user who manages this team member
  
  -- Profile info
  avatar_url TEXT,
  skills TEXT[], -- Array of skills for task matching
  certifications TEXT[], -- Array of certifications
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional link to user account (if they have login access)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_team_member_department ON team_member(department);
CREATE INDEX idx_team_member_status ON team_member(status);
CREATE INDEX idx_team_member_supervisor ON team_member(supervisor_id);
CREATE INDEX idx_team_member_user_id ON team_member(user_id);

-- Enable Row Level Security
ALTER TABLE team_member ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view team members (based on role)
CREATE POLICY "Allow authenticated users to view team members" ON team_member
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow administrators to manage all team members
CREATE POLICY "Allow administrators to manage all team members" ON team_member
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'Administrator'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_team_member_updated_at 
  BEFORE UPDATE ON team_member 
  FOR EACH ROW EXECUTE FUNCTION update_team_member_updated_at();

-- Function to automatically update team member status based on task assignments
CREATE OR REPLACE FUNCTION update_team_member_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team member status to active if they have any active task assignments
  UPDATE team_member 
  SET status = 'active'
  WHERE id IN (
    SELECT DISTINCT tm.id
    FROM team_member tm
    JOIN task_assignments ta ON tm.id = ta.user_id
    JOIN tasks t ON ta.task_id = t.id
    WHERE t.status NOT IN ('Completed', 'Cancelled')
  );
  
  -- Update team member status to inactive if they have no active task assignments
  UPDATE team_member 
  SET status = 'inactive'
  WHERE id NOT IN (
    SELECT DISTINCT tm.id
    FROM team_member tm
    JOIN task_assignments ta ON tm.id = ta.user_id
    JOIN tasks t ON ta.task_id = t.id
    WHERE t.status NOT IN ('Completed', 'Cancelled')
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update team member status
CREATE TRIGGER update_team_member_status_on_task_change
  AFTER INSERT OR UPDATE OR DELETE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_team_member_status();

CREATE TRIGGER update_team_member_status_on_task_status_change
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_team_member_status();

-- Insert sample data
INSERT INTO team_member (full_name, email, phone, role, department, position, employee_id, hire_date, status, location) VALUES
  ('John Floor Worker', 'john.floor@canopusworks.com', '+1 (555) 111-1111', 'Production Worker', 'Production', 'Floor Worker', 'EMP001', '2023-01-15', 'inactive', 'Factory Floor A'),
  ('Sarah Assembly', 'sarah.assembly@canopusworks.com', '+1 (555) 222-2222', 'Assembly Specialist', 'Production', 'Assembly Worker', 'EMP002', '2023-02-20', 'inactive', 'Assembly Line B'),
  ('Mike Quality', 'mike.quality@canopusworks.com', '+1 (555) 333-3333', 'Quality Inspector', 'Quality', 'Inspector', 'EMP003', '2023-03-10', 'inactive', 'QC Lab'),
  ('Lisa Maintenance', 'lisa.maintenance@canopusworks.com', '+1 (555) 444-4444', 'Maintenance Tech', 'Maintenance', 'Technician', 'EMP004', '2023-04-05', 'inactive', 'Maintenance Bay'),
  ('David Safety', 'david.safety@canopusworks.com', '+1 (555) 555-5555', 'Safety Officer', 'Safety', 'Officer', 'EMP005', '2023-05-12', 'inactive', 'Safety Office');
