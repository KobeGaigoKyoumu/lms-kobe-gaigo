#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ExcelデータとJLPT分析データの検証スクリプト
- 試験回別データの確認
- 2018年以前の学籍番号ロジック分析
- 2025年3月卒のN3+保有率検証
"""

import pandas as pd
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# Excelファイル読み込み
excel_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\歴代受験結果データベース.xlsx'

print("=" * 60)
print("1. Excelシート一覧")
print("=" * 60)

xl = pd.ExcelFile(excel_path)
print(f"シート名: {xl.sheet_names}")

print("\n" + "=" * 60)
print("2. 試験回別データの確認")
print("=" * 60)

try:
    test_data = pd.read_excel(excel_path, sheet_name='試験回別データ')
    print(f"行数: {len(test_data)}, 列数: {len(test_data.columns)}")
    print(f"列名: {list(test_data.columns)}")
    print("\nデータ:")
    print(test_data.head(50).to_string())
    if len(test_data) > 50:
        print(f"\n... (残り {len(test_data) - 50} 行は省略されました)")
except Exception as e:
    print(f"試験回別データ読み込みエラー: {e}")

print("\n" + "=" * 60)
print("3. 集計シートの確認")
print("=" * 60)

try:
    summary = pd.read_excel(excel_path, sheet_name='集計シート')
    print(f"行数: {len(summary)}, 列数: {len(summary.columns)}")
    print(f"列名: {list(summary.columns)[:15]}")
    print("\n最初の10行:")
    print(summary.head(10).to_string())
except Exception as e:
    print(f"集計シート読み込みエラー: {e}")

print("\n" + "=" * 60)
print("4. 学籍番号の桁数とフォーマット分析")
print("=" * 60)

history = pd.read_excel(excel_path, sheet_name='歴代受験記録')
print(f"総レコード数: {len(history)}")

# 学籍番号の桁数分布
history['id_len'] = history['学籍番号'].astype(str).str.len()
print("\n学籍番号の桁数分布:")
print(history['id_len'].value_counts().sort_index())

# 各桁数のサンプル
print("\n桁数別サンプル:")
for length in sorted(history['id_len'].unique()):
    samples = history[history['id_len'] == length]['学籍番号'].head(5).tolist()
    print(f"  {length}桁: {samples}")

print("\n" + "=" * 60)
print("5. 受験回別の学籍番号フォーマット分析")
print("=" * 60)

# 受験回ごとに学籍番号を分析
for session in sorted(history['受験回'].unique()):
    session_data = history[history['受験回'] == session]
    ids = session_data['学籍番号'].astype(str)
    id_lengths = ids.str.len().value_counts().to_dict()
    print(f"{session}: レコード数={len(session_data)}, 桁数分布={id_lengths}")

print("\n" + "=" * 60)
print("6. 2025年3月卒業予定者の分析")
print("=" * 60)

# 2025年3月卒 = 2023年4月入学（2年制）
# 学籍番号が2304xxx の学生

# まず現在のJSONデータを読み込む
json_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_historical.json'
with open(json_path, 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)

records = jlpt_data['records']

# 2025年3月卒業予定の学籍番号パターンを探す
# 新ロジック: 23MMXXX = 2023年入学
# 旧ロジック: 不明

print("\n学籍番号23で始まる学生（2023年4月入学想定）:")
students_23 = set()
for r in records:
    sid = str(r['studentId'])
    if sid.startswith('23') and len(sid) == 7:
        students_23.add((sid, r['name']))
        
print(f"学生数: {len(students_23)}")
for sid, name in sorted(students_23)[:20]:
    print(f"  {sid}: {name}")

# N3以上合格者を集計
n3plus_23 = set()
for r in records:
    sid = str(r['studentId'])
    if sid.startswith('23') and len(sid) == 7:
        if r['result'] == '合格':
            level_num = int(r['level'].replace('N', ''))
            if level_num <= 3:
                n3plus_23.add(r['name'])

print(f"\nN3以上合格者数: {len(n3plus_23)}")
print(f"N3以上保有率: {len(n3plus_23)/len(students_23)*100:.1f}%" if students_23 else "N/A")
