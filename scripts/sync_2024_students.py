
import pandas as pd
import json
import os
from datetime import datetime

# Paths
xlsx_path = r'e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/在籍者.xlsx'
json_path = r'e:/デスクトップ/LMS(神戸外語)/lms-app/data/historical_students.json'

def excel_date_to_str(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        # Excel serial date (approximate if not using exact offset, but pandas usually handles it)
        # However, read_excel usually converts to datetime if format is correct
        return str(val)
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d 00:00:00')
    if isinstance(val, str):
        return val
    return str(val)

def run():
    print("Loading Excel data...")
    df = pd.read_excel(xlsx_path)
    
    # Map columns
    # ['Unnamed: 0', '番号', '学籍番号', '氏名', 'フリガナ', '性別', '生年月日', '国籍', '入日期', 
    #  '在留期限', '在留カード番号', '郵便番号', '住所', '連絡先', '備考', '期', '現クラス', 
    #  '入学年月日', '卒業年月', 'コース']
    
    print("Loading existing JSON data...")
    with open(json_path, 'r', encoding='utf-8') as f:
        hist_data = json.load(f)
    
    existing_ids = {str(s['student_id']) for s in hist_data['students']}
    
    # Filter for 2024 entrants
    df['学籍番号'] = df['学籍番号'].astype(str)
    new_students_df = df[df['学籍番号'].str.startswith('24')]
    
    print(f"Found {len(new_students_df)} students with ID '24xxxx'")
    
    # Helper to get value
    def get_val(row, target):
        for col in df.columns:
            if target in str(col):
                return row[col]
        return None

    added_count = 0
    for _, row in new_students_df.iterrows():
        sid = str(row.get('学籍番号', '')).strip()
        if not sid or sid == 'nan':
            # Try finding ID col if exact match fails
            for col in df.columns:
                if '学籍番号' in str(col) or 'ID' in str(col):
                    sid = str(row[col]).strip()
                    break
        
        if sid in existing_ids:
            continue
            
        new_student = {
            "student_id": sid,
            "name": str(get_val(row, '氏名')).strip(),
            "name_romaji": "", 
            "enrollment_date": excel_date_to_str(get_val(row, '入学年月日')),
            "graduation_date": excel_date_to_str(get_val(row, '卒業年月')),
            "nationality": str(get_val(row, '国籍')).strip(),
            "source": "在籍生"
        }

        hist_data['students'].append(new_student)
        existing_ids.add(sid)
        added_count += 1
    
    print(f"Added {added_count} new students to JSON.")
    
    if added_count > 0:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(hist_data, f, ensure_ascii=False, indent=2)
        print("Updated historical_students.json")
    else:
        print("No new students to add.")

if __name__ == "__main__":
    run()
