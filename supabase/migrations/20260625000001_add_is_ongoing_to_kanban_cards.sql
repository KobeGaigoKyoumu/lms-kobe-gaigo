-- Add is_ongoing column to kanban_cards table for dashboard selection
ALTER TABLE public.kanban_cards ADD COLUMN is_ongoing BOOLEAN DEFAULT false;
