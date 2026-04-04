-- =============================================
-- Kanban Schema Fix
-- Renames columns to match latest application code (order_index, user_id)
-- =============================================

-- 1. kanban_columns fix
DO $$ 
BEGIN 
    -- Create table if it doesn't exist (safety)
    CREATE TABLE IF NOT EXISTS kanban_columns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        color TEXT DEFAULT '#f59e0b',
        user_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Rename position -> order_index if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_columns' AND column_name = 'position') THEN
        ALTER TABLE kanban_columns RENAME COLUMN position TO order_index;
    END IF;

    -- Rename created_by -> user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_columns' AND column_name = 'created_by') THEN
        ALTER TABLE kanban_columns RENAME COLUMN created_by TO user_id;
    END IF;

    -- Ensure order_index exists (if neither position nor order_index were there)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_columns' AND column_name = 'order_index') THEN
        ALTER TABLE kanban_columns ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_columns' AND column_name = 'user_id') THEN
        ALTER TABLE kanban_columns ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. kanban_cards fix
DO $$ 
BEGIN 
    -- Rename created_by -> user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_cards' AND column_name = 'created_by') THEN
        ALTER TABLE kanban_cards RENAME COLUMN created_by TO user_id;
    END IF;

    -- Ensure user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_cards' AND column_name = 'user_id') THEN
        ALTER TABLE kanban_cards ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. kanban_reminders fix
DO $$ 
BEGIN 
    -- Rename created_by -> user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_reminders' AND column_name = 'created_by') THEN
        -- If it was TEXT (as seen in some migrations), we might need to cast it
        ALTER TABLE kanban_reminders RENAME COLUMN created_by TO user_id_temp;
        ALTER TABLE kanban_reminders ADD COLUMN user_id UUID REFERENCES auth.users(id);
        -- Try to migrate data if it looks like a UUID
        UPDATE kanban_reminders SET user_id = user_id_temp::uuid WHERE user_id_temp ~ '^[0-9a-fA-F-]{36}$';
        ALTER TABLE kanban_reminders DROP COLUMN user_id_temp;
    END IF;

    -- Ensure user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_reminders' AND column_name = 'user_id') THEN
        ALTER TABLE kanban_reminders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
