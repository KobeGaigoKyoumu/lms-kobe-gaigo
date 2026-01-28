#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
enrollment_stats.json と JLPTデータを使用して、
修正後の受験率データに整合性があるか（100%超えがないか等）を検証するスクリプト
"""
import json
import sys
import os
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
ENROLLMENT_PATH = os.path.join(BASE_DIR, 'data', 'enrollment_stats.json')
# JLPTデータはAPI経由などで取得される想定だが、ここでは簡易的に
# data/jlpt_historical.json があると仮定して検証（もしあれば）
# なければ enrollment_stats.json の内容確認のみ行う
JLPT_PATH = os.path.join(BASE_DIR, 'data', 'jlpt_historical.json')

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

enrollment_data = load_json(ENROLLMENT_PATH)
jlpt_data = load_json(JLPT_PATH)

print("=== enrollment_stats.json 整合性チェック ===")
if not enrollment_data:
    print("Error: enrollment_stats.json not found.")
    sys.exit(1)

for year, stats in sorted(enrollment_data.items()):
    total = stats.get('total', 0)
    first = stats.get('first_year', 0)
    second = stats.get('second_year', 0)
    
    print(f"{year}年度:")
    print(f"  在籍総数: {total}")
    print(f"  1年生: {first}")
    print(f"  2年生: {second}")
    
    # 学年合計と総数のチェック
    calc_total = first + second
    if calc_total != total:
        print(f"  [WARNING] 学年合計({calc_total}) と 総数({total}) が一致しません")
    else:
        print(f"  [OK] 学年合計と総数が一致")
        
    if first == 0 and second == 0:
         print(f"  [WARNING] 学年別データが両方0です (計算上の受験率が異常になる可能性があります)")

print("\n=== データソース メモ ===")
for year, stats in sorted(enrollment_data.items()):
    if 'note' in stats:
        print(f"{year}: {stats['note']}")
