-- Migration: Add order_index field to tasks table for drag and drop reordering
-- This will allow proper task reordering within columns

-- Add order_index column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better performance on order_index
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);

-- Update existing tasks to have order_index based on created_at
-- This ensures existing tasks have a proper order
UPDATE public.tasks 
SET order_index = EXTRACT(EPOCH FROM created_at)::INTEGER 
WHERE order_index = 0;

-- Create a function to reorder tasks within a status
CREATE OR REPLACE FUNCTION public.reorder_task(
  p_task_id UUID,
  p_new_index INTEGER,
  p_status task_status
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_index INTEGER;
  v_task_count INTEGER;
BEGIN
  -- Get the current order_index of the task
  SELECT order_index INTO v_old_index
  FROM public.tasks
  WHERE id = p_task_id AND status = p_status;
  
  IF v_old_index IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get total number of tasks in this status
  SELECT COUNT(*) INTO v_task_count
  FROM public.tasks
  WHERE status = p_status;
  
  -- Ensure new_index is within bounds
  p_new_index := GREATEST(0, LEAST(p_new_index, v_task_count - 1));
  
  -- If moving to the same position, do nothing
  IF v_old_index = p_new_index THEN
    RETURN TRUE;
  END IF;
  
  -- Update order_index of other tasks
  IF v_old_index < p_new_index THEN
    -- Moving down: shift tasks between old and new position up
    UPDATE public.tasks
    SET order_index = order_index - 1
    WHERE status = p_status 
      AND order_index > v_old_index 
      AND order_index <= p_new_index;
  ELSE
    -- Moving up: shift tasks between new and old position down
    UPDATE public.tasks
    SET order_index = order_index + 1
    WHERE status = p_status 
      AND order_index >= p_new_index 
      AND order_index < v_old_index;
  END IF;
  
  -- Update the target task's order_index
  UPDATE public.tasks
  SET order_index = p_new_index
  WHERE id = p_task_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reorder_task(UUID, INTEGER, task_status) TO authenticated;
