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
        user_id UUID REFERENCES public.profiles(id),
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
        ALTER TABLE kanban_columns ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;
    
    -- Clean up and set types
    UPDATE kanban_columns SET user_id = NULL WHERE user_id::text = 'null';
    ALTER TABLE kanban_columns ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

    -- Update existing constraint if any
    ALTER TABLE kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_created_by_fkey;
    ALTER TABLE kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_user_id_fkey;
    ALTER TABLE kanban_columns ADD CONSTRAINT kanban_columns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
END $$;

-- 2. kanban_cards fix
DO $$ 
BEGIN 
    -- Rename position -> position (just dummy to match logic)
    -- Rename created_by -> user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_cards' AND column_name = 'created_by') THEN
        ALTER TABLE kanban_cards RENAME COLUMN created_by TO user_id;
    END IF;

    -- Ensure user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_cards' AND column_name = 'user_id') THEN
        ALTER TABLE kanban_cards ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;

    -- Clean up and set types
    UPDATE kanban_cards SET user_id = NULL WHERE user_id::text = 'null';
    ALTER TABLE kanban_cards ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    
    -- Also clean column_id just in case
    UPDATE kanban_cards SET column_id = NULL WHERE column_id::text = 'null';
    ALTER TABLE kanban_cards ALTER COLUMN column_id TYPE UUID USING column_id::UUID;

    -- Update existing constraint if any
    ALTER TABLE kanban_cards DROP CONSTRAINT IF EXISTS kanban_cards_created_by_fkey;
    ALTER TABLE kanban_cards DROP CONSTRAINT IF EXISTS kanban_cards_user_id_fkey;
    ALTER TABLE kanban_cards ADD CONSTRAINT kanban_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
END $$;

-- 3. kanban_reminders fix
DO $$ 
BEGIN 
    -- Rename created_by -> user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_reminders' AND column_name = 'created_by') THEN
        -- If it was TEXT (as seen in some migrations), we might need to cast it
        ALTER TABLE kanban_reminders RENAME COLUMN created_by TO user_id_temp;
        ALTER TABLE kanban_reminders ADD COLUMN user_id UUID REFERENCES public.profiles(id);
        -- Try to migrate data if it looks like a UUID
        UPDATE kanban_reminders SET user_id = user_id_temp::uuid WHERE user_id_temp ~ '^[0-9a-fA-F-]{36}$';
        ALTER TABLE kanban_reminders DROP COLUMN user_id_temp;
    END IF;

    -- Ensure user_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kanban_reminders' AND column_name = 'user_id') THEN
        ALTER TABLE kanban_reminders ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;

    -- Clean up and set types
    UPDATE kanban_reminders SET user_id = NULL WHERE user_id::text = 'null';
    ALTER TABLE kanban_reminders ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

    -- Update existing constraint if any
    ALTER TABLE kanban_reminders DROP CONSTRAINT IF EXISTS kanban_reminders_created_by_fkey;
    ALTER TABLE kanban_reminders DROP CONSTRAINT IF EXISTS kanban_reminders_user_id_fkey;
    ALTER TABLE kanban_reminders ADD CONSTRAINT kanban_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
END $$;
