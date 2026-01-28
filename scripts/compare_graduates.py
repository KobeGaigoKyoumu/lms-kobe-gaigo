#!/usr/bin/env python
# -*- coding: utf-8 -*-
import pandas as pd
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Excel読み込み
df = pd.read_excel(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\卒業生進路一覧\2022年度入学生進路一覧.xlsx')
excel_grads = df[df['卒業・退学'].isin(['卒業', '修了'])]['学籍番号'].astype(str).tolist()

# JSON読み込み
with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2024年3月卒業の学生
json_grads = []
for s in data['students']:
    if s.get('source') in ['卒業生', '修了生']:
        grad_date = s.get('graduation_date', '')
        if '2024' in str(grad_date):
            json_grads.append(str(s.get('student_id', '')))

# JSONにあってExcelにない学籍番号
extra_in_json = set(json_grads) - set(excel_grads)
print(f'JSONにあってExcelにない学籍番号({len(extra_in_json)}件):')
for sid in sorted(extra_in_json):
    for s in data['students']:
        if str(s.get('student_id', '')) == sid:
            name = s.get('name')
            source = s.get('source')
            grad = s.get('graduation_date')
            print(f'  {sid}: {name} - source:{source}, grad:{grad}')
            break

# Excelにあってjsonにない
missing_in_json = set(excel_grads) - set(json_grads)
print(f'\nExcelにあってJSONにない学籍番号({len(missing_in_json)}件):')
for sid in sorted(missing_in_json):
    row = df[df['学籍番号'].astype(str) == sid]
    if len(row) > 0:
        name = row.iloc[0]['氏名']
        status = row.iloc[0]['卒業・退学']
        print(f'  {sid}: {name} ({status})')

# 差異まとめ
print(f'\n差異サマリー:')
print(f'  Excel卒業・修了: {len(excel_grads)}人')
print(f'  JSON 2024年卒業・修了: {len(json_grads)}人')
print(f'  Excelのみ: {len(missing_in_json)}人')
print(f'  JSONのみ: {len(extra_in_json)}人')
print(f'  正味差: {len(excel_grads) - len(json_grads)}人')
