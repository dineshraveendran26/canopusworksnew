-- Clean Database Schema for Canopus Works Task Management System
-- Migration: 001_clean_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'viewer');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'Completed');

-- Users table (for app access and permissions)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Team members table (for task assignment, no app access)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(100),
  department VARCHAR(100),
  position VARCHAR(100),
  employee_id VARCHAR(100),
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
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
  document_links TEXT[], -- Array of URLs for document links
  created_by UUID REFERENCES public.users(id) NOT NULL,
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Subtasks table
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  document_links TEXT[], -- Array of URLs for document links
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments (many-to-many relationship between tasks and team members)
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  UNIQUE(task_id, team_member_id)
);

-- Subtask assignments (many-to-many relationship between subtasks and team members)
CREATE TABLE public.subtask_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  UNIQUE(subtask_id, team_member_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_by UUID REFERENCES public.users(id),
  CHECK (
    (task_id IS NOT NULL AND subtask_id IS NULL) OR 
    (task_id IS NULL AND subtask_id IS NOT NULL)
  )
);

-- User audit log (track all user actions)
CREATE TABLE public.user_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, login, etc.
  table_name VARCHAR(100), -- which table was affected
  record_id UUID, -- ID of the affected record
  old_values JSONB, -- previous values
  new_values JSONB, -- new values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_created_by ON public.users(created_by);

CREATE INDEX idx_team_members_department ON public.team_members(department);
CREATE INDEX idx_team_members_is_active ON public.team_members(is_active);

CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_department ON public.tasks(department);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);

CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX idx_subtasks_completed ON public.subtasks(completed);
CREATE INDEX idx_subtasks_order_index ON public.subtasks(order_index);

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_team_member_id ON public.task_assignments(team_member_id);

CREATE INDEX idx_subtask_assignments_subtask_id ON public.subtask_assignments(subtask_id);
CREATE INDEX idx_subtask_assignments_team_member_id ON public.subtask_assignments(team_member_id);

CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_subtask_id ON public.comments(subtask_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

CREATE INDEX idx_user_audit_log_user_id ON public.user_audit_log(user_id);
CREATE INDEX idx_user_audit_log_action ON public.user_audit_log(action);
CREATE INDEX idx_user_audit_log_created_at ON public.user_audit_log(created_at);

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

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
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
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY; 