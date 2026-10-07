-- Add Matsumoto to admin_members
INSERT INTO admin_members (name, password, role)
VALUES ('松本', '0528', 'teacher')
ON CONFLICT (name) DO NOTHING;
