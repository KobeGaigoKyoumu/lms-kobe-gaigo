#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2名の卒業日を2024年3月に戻す
fixes = {
    '2304142': {'graduation_date': '2024-03-31 00:00:00'},
    '2310048': {'graduation_date': '2024-03-31 00:00:00'},
}

for student in data['students']:
    sid = str(student.get('student_id', ''))
    if sid in fixes:
        old_value = student.get('graduation_date')
        student['graduation_date'] = fixes[sid]['graduation_date']
        name = student.get('name')
        print(f'{sid} ({name}): {old_value} -> {fixes[sid]["graduation_date"]}')

with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('\n修正完了')
