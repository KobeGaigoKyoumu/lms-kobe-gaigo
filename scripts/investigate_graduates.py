#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import pandas as pd
from collections import defaultdict
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data/historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

students = data['students']

# 2024年1月〜3月の全卒業者を詳しく確認
print('=== 2024年1-3月の全卒業者（全source）===')
all_2024_march = []
for s in students:
    grad_date = s.get('graduation_date')
    if pd.notna(grad_date) and grad_date and grad_date != 'NaN':
        try:
            dt = pd.to_datetime(grad_date)
            if dt.year == 2024 and dt.month <= 3:
                all_2024_march.append(s)
        except:
            pass

print(f'合計: {len(all_2024_march)}人')

# source別
by_source = defaultdict(list)
for s in all_2024_march:
    by_source[s.get('source', '不明')].append(s)

print('\nSource別:')
for src, lst in sorted(by_source.items()):
    print(f'  {src}: {len(lst)}人')

# 卒業日別
print('\n卒業日別:')
by_date = defaultdict(int)
for s in all_2024_march:
    if s.get('source') in ['卒業生', '修了生']:
        by_date[s.get('graduation_date')] += 1
for date, count in sorted(by_date.items()):
    print(f'  {date}: {count}人')

# 2023年10月〜2024年3月の卒業者も確認（年度末卒業）
print('\n=== 2023年10月〜2024年3月の卒業生+修了生 ===')
count = 0
for s in students:
    if s.get('source') in ['卒業生', '修了生']:
        grad_date = s.get('graduation_date')
        if pd.notna(grad_date) and grad_date and grad_date != 'NaN':
            try:
                dt = pd.to_datetime(grad_date)
                if (dt.year == 2023 and dt.month >= 10) or (dt.year == 2024 and dt.month <= 3):
                    count += 1
            except:
                pass
print(f'合計: {count}人')
