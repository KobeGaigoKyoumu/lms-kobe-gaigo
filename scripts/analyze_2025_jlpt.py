#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
2025年度のJLPT受験データを詳細分析し、延べ人数とユニーク人数の差異原因を特定する
"""
import json
import sys
import os
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
JLPT_PATH = os.path.join(BASE_DIR, 'data', 'jlpt_historical.json')

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

jlpt_data = load_json(JLPT_PATH)
if not jlpt_data:
    print("Error: jlpt_historical.json not found")
    sys.exit(1)

records = jlpt_data.get('records', [])

print(f"全JLPTレコード数: {len(records)}")

# 2025年度（2025年4月〜2026年3月）のデータを抽出
# JLPTのセッション形式: "YYYY_1" (7月), "YYYY_2" (12月)
# 2025年度に含まれるセッション: "2025_1", "2025_2"

target_sessions = ["2025_1", "2025_2"]
target_records = [r for r in records if r.get('session') in target_sessions]

print(f"\n=== 2025年度（{' '.join(target_sessions)}）の分析 ===")
print(f"レコード数（延べ人数）: {len(target_records)}")

# ユニーク人数チェック
unique_students = set()
student_records = defaultdict(list)

for r in target_records:
    # ユニークキー: 学籍番号があれば学籍番号、なければ名前
    if r.get('studentId'):
        key = str(r.get('studentId'))
    else:
        key = f"{r.get('name')}:{r.get('country')}"
    
    unique_students.add(key)
    student_records[key].append(r)

print(f"ユニーク人数: {len(unique_students)}")
print(f"差異: {len(target_records) - len(unique_students)}")

# 差異の原因分析
print("\n=== 重複受験者（ダブル受験など） ===")
duplicates = {k: v for k, v in student_records.items() if len(v) > 1}

if not duplicates:
    print("重複受験者は見つかりませんでした。")
else:
    print(f"重複受験者数: {len(duplicates)}")
    for key, records in duplicates.items():
        print(f"\n学生キー: {key}")
        for r in records:
            print(f"  - {r.get('session')} {r.get('level')} {r.get('result')} (Score: {r.get('totalScore')})")

# セッション別の内訳
print("\n=== セッション別内訳 ===")
session_counts = defaultdict(int)
for r in target_records:
    session_counts[r.get('session')] += 1

for session, count in sorted(session_counts.items()):
    print(f"{session}: {count}件")
