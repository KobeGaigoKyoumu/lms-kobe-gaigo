#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 欠損とされた3名の情報を確認
missing_ids = ['2104019', '2207005', '2210041']
for sid in missing_ids:
    found = False
    for s in data['students']:
        if str(s.get('student_id', '')) == sid:
            name = s.get('name')
            source = s.get('source')
            grad_date = s.get('graduation_date')
            print(f'{sid}:')
            print(f'  name: {name}')
            print(f'  source: {source}')
            print(f'  graduation_date: {grad_date}')
            print()
            found = True
            break
    if not found:
        print(f'{sid}: 見つかりません')
