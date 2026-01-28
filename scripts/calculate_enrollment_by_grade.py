#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
既存の在籍者総数と卒業生データを組み合わせて学年別在籍者数を推定
"""
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# 既存の在籍者データ（元々の総数を保持）
ORIGINAL_ENROLLMENT = {
    "2017": 337,
    "2018": 446,
    "2019": 372,
    "2020": 342,
    "2021": 349,
    "2022": 421,
    "2023": 565,
    "2024": 654,
    "2025": 734
}

# 卒業生データから入学年度を解析
with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

students = data['students']

def parse_enrollment_year(student_id):
    """学籍番号から入学年度を解析"""
    if not student_id:
        return None
    sid = str(student_id).strip()
    
    if len(sid) == 7:
        prefix = sid[:2]
        
        # 平成年度形式
        if prefix == '29':
            return 2017
        elif prefix == '30':
            return 2018
        elif prefix == '31':
            return 2019
        # 西暦年度形式
        elif prefix.isdigit():
            year_short = int(prefix)
            if 19 <= year_short <= 30:
                return 2000 + year_short
    
    if len(sid) == 6:
        prefix = sid[:2]
        if prefix == '28':
            return 2016
        elif prefix == '29':
            return 2017
        elif prefix == '17':
            return 2017
    
    return None

# 入学年度別の卒業生数を計算
graduates_by_enrollment_year = defaultdict(int)

for s in students:
    if s.get('source') not in ['卒業生', '修了生']:
        continue
    
    student_id = s.get('student_id', '')
    enroll_year = parse_enrollment_year(student_id)
    
    if enroll_year:
        graduates_by_enrollment_year[enroll_year] += 1

print('=== 入学年度別 卒業生数 ===')
for year in sorted(graduates_by_enrollment_year.keys()):
    print(f'{year}年入学: {graduates_by_enrollment_year[year]}人')

# 各年度の1年生と2年生を計算
# X年度入学者 = X年度の1年生 = X+1年度の2年生
# 在籍者総数 = 1年生 + 2年生

enrollment_stats = {}

for year_str, total in ORIGINAL_ENROLLMENT.items():
    year = int(year_str)
    
    # X年度の1年生 = X年度入学者
    first_year = graduates_by_enrollment_year.get(year, 0)
    # X年度の2年生 = X-1年度入学者
    second_year = graduates_by_enrollment_year.get(year - 1, 0)
    
    # 総数が既知の場合、差分を調整（現在在籍中の学生を考慮）
    calculated_total = first_year + second_year
    
    # 実際の総数との差分を計算
    if calculated_total < total:
        # 卒業生以外の在籍者がいる（現在の1年生など）
        # 推定: 差分を1年生として扱う（最近の年度ほど1年生が多い傾向）
        if year >= 2023:
            # 2023年以降は1年生データが不完全なので推定
            first_year = total - second_year
    
    enrollment_stats[year_str] = {
        'total': total,
        'first_year': first_year,
        'second_year': second_year,
        'note': '卒業生データ+既存在籍データより推定'
    }
    
    print(f'{year}年: 合計 {total}人 (1年生: {first_year}人, 2年生: {second_year}人)')

# JSONとして保存
output_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\enrollment_stats.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(enrollment_stats, f, ensure_ascii=False, indent=2)

print(f'\n結果を保存: {output_path}')
