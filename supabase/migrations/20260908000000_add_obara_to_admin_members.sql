-- Add Obara to admin_members
INSERT INTO admin_members (name, password, role)
VALUES ('小原', '9417', 'teacher')
ON CONFLICT (name) DO NOTHING;
