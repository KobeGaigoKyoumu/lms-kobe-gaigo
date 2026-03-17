-- テスト用学生アカウントの追加
INSERT INTO students (student_id_text, class_name, full_name, full_name_kana, enrollment_year, status)
VALUES 
    ('test-student', 'TEST-1', 'テスト 太郎', 'テスト タロウ', 2024, 'active')
ON CONFLICT (student_id_text) DO NOTHING;
