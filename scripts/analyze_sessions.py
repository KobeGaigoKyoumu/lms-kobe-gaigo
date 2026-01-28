#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import sys
import os
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
JLPT_HISTORICAL_PATH = os.path.join(BASE_DIR, 'data', 'jlpt_historical.json')

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

jlpt_data = load_json(JLPT_HISTORICAL_PATH)
records = jlpt_data.get('records', []) if jlpt_data else []

print(f"Historical JSON レコード数: {len(records)}")

print("\n=== 全セッション名の調査 ===")
session_counts = defaultdict(int)
for r in records:
    session_counts[r.get('session')] += 1

sorted_sessions = sorted(session_counts.items(), key=lambda x: x[0])
for session, count in sorted_sessions:
    print(f"{session}: {count}件")

# 2025が含まれるレコードを詳細確認
print("\n=== 2025を含むレコード詳細 ===")
found = False
for r in records:
    if "2025" in r.get('session', ''):
        print(f"Session: {r.get('session')}, ID: {r.get('studentId')}, Name: {r.get('name')}")
        found = True

if not found:
    print("見つかりませんでした。")
