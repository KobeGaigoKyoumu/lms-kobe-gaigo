#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
2025年3月卒業予定者の詳細分析
"""

import pandas as pd
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\歴代受験結果データベース.xlsx'

print("=" * 60)
print("集計シートから2025年3月卒（2年生）の分析")
print("=" * 60)

summary = pd.read_excel(excel_path, sheet_name='集計シート')

# 2年生のみ抽出
second_year = summary[summary['学年'] == '2年生']
print(f"2年生の総数: {len(second_year)}")

# 取得級の分布
print("\n取得級の分布:")
print(second_year['取得級'].value_counts())

# N3以上保有者
n3_plus_grades = ['N1', 'N2', 'N3']
n3_plus = second_year[second_year['取得級'].isin(n3_plus_grades)]
print(f"\nN3以上保有者: {len(n3_plus)} / {len(second_year)} = {len(n3_plus)/len(second_year)*100:.1f}%")

print("\n" + "=" * 60)
print("6桁学籍番号の分析（2018年以前のフォーマット）")
print("=" * 60)

history = pd.read_excel(excel_path, sheet_name='歴代受験記録')

# 6桁の学籍番号のみ
six_digit = history[history['学籍番号'].astype(str).str.len() == 6]
print(f"6桁学籍番号のレコード数: {len(six_digit)}")

# サンプルを表示
print("\n6桁学籍番号のサンプル:")
for _, row in six_digit.head(20).iterrows():
    print(f"  {row['学籍番号']}: {row['氏名']} ({row['受験回']}, {row['レベル']}, {row['合否']})")

# 6桁学籍番号のパターン分析
print("\n6桁学籍番号のパターン分析:")
six_digit_ids = six_digit['学籍番号'].astype(str).unique()
prefixes = defaultdict(int)
for sid in six_digit_ids:
    prefix = sid[:2]
    prefixes[prefix] += 1
print(f"先頭2桁の分布: {dict(prefixes)}")

# 先頭2桁ごとのサンプル
print("\n先頭2桁ごとのサンプル:")
for prefix in sorted(prefixes.keys()):
    samples = [s for s in six_digit_ids if s.startswith(prefix)][:5]
    print(f"  {prefix}xxx: {samples}")

print("\n" + "=" * 60)
print("7桁学籍番号の先頭2桁分析（入学年度）")
print("=" * 60)

seven_digit = history[history['学籍番号'].astype(str).str.len() == 7]
seven_digit_ids = seven_digit['学籍番号'].astype(str).unique()
prefixes7 = defaultdict(int)
for sid in seven_digit_ids:
    prefix = sid[:2]
    prefixes7[prefix] += 1
print(f"先頭2桁の分布（入学年度）: {dict(sorted(prefixes7.items()))}")

for prefix in sorted(prefixes7.keys()):
    samples = [s for s in seven_digit_ids if s.startswith(prefix)][:3]
    print(f"  20{prefix}年入学: {samples}")

print("\n" + "=" * 60)
print("2025年3月卒の詳細検証")
print("=" * 60)

# 2023年入学 = 2025年3月卒
# 学籍番号が23で始まる7桁の学生

json_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_historical.json'
with open(json_path, 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)

records = jlpt_data['records']

# 2025年3月卒の学生を学籍番号で特定
grad_2025_students = {}
for r in records:
    sid = str(r['studentId'])
    # 7桁で23で始まる = 2023年入学
    if len(sid) == 7 and sid.startswith('23'):
        if sid not in grad_2025_students:
            grad_2025_students[sid] = {
                'names': set(),
                'country': r['country'],
                'best_level': None,
                'results': []
            }
        grad_2025_students[sid]['names'].add(r['name'])
        grad_2025_students[sid]['results'].append({
            'session': r['session'],
            'level': r['level'],
            'result': r['result']
        })
        # N3以上合格のベストレベルを記録
        if r['result'] == '合格':
            level_num = int(r['level'].replace('N', ''))
            if level_num <= 3:
                current_best = grad_2025_students[sid]['best_level']
                if current_best is None or level_num < int(current_best.replace('N', '')):
                    grad_2025_students[sid]['best_level'] = r['level']

# 集計
total_students = len(grad_2025_students)
n3_plus_students = sum(1 for s in grad_2025_students.values() if s['best_level'] is not None)

print(f"2025年3月卒の学生数（学籍番号23xxxxで特定）: {total_students}")
print(f"N3以上保有者: {n3_plus_students}")
print(f"N3以上保有率: {n3_plus_students/total_students*100:.1f}%" if total_students else "N/A")

# 比較用：集計シートの2年生データ
print(f"\n集計シートの2年生: {len(second_year)}人")
print(f"集計シートのN3以上: {len(n3_plus)}人 ({len(n3_plus)/len(second_year)*100:.1f}%)")

print("\n差分分析:")
print(f"  JSONデータの2025年3月卒: {total_students}人")
print(f"  Excelの2年生: {len(second_year)}人")
print(f"  差: {abs(total_students - len(second_year))}人")

# N3以上保有者の詳細
print("\n" + "=" * 60)
print("N3以上保有者のレベル別内訳")
print("=" * 60)

level_counts = defaultdict(int)
for s in grad_2025_students.values():
    if s['best_level']:
        level_counts[s['best_level']] += 1
        
for level in ['N1', 'N2', 'N3']:
    print(f"  {level}: {level_counts[level]}人")
