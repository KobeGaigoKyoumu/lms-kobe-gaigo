#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同じ学籍番号で複数の名前表記がある学生の名前マッピングテーブルを生成
漢字名とローマ字名の対応関係を抽出する
"""

import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_historical.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Group by student ID
students_by_id = defaultdict(set)
for r in data['records']:
    if r['studentId'] and r['name']:
        students_by_id[r['studentId']].add(r['name'].strip())

# Find students with multiple name variants
name_mappings = []
for student_id, names in students_by_id.items():
    if len(names) > 1:
        names_list = list(names)
        # Separate kanji and romanized names
        kanji_names = [n for n in names_list if not n.isupper()]
        roman_names = [n for n in names_list if n.isupper()]
        
        if kanji_names and roman_names:
            for k in kanji_names:
                for r in roman_names:
                    name_mappings.append({
                        'studentId': student_id,
                        'kanjiName': k,
                        'romanName': r
                    })

print(f"Found {len(name_mappings)} kanji-roman name pairs:")
for m in name_mappings[:30]:
    print(f"  {m['studentId']}: {m['kanjiName']} <-> {m['romanName']}")

# Save as JSON mapping file
output_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\name_mappings.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump({
        'description': 'Mapping between kanji and romanized names for Chinese students',
        'mappings': name_mappings
    }, f, ensure_ascii=False, indent=2)

print(f"\nSaved to: {output_path}")
