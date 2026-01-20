#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
学籍番号と受験回から入学年度を分析
"""

import pandas as pd
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\歴代受験結果データベース.xlsx'
history = pd.read_excel(excel_path, sheet_name='歴代受験記録')

print("=" * 60)
print("学籍番号と受験回の相関分析")
print("=" * 60)

# 学籍番号パターンと最初の受験回を分析
student_first_exam = {}
for _, row in history.iterrows():
    sid = str(row['学籍番号'])
    session = row['受験回']
    if sid not in student_first_exam:
        student_first_exam[sid] = session
    else:
        # 最も早い受験回を記録
        if session < student_first_exam[sid]:
            student_first_exam[sid] = session

# 学籍番号のパターンごとに最初の受験回を分析
print("\n学籍番号パターンと最初の受験回:")
patterns = defaultdict(list)

for sid, first_exam in student_first_exam.items():
    if len(sid) == 6:
        pattern = sid[:2] + "xxxx"
    else:
        pattern = sid[:2] + "xxxxx"
    patterns[pattern].append((sid, first_exam))

for pattern in sorted(patterns.keys()):
    exams = [e[1] for e in patterns[pattern]]
    exam_dist = defaultdict(int)
    for e in exams:
        exam_dist[e] += 1
    print(f"\n{pattern} ({len(patterns[pattern])}人):")
    for exam in sorted(exam_dist.keys()):
        print(f"  {exam}: {exam_dist[exam]}人")

print("\n" + "=" * 60)
print("入学年度の推定ロジック")
print("=" * 60)

# 推定ロジック:
# - 2017_1に初受験 → 2016年4月または2016年10月入学（1年目夏試験）
# - 2017_2に初受験 → 2016年10月または2017年4月入学
# - 学籍番号28xxxx → 2016年入学
# - 学籍番号29xxxxx → 2017年入学
# - 学籍番号30xxxxx → 2018年入学
# - 学籍番号19xxxxx → 2017年入学（19は平成29年？）
# - 学籍番号16xxxxx → 2016年入学
# - 学籍番号20xxxxx → 2018年入学（20は平成30年または2020年？）

print("\n旧フォーマットの学籍番号と入学年度の対応:")
old_patterns = {
    '28xxxx': '2016年入学（推定）',
    '29xxxxx': '2017年入学（推定、先頭29=平成29年？）',
    '30xxxxx': '2018年入学（推定、先頭30=平成30年？）',
    '31xxxxx': '2019年入学（推定、先頭31=平成31年/令和元年？）',
    '16xxxxx': '2016年入学（推定、先頭16=2016年？）',
    '19xxxxx': '2017年入学（推定、先頭19=2019年だが受験回2017なので2017年入学）',
}

for pattern, meaning in old_patterns.items():
    if pattern.endswith('xxxx'):
        matching = [sid for sid in student_first_exam.keys() if len(sid) == 6 and sid.startswith(pattern[:2])]
    else:
        matching = [sid for sid in student_first_exam.keys() if len(sid) == 7 and sid.startswith(pattern[:2])]
    if matching:
        first_exams = [student_first_exam[s] for s in matching]
        print(f"\n{pattern}: {meaning}")
        print(f"  学生数: {len(matching)}")
        print(f"  最初の受験回: {sorted(set(first_exams))}")

print("\n" + "=" * 60)
print("受験回から卒業年度を推定")
print("=" * 60)

# 2年制学校で、試験は7月（第1回）と12月（第2回）
# 通常、1年目の夏（7月）か冬（12月）に初受験
# 卒業は3月

# 受験回と入学年度の対応表作成
exam_to_enrollment = {}
for year in range(2016, 2026):
    # その年の4月入学の場合
    # 夏（第1回）受験は同年7月
    # 冬（第2回）受験は同年12月
    exam_to_enrollment[f"{year}_1"] = year  # 7月受験 → その年入学
    exam_to_enrollment[f"{year}_2"] = year  # 12月受験 → その年または前年入学

print("\n受験回と想定入学年度:")
for exam, enroll in sorted(exam_to_enrollment.items()):
    print(f"  {exam}: {enroll}年入学が初受験の可能性あり")

print("\n" + "=" * 60)
print("最終的な入学年度推定")
print("=" * 60)

# 学籍番号のパターンから入学年度を推定する関数
def estimate_enrollment_year(student_id, first_exam_session=None):
    sid = str(student_id)
    
    # 7桁の新フォーマット（2019年以降で使用開始と推定）
    if len(sid) == 7:
        prefix = sid[:2]
        
        # 2019年以降のフォーマット: YYMMXXX
        if prefix in ['19', '20', '21', '22', '23', '24', '25']:
            return 2000 + int(prefix)
        
        # 旧フォーマット: 先頭が元号（平成29=29, 平成30=30, 平成31=31）
        if prefix == '29':  # 平成29年 = 2017年
            return 2017
        if prefix == '30':  # 平成30年 = 2018年
            return 2018
        if prefix == '31':  # 平成31年/令和元年 = 2019年
            return 2019
        if prefix == '16':  # 2016年
            return 2016
    
    # 6桁の旧フォーマット（2017年以前）
    if len(sid) == 6:
        prefix = sid[:2]
        # 28 → 2016年入学（最初の受験が2017年なので）
        if prefix == '28':
            return 2016
        if prefix == '29':
            return 2017
    
    # フォールバック: 受験回から推定
    if first_exam_session:
        year = int(first_exam_session.split('_')[0])
        round_num = int(first_exam_session.split('_')[1])
        # 第1回（7月）受験 → 同年4月入学または前年10月入学
        # 第2回（12月）受験 → 同年4月入学または同年10月入学
        return year if round_num == 2 else year
    
    return None

# テスト
test_cases = [
    ('280430', '2017_1'),
    ('2904035', '2017_1'),
    ('3004051', '2018_1'),
    ('1604004', '2017_1'),
    ('1904035', '2019_1'),
    ('2304001', '2023_1'),
    ('2404006', '2024_1'),
]

print("\n推定のテスト:")
for sid, first_exam in test_cases:
    year = estimate_enrollment_year(sid, first_exam)
    grad_year = year + 2 if year else None
    print(f"  {sid} (初受験: {first_exam}) → {year}年入学 → {grad_year}年3月卒")

# 全学生の入学年度を推定
enrollment_estimates = {}
for sid, first_exam in student_first_exam.items():
    year = estimate_enrollment_year(sid, first_exam)
    if year:
        enrollment_estimates[sid] = {
            'enrollment_year': year,
            'graduation_year': year + 2,
            'first_exam': first_exam
        }

# 卒業年度別の集計
grad_year_counts = defaultdict(int)
for sid, info in enrollment_estimates.items():
    grad_year_counts[info['graduation_year']] += 1

print("\n卒業年度別の学生数:")
for year in sorted(grad_year_counts.keys()):
    print(f"  {year}年3月卒: {grad_year_counts[year]}人")
