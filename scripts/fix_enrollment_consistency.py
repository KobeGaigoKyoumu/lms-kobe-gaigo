#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
enrollment_stats.json の不整合を修正するスクリプト
総数(total)を正とし、現在の1年生・2年生の比率で総数を再配分する
"""
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
ENROLLMENT_PATH = os.path.join(BASE_DIR, 'data', 'enrollment_stats.json')

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

data = load_json(ENROLLMENT_PATH)

print("=== 修正前 ===")
for year, stats in sorted(data.items()):
    total = stats.get('total', 0)
    first = stats.get('first_year', 0)
    second = stats.get('second_year', 0)
    print(f"{year}: Total={total}, 1st={first}, 2nd={second}, Sum={first+second}")

print("\n=== 修正処理 ===")
for year, stats in data.items():
    total = stats.get('total', 0)
    first = stats.get('first_year', 0)
    second = stats.get('second_year', 0)
    calc_sum = first + second
    
    # 合計が一致していて、かつ0でない場合はスキップ
    if calc_sum == total and total > 0:
        continue
        
    if total == 0:
        continue

    # 比率計算
    if calc_sum > 0:
        ratio_first = first / calc_sum
        ratio_second = second / calc_sum
    else:
        # データがない場合は1:1と仮定（または前後の傾向から推定すべきだが簡易的に）
        ratio_first = 0.5
        ratio_second = 0.5
        print(f"  {year}: 比率データなし、50:50で配分します")

    # 再配分
    new_first = int(total * ratio_first)
    new_second = total - new_first # 端数は2年生に寄せる（合計を一致させるため）
    
    data[year]['first_year'] = new_first
    data[year]['second_year'] = new_second
    data[year]['note'] += " (総数に合わせて比率配分済み)"
    
    print(f"{year}: Total={total} -> 1st={new_first}, 2nd={new_second} (Ratio {ratio_first:.2f}:{ratio_second:.2f})")

# 保存
with open(ENROLLMENT_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n修正完了: {ENROLLMENT_PATH}")
