#!/usr/bin/env python
# -*- coding: utf-8 -*-
import pandas as pd
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# 追加すべき学生の情報を取得
df = pd.read_excel(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\卒業生進路一覧\2022年度入学生進路一覧.xlsx')
missing_ids = ['2104019', '2207005', '2210041']

print("欠損している学生の情報:")
for sid in missing_ids:
    row = df[df['学籍番号'].astype(str) == sid]
    if len(row) > 0:
        r = row.iloc[0]
        name = r['氏名']
        cls = r['クラス']
        status = r['卒業・退学']
        print(f'学籍番号: {sid}')
        print(f'  氏名: {name}')
        print(f'  クラス: {cls}')
        print(f'  卒業・退学: {status}')
        print()

# historical_students.jsonに追加
with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 既存の学籍番号を確認
existing_ids = set(str(s.get('student_id', '')) for s in data['students'])

students_to_add = []
for sid in missing_ids:
    if sid not in existing_ids:
        row = df[df['学籍番号'].astype(str) == sid]
        if len(row) > 0:
            r = row.iloc[0]
            name = r['氏名']
            # 名前からローマ字部分を推定（英字のみならローマ字）
            if name and all(c.isalpha() or c.isspace() for c in str(name)):
                name_romaji = str(name)
            else:
                name_romaji = ''
            
            student = {
                'student_id': sid,
                'name': str(name),
                'name_romaji': name_romaji,
                'enrollment_date': f'20{sid[:2]}-{sid[2:4]}-01 00:00:00',  # 学籍番号から推定
                'graduation_date': '2024-03-31 00:00:00',
                'nationality': '中国' if not name_romaji else 'ベトナム',  # 名前から推定
                'source': '卒業生'
            }
            students_to_add.append(student)
            print(f'追加: {sid} - {name}')

# 追加
if students_to_add:
    data['students'].extend(students_to_add)
    with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\historical_students.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'\n{len(students_to_add)}名を追加しました')
else:
    print('\n追加すべき学生はいません')
