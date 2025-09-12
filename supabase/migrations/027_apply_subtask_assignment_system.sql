-- 027_apply_subtask_assignment_system.sql
-- Idempotent migration to ensure subtask assignment system is applied on remote

-- Enable required extensions (safe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Ensure subtask_assignments table exists (many-to-many for subtasks)
CREATE TABLE IF NOT EXISTS public.subtask_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_member(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.team_member(id),
  role VARCHAR(50) DEFAULT 'assignee',
  UNIQUE(subtask_id, user_id)
);

-- 2) Indexes (safe create)
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_subtask_id ON public.subtask_assignments(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_user_id ON public.subtask_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_assigned_at ON public.subtask_assignments(assigned_at);

-- 3) RLS enable and policies (safe)
ALTER TABLE public.subtask_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view subtask assignments for accessible subtasks" ON public.subtask_assignments
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.subtasks s
        JOIN public.tasks t ON s.task_id = t.id
        WHERE s.id = subtask_assignments.subtask_id 
        AND (
          t.created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.task_assignments ta 
            WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create subtask assignments for owned/managed subtasks" ON public.subtask_assignments
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.subtasks s
        JOIN public.tasks t ON s.task_id = t.id
        WHERE s.id = subtask_assignments.subtask_id 
        AND (
          t.created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'administrator'
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update subtask assignments for owned/managed subtasks" ON public.subtask_assignments
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.subtasks s
        JOIN public.tasks t ON s.task_id = t.id
        WHERE s.id = subtask_assignments.subtask_id 
        AND (
          t.created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'administrator'
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete subtask assignments for owned/managed subtasks" ON public.subtask_assignments
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.subtasks s
        JOIN public.tasks t ON s.task_id = t.id
        WHERE s.id = subtask_assignments.subtask_id 
        AND (
          t.created_by = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'administrator'
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Views (create or replace)
CREATE OR REPLACE VIEW public.subtasks_with_assignees AS
SELECT 
  s.*,
  COALESCE(
    ARRAY_AGG(sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL),
    ARRAY[]::UUID[]
  ) AS assignee_ids,
  COALESCE(
    ARRAY_AGG(tm.email) FILTER (WHERE tm.email IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS assignee_emails,
  COALESCE(
    ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS assignee_names
FROM public.subtasks s
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
LEFT JOIN public.team_member tm ON sa.user_id = tm.id
GROUP BY s.id, s.task_id, s.title, s.description, s.completed, s.order_index,
         s.estimated_hours, s.actual_hours, s.completed_at, s.created_at, s.updated_at;

CREATE OR REPLACE VIEW public.tasks_with_assignees AS
SELECT 
  t.*,
  COALESCE(a.assignee_ids, ARRAY[]::UUID[]) AS assignee_ids,
  COALESCE(a.assignee_emails, ARRAY[]::VARCHAR[]) AS assignee_emails,
  COALESCE(a.assignee_names, ARRAY[]::VARCHAR[]) AS assignee_names
FROM public.tasks t
LEFT JOIN LATERAL (
  SELECT 
    ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL) AS assignee_ids,
    ARRAY_AGG(tm.email) FILTER (WHERE tm.email IS NOT NULL) AS assignee_emails,
    ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL) AS assignee_names
  FROM public.task_assignments ta
  LEFT JOIN public.team_member tm ON ta.user_id = tm.id
  WHERE ta.task_id = t.id
) a ON true;

CREATE OR REPLACE VIEW public.tasks_with_full_details AS
SELECT 
  t.*,
  COALESCE(ta_agg.task_assignee_ids, ARRAY[]::UUID[]) AS task_assignee_ids,
  COALESCE(ta_agg.task_assignee_emails, ARRAY[]::VARCHAR[]) AS task_assignee_emails,
  COALESCE(ta_agg.task_assignee_names, ARRAY[]::VARCHAR[]) AS task_assignee_names,
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'completed', s.completed,
        'order_index', s.order_index,
        'assignee_ids', COALESCE(sa_agg.assignee_ids, ARRAY[]::UUID[]),
        'assignee_emails', COALESCE(sa_agg.assignee_emails, ARRAY[]::VARCHAR[]),
        'assignee_names', COALESCE(sa_agg.assignee_names, ARRAY[]::VARCHAR[])
      ) ORDER BY s.order_index
    ) FILTER (WHERE s.id IS NOT NULL),
    '[]'::JSON
  ) AS subtasks_with_assignees
FROM public.tasks t
LEFT JOIN LATERAL (
  SELECT 
    ARRAY_AGG(DISTINCT ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL) AS task_assignee_ids,
    ARRAY_AGG(DISTINCT tm.email) FILTER (WHERE tm.email IS NOT NULL) AS task_assignee_emails,
    ARRAY_AGG(DISTINCT tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL) AS task_assignee_names
  FROM public.task_assignments ta
  LEFT JOIN public.team_member tm ON ta.user_id = tm.id
  WHERE ta.task_id = t.id
) ta_agg ON true
LEFT JOIN public.subtasks s ON t.id = s.task_id
LEFT JOIN LATERAL (
  SELECT 
    ARRAY_AGG(DISTINCT sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL) AS assignee_ids,
    ARRAY_AGG(DISTINCT stm.email) FILTER (WHERE stm.email IS NOT NULL) AS assignee_emails,
    ARRAY_AGG(DISTINCT stm.full_name) FILTER (WHERE stm.full_name IS NOT NULL) AS assignee_names
  FROM public.subtask_assignments sa
  LEFT JOIN public.team_member stm ON sa.user_id = stm.id
  WHERE sa.subtask_id = s.id
) sa_agg ON true
GROUP BY t.id, ta_agg.task_assignee_ids, ta_agg.task_assignee_emails, ta_agg.task_assignee_names;

-- 5) Helper functions (create or replace)
CREATE OR REPLACE FUNCTION public.assign_users_to_subtask(
  p_subtask_id UUID,
  p_user_ids UUID[],
  p_assigned_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  DELETE FROM public.subtask_assignments WHERE subtask_id = p_subtask_id;
  FOREACH user_id IN ARRAY p_user_ids LOOP
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by)
    VALUES (p_subtask_id, user_id, COALESCE(p_assigned_by, auth.uid()))
    ON CONFLICT (subtask_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_subtask_assignees(p_subtask_id UUID)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  assigned_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.user_id,
    tm.email,
    tm.full_name,
    sa.assigned_at,
    sa.role
  FROM public.subtask_assignments sa
  JOIN public.team_member tm ON sa.user_id = tm.id
  WHERE sa.subtask_id = p_subtask_id
  ORDER BY sa.assigned_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_subtask_assignees(p_subtask_id UUID)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  assigned_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR,
  assignment_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_has_explicit BOOLEAN;
BEGIN
  SELECT s.task_id INTO v_task_id FROM public.subtasks s WHERE s.id = p_subtask_id;
  SELECT EXISTS(SELECT 1 FROM public.subtask_assignments WHERE subtask_id = p_subtask_id) INTO v_has_explicit;

  IF v_has_explicit THEN
    RETURN QUERY
    SELECT 
      sa.user_id,
      tm.email,
      tm.full_name,
      sa.assigned_at,
      sa.role,
      'explicit'::VARCHAR
    FROM public.subtask_assignments sa
    JOIN public.team_member tm ON sa.user_id = tm.id
    WHERE sa.subtask_id = p_subtask_id
    ORDER BY sa.assigned_at;
  ELSE
    RETURN QUERY
    SELECT 
      ta.user_id,
      tm.email,
      tm.full_name,
      ta.assigned_at,
      ta.role,
      'inherited'::VARCHAR
    FROM public.task_assignments ta
    JOIN public.team_member tm ON ta.user_id = tm.id
    WHERE ta.task_id = v_task_id
    ORDER BY ta.assigned_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_assign_subtasks_to_user(
  p_subtask_ids UUID[],
  p_user_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtask_id UUID;
BEGIN
  FOREACH v_subtask_id IN ARRAY p_subtask_ids LOOP
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by)
    VALUES (v_subtask_id, p_user_id, COALESCE(p_assigned_by, auth.uid()))
    ON CONFLICT (subtask_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_subtask_assignments_with_task(p_task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT s.id FROM public.subtasks s
    LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
    WHERE s.task_id = p_task_id AND sa.subtask_id IS NULL
  LOOP
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by, role)
    SELECT r.id, ta.user_id, ta.assigned_by, ta.role
    FROM public.task_assignments ta
    WHERE ta.task_id = p_task_id
    ON CONFLICT (subtask_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_task_with_all_assignments(p_task_id UUID)
RETURNS TABLE(
  task_id UUID,
  task_title VARCHAR,
  task_assignee_ids UUID[],
  task_assignee_names VARCHAR[],
  subtask_id UUID,
  subtask_title VARCHAR,
  subtask_assignee_ids UUID[],
  subtask_assignee_names VARCHAR[],
  assignment_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH task_assignments AS (
    SELECT 
      t.id AS task_id,
      t.title AS task_title,
      COALESCE(ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL), ARRAY[]::UUID[]) AS assignee_ids,
      COALESCE(ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL), ARRAY[]::VARCHAR[]) AS assignee_names
    FROM public.tasks t
    LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
    LEFT JOIN public.team_member tm ON ta.user_id = tm.id
    WHERE t.id = p_task_id
    GROUP BY t.id, t.title
  ),
  subtask_assignments AS (
    SELECT 
      s.id AS subtask_id,
      s.title AS subtask_title,
      s.task_id,
      COALESCE(ARRAY_AGG(sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL), ARRAY[]::UUID[]) AS explicit_assignee_ids,
      COALESCE(ARRAY_AGG(stm.full_name) FILTER (WHERE stm.full_name IS NOT NULL), ARRAY[]::VARCHAR[]) AS explicit_assignee_names
    FROM public.subtasks s
    LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
    LEFT JOIN public.team_member stm ON sa.user_id = stm.id
    WHERE s.task_id = p_task_id
    GROUP BY s.id, s.title, s.task_id
  )
  SELECT 
    ta.task_id,
    ta.task_title,
    ta.assignee_ids,
    ta.assignee_names,
    sa.subtask_id,
    sa.subtask_title,
    CASE WHEN sa.explicit_assignee_ids = ARRAY[]::UUID[] THEN ta.assignee_ids ELSE sa.explicit_assignee_ids END,
    CASE WHEN sa.explicit_assignee_names = ARRAY[]::VARCHAR[] THEN ta.assignee_names ELSE sa.explicit_assignee_names END,
    CASE WHEN sa.explicit_assignee_ids = ARRAY[]::UUID[] THEN 'inherited' ELSE 'explicit' END
  FROM task_assignments ta
  LEFT JOIN subtask_assignments sa ON ta.task_id = sa.task_id
  ORDER BY sa.subtask_id NULLS FIRST, sa.subtask_title;
END;
$$;

-- 6) Cleanup legacy single-assignee columns if present (safe)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS assigned_to;

-- 7) Comments (safe)
COMMENT ON TABLE public.subtask_assignments IS 'Junction table for many-to-many relationship between subtasks and team members (assignees)';
COMMENT ON VIEW public.subtasks_with_assignees IS 'View providing subtasks with their assignee information';
COMMENT ON VIEW public.tasks_with_assignees IS 'View providing tasks with their assignee information';
COMMENT ON VIEW public.tasks_with_full_details IS 'Comprehensive view providing tasks with subtasks and assignees'; 