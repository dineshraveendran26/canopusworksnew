-- Initial database schema for Canopus Works Manufacturing Task Management System
-- Migration: 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'away', 'busy', 'inactive');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'Completed', 'On Hold', 'Cancelled');
CREATE TYPE dependency_type AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');
CREATE TYPE machine_status AS ENUM ('operational', 'maintenance', 'broken', 'retired');
CREATE TYPE quality_status AS ENUM ('pending', 'in_progress', 'passed', 'failed', 'rework');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  initials VARCHAR(10) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  join_date DATE NOT NULL,
  status user_status DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machines/Equipment table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  department VARCHAR(100),
  status machine_status DEFAULT 'operational',
  last_maintenance DATE,
  next_maintenance DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production batches table
CREATE TABLE public.production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(255) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  target_quantity INTEGER NOT NULL,
  actual_quantity INTEGER,
  start_date DATE,
  completion_date DATE,
  quality_status quality_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (core entity)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Todo',
  start_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  assigned_to UUID REFERENCES public.users(id),
  department VARCHAR(100),
  machine_id UUID REFERENCES public.machines(id),
  batch_id UUID REFERENCES public.production_batches(id),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Task assignments (many-to-many relationship)
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role VARCHAR(100) DEFAULT 'assignee', -- assignee, reviewer, approver
  UNIQUE(task_id, user_id)
);

-- Subtasks table
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- For internal notes vs client-facing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (task_id IS NOT NULL AND subtask_id IS NULL) OR 
    (task_id IS NULL AND subtask_id IS NOT NULL)
  )
);

-- Attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (task_id IS NOT NULL AND subtask_id IS NULL) OR 
    (task_id IS NULL AND subtask_id IS NOT NULL)
  )
);

-- Task dependencies table
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dependent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  prerequisite_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (dependent_task_id != prerequisite_task_id)
);

-- Task history/audit trail
CREATE TABLE public.task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL, -- created, updated, status_changed, assigned, etc.
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  metadata JSONB, -- Flexible additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_department ON public.tasks(department);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_machine_id ON public.tasks(machine_id);
CREATE INDEX idx_tasks_batch_id ON public.tasks(batch_id);

CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX idx_subtasks_completed ON public.subtasks(completed);
CREATE INDEX idx_subtasks_order_index ON public.subtasks(order_index);

CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_subtask_id ON public.comments(subtask_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

CREATE INDEX idx_attachments_task_id ON public.attachments(task_id);
CREATE INDEX idx_attachments_subtask_id ON public.attachments(subtask_id);

CREATE INDEX idx_task_dependencies_dependent ON public.task_dependencies(dependent_task_id);
CREATE INDEX idx_task_dependencies_prerequisite ON public.task_dependencies(prerequisite_task_id);

CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_user_id ON public.task_history(user_id);
CREATE INDEX idx_task_history_action ON public.task_history(action);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at);

-- Full-text search index for tasks
CREATE INDEX idx_tasks_search ON public.tasks USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task completion trigger
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER task_completion_trigger BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_completion();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (these will need to be customized based on your auth setup)
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can view tasks in their department or assigned to them
CREATE POLICY "Users can view relevant tasks" ON public.tasks
  FOR SELECT USING (
    department = (SELECT department FROM public.users WHERE id = auth.uid())
    OR 
    assigned_to = auth.uid()
    OR
    created_by = auth.uid()
  );

-- Users can update tasks they're assigned to or created
CREATE POLICY "Users can update relevant tasks" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() 
    OR 
    created_by = auth.uid()
  );

-- Users can insert tasks
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Similar policies for other tables...
-- (These are basic examples - you'll want to customize based on your specific requirements)

-- Insert sample machines
INSERT INTO public.machines (name, model, serial_number, location, department, status) VALUES
  ('Production Line A', 'PL-2000', 'SN001', 'Factory Floor A', 'Production', 'operational'),
  ('Quality Scanner', 'QS-500', 'SN002', 'QC Lab', 'Quality Assurance', 'operational'),
  ('Maintenance Cart', 'MC-100', 'SN003', 'Maintenance Shop', 'Maintenance', 'operational');

-- Insert sample production batch
INSERT INTO public.production_batches (batch_number, product_name, target_quantity, start_date, quality_status) VALUES
  ('BATCH-2024-001', 'Premium Widget', 1000, '2024-01-15', 'in_progress'); 