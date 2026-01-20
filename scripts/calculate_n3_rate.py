#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
卒業生データとJLPT分析データを照合してN3以上保有率を計算
(漢字圏・非漢字圏の内訳対応版)
"""

import pandas as pd
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# 卒業生データを読み込む
students_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json'
with open(students_path, 'r', encoding='utf-8') as f:
    students_data = json.load(f)

# JLPT歴代データを読み込む
jlpt_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_historical.json'
with open(jlpt_path, 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)

# 名前マッピングを読み込む
name_mappings_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\name_mappings.json'
with open(name_mappings_path, 'r', encoding='utf-8') as f:
    name_mappings = json.load(f)

# 名前マッピングを辞書に変換
name_map = {}
for m in name_mappings['mappings']:
    kanji = m['kanjiName'].lower().strip()
    roman = m['romanName'].lower().strip()
    if kanji not in name_map:
        name_map[kanji] = set([kanji])
    name_map[kanji].add(roman)
    if roman not in name_map:
        name_map[roman] = set([roman])
    name_map[roman].add(kanji)

def get_all_name_variants(name):
    """名前のすべてのバリエーションを取得"""
    if not name:
        return set()
    name_lower = name.lower().strip()
    return name_map.get(name_lower, set([name_lower]))

# 漢字圏の定義
KANJI_COUNTRIES = {'中国', '台湾', '香港'}

def is_kanji_country(nationality):
    """国籍が漢字圏かどうかを判定"""
    if not nationality:
        return False
    return nationality in KANJI_COUNTRIES

# 卒業生を卒業年度別にグループ化
students = students_data['students']
graduates = [s for s in students if s['source'] == '卒業生']

print(f"卒業生総数: {len(graduates)}")

# 卒業年度別にグループ化
grad_by_year = defaultdict(list)
for s in graduates:
    grad_date = s['graduation_date']
    if pd.notna(grad_date) and grad_date:
        try:
            dt = pd.to_datetime(grad_date)
            fiscal_year = dt.year if dt.month <= 3 else dt.year + 1
            
            # 特例処理: 2022年3月卒は2021年3月卒に統合（在籍延長のため）
            if fiscal_year == 2022:
                fiscal_year = 2021
                
            grad_by_year[f"{fiscal_year}年3月"].append(s)
        except:
            pass

print(f"\n卒業年度別の卒業生数:")
for year in sorted(grad_by_year.keys()):
    print(f"  {year}: {len(grad_by_year[year])}人")

# JLPTデータを学籍番号と名前でインデックス化
jlpt_by_sid = defaultdict(list)
jlpt_by_name = defaultdict(list)

for r in jlpt_data['records']:
    sid = str(r['studentId'])
    jlpt_by_sid[sid].append(r)
    
    name_lower = r['name'].lower().strip() if r['name'] else ''
    if name_lower:
        jlpt_by_name[name_lower].append(r)

print(f"\nJLPTデータ: {len(jlpt_data['records'])}件")

def get_best_level(jlpt_records):
    """JLPT記録から最高レベルを取得"""
    best = None
    for r in jlpt_records:
        if r['result'] == '合格':
            level_num = int(r['level'].replace('N', ''))
            # N3以上のみ対象（N1, N2, N3）
            if level_num <= 3:
                if best is None or level_num < best:
                    best = level_num
    return f"N{best}" if best else None

# 各卒業年度のN3以上保有率を計算
print(f"\n{'='*60}")
print("卒業年度別 N3以上保有率")
print(f"{'='*60}")

results = []

for year in sorted(grad_by_year.keys()):
    grads = grad_by_year[year]
    total = len(grads)
    matched = 0
    n3_plus = 0
    
    # 漢字圏・非漢字圏の内訳用
    kanji_total = 0
    kanji_n3_plus = 0
    non_kanji_total = 0
    non_kanji_n3_plus = 0
    
    for s in grads:
        sid = str(s['student_id'])
        name = s['name'] if s['name'] else ''
        name_romaji = s['name_romaji'] if s['name_romaji'] else ''
        nationality = s['nationality']
        
        is_kanji = is_kanji_country(nationality)
        if is_kanji:
            kanji_total += 1
        else:
            non_kanji_total += 1
        
        # JLPT記録を検索
        jlpt_records = []
        
        # 1. 学籍番号で検索
        if sid in jlpt_by_sid:
            jlpt_records.extend(jlpt_by_sid[sid])
        
        # 2. 名前で検索（バリエーション含む）
        if not jlpt_records:
            for name_variant in get_all_name_variants(name):
                if name_variant in jlpt_by_name:
                    jlpt_records.extend(jlpt_by_name[name_variant])
            # ローマ字名でも検索
            if name_romaji:
                name_romaji_lower = name_romaji.lower().strip()
                if name_romaji_lower in jlpt_by_name:
                    jlpt_records.extend(jlpt_by_name[name_romaji_lower])
        
        # N3保有チェック
        has_n3 = False
        if jlpt_records:
            matched += 1
            best = get_best_level(jlpt_records)
            if best:
                n3_plus += 1
                has_n3 = True
        
        # 内訳カウント
        if has_n3:
            if is_kanji:
                kanji_n3_plus += 1
            else:
                non_kanji_n3_plus += 1
    
    rate = (n3_plus / total * 100) if total > 0 else 0
    match_rate = (matched / total * 100) if total > 0 else 0
    
    kanji_rate = (kanji_n3_plus / kanji_total * 100) if kanji_total > 0 else 0
    non_kanji_rate = (non_kanji_n3_plus / non_kanji_total * 100) if non_kanji_total > 0 else 0
    
    results.append({
        'year': year,
        'total': total,
        'matched': matched,
        'n3_plus': n3_plus,
        'rate': rate,
        'match_rate': match_rate,
        'kanji_stats': {
            'total': kanji_total,
            'n3_plus': kanji_n3_plus,
            'rate': kanji_rate
        },
        'non_kanji_stats': {
            'total': non_kanji_total,
            'n3_plus': non_kanji_n3_plus,
            'rate': non_kanji_rate
        }
    })
    
    print(f"\n{year}:")
    print(f"  卒業者数: {total}人")
    print(f"    漢字圏: {kanji_total}人 (N3+: {kanji_n3_plus}人, {kanji_rate:.1f}%)")
    print(f"    非漢字: {non_kanji_total}人 (N3+: {non_kanji_n3_plus}人, {non_kanji_rate:.1f}%)")
    print(f"  全体N3+: {n3_plus}人 ({rate:.1f}%)")

# サマリー
print(f"\n{'='*60}")
print("サマリー")
print(f"{'='*60}")

total_all = sum(r['total'] for r in results)
n3_plus_all = sum(r['n3_plus'] for r in results)
matched_all = sum(r['matched'] for r in results)

print(f"全卒業者数: {total_all}人")
print(f"JLPT記録あり: {matched_all}人 ({matched_all/total_all*100:.1f}%)")
print(f"N3以上保有: {n3_plus_all}人")
print(f"全体N3以上保有率: {n3_plus_all/total_all*100:.1f}%")

# 結果をJSONで保存
output = {
    'graduation_stats': results,
    'summary': {
        'total_graduates': total_all,
        'matched_with_jlpt': matched_all,
        'n3_plus_count': n3_plus_all,
        'n3_plus_rate': n3_plus_all/total_all*100 if total_all > 0 else 0
    }
}

output_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\graduation_n3_stats.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\n結果をJSON保存: {output_path}")
