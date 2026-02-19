-- Create event_packages table
create table if not exists event_packages (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    -- JSON structure expected:
    -- [
    --   {
    --     "title": "Text",
    --     "description": "Text",
    --     "day_offset": 0, (0 = start date, 1 = next day, etc.)
    --     "type": "class" | "exam" | "holiday" | "other",
    --     "start_time": "HH:MM", (optional, if missing assumption is all day or specific default)
    --     "end_time": "HH:MM", (optional)
    --     "all_day": boolean,
    --     "color": "#HEX"
    --   }
    -- ]
    events jsonb not null default '[]'::jsonb,
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- Enable RLS
alter table event_packages enable row level security;

-- Policies
create policy "Enable read access for all authenticated users"
  on event_packages for select
  to authenticated
  using (true);

create policy "Enable insert for teachers and admins"
  on event_packages for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (role = 'teacher' or role = 'admin')
    )
  );

create policy "Enable update for creators and admins"
  on event_packages for update
  to authenticated
  using (
    auth.uid() = created_by or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Enable delete for creators and admins"
  on event_packages for delete
  to authenticated
  using (
    auth.uid() = created_by or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and role = 'admin'
    )
  );
