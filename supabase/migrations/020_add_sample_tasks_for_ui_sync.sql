-- Add sample tasks that match the current UI structure
-- Migration: 020_add_sample_tasks_for_ui_sync.sql

-- Insert sample tasks matching the UI structure
INSERT INTO public.tasks (
  id,
  title,
  description,
  priority,
  status,
  start_date,
  due_date,
  created_by,
  assigned_to
) VALUES 
(
  gen_random_uuid(),
  'Setup production line calibration',
  'Calibrate all production line equipment for optimal performance',
  'High',
  'Todo',
  '2024-01-15',
  '2024-01-20',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309'
),
(
  gen_random_uuid(),
  'Quality control inspection',
  'Comprehensive quality control inspection of recent production batches',
  'Critical',
  'Todo',
  '2024-01-16',
  '2024-01-18',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309'
),
(
  gen_random_uuid(),
  'Machine maintenance schedule',
  'Regular maintenance schedule for all manufacturing equipment',
  'Medium',
  'In Progress',
  '2024-01-14',
  '2024-01-22',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309'
),
(
  gen_random_uuid(),
  'Safety protocol review',
  'Annual review and update of all safety protocols',
  'Low',
  'Completed',
  '2024-01-10',
  '2024-01-15',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309',
  'fe9ffe8f-6441-4abd-878a-7969a4e1b309'
);
