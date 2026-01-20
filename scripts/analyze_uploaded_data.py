#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
アップロードされた学生データファイルを分析
"""

import pandas as pd
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

files = [
    (r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\20260120_studentDocument_c31a4346-a533-4120-98d9-f46a2211cf3f.xlsx', '修了生'),
    (r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\20260120_studentDocument_f4be3671-44bf-42b3-8669-3c8005c03146.xlsx', '退学者'),
    (r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\20260120_studentDocument_eff8d85a-1fa3-410d-8909-538dbe252350.xlsx', '卒業生'),
]

all_students = []

def safe_sort(keys):
    """型に関係なくソートするヘルパー"""
    int_keys = sorted([k for k in keys if isinstance(k, int)])
    str_keys = sorted([k for k in keys if isinstance(k, str)])
    return int_keys + str_keys

for filepath, label in files:
    print(f"\n{'='*60}")
    print(f"ファイル: {label}")
    print(f"{'='*60}")
    
    df = pd.read_excel(filepath)
    print(f"行数: {len(df)}")
    
    # 列名にある改行を処理
    df.columns = [str(c).replace('\n', '') for c in df.columns]
    
    # 卒業年月の分布
    grad_col = '卒業年月' if '卒業年月' in df.columns else '卒業年月日' if '卒業年月日' in df.columns else None
    if grad_col:
        print(f"\n卒業年の分布:")
        grad_years = defaultdict(int)
        for val in df[grad_col]:
            if pd.notna(val):
                try:
                    year = pd.to_datetime(val).year
                    grad_years[year] += 1
                except:
                    pass
        for year in safe_sort(grad_years.keys()):
            print(f"  {year}: {grad_years[year]}人")
    
    # 入学年月日の分布
    if '入学年月日' in df.columns:
        print(f"\n入学年の分布:")
        enroll_years = defaultdict(int)
        for val in df['入学年月日']:
            if pd.notna(val):
                try:
                    year = pd.to_datetime(val).year
                    enroll_years[year] += 1
                except:
                    pass
        for year in safe_sort(enroll_years.keys()):
            print(f"  {year}: {enroll_years[year]}人")
    
    # 学籍番号の先頭2桁の分布
    print(f"\n学籍番号の先頭2桁:")
    prefixes = defaultdict(int)
    for sid in df['学籍番号']:
        if pd.notna(sid):
            sid_str = str(int(sid)) if isinstance(sid, float) else str(sid)
            if len(sid_str) >= 2:
                prefixes[sid_str[:2]] += 1
    for prefix in safe_sort(prefixes.keys()):
        print(f"  {prefix}: {prefixes[prefix]}件")
    
    # データを保存
    for _, row in df.iterrows():
        if pd.notna(row['学籍番号']):
            sid = str(int(row['学籍番号'])) if isinstance(row['学籍番号'], float) else str(row['学籍番号'])
            student = {
                'student_id': sid,
                'name': row.get('氏名', ''),
                'name_romaji': row.get('ローマ字', ''),
                'enrollment_date': row.get('入学年月日'),
                'graduation_date': row.get(grad_col) if grad_col else None,
                'nationality': row.get('国籍・地域', ''),
                'source': label
            }
            all_students.append(student)

print(f"\n{'='*60}")
print(f"全ファイルの合計")
print(f"{'='*60}")
print(f"総学生数: {len(all_students)}")
print(f"  修了生: {sum(1 for s in all_students if s['source'] == '修了生')}人")
print(f"  退学者: {sum(1 for s in all_students if s['source'] == '退学者')}人")
print(f"  卒業生: {sum(1 for s in all_students if s['source'] == '卒業生')}人")

# 卒業年度別の学生数（卒業生のみ）
print(f"\n卒業生の卒業年度別:")
grad_students = [s for s in all_students if s['source'] == '卒業生']
grad_year_counts = defaultdict(int)
for s in grad_students:
    grad_date = s['graduation_date']
    if pd.notna(grad_date):
        try:
            dt = pd.to_datetime(grad_date)
            # 3月卒なら年度確定
            fiscal_year = dt.year if dt.month <= 3 else dt.year + 1
            grad_year_counts[f"{fiscal_year}年3月"] += 1
        except:
            grad_year_counts['不明'] += 1
    else:
        grad_year_counts['なし'] += 1

for year in safe_sort(grad_year_counts.keys()):
    print(f"  {year}: {grad_year_counts[year]}人")

# JSONファイルとして出力
output_data = {
    'students': all_students
}
output_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)
print(f"\nJSONファイル出力: {output_path}")
