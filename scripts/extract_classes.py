import pandas as pd
import json
import os
import re

# Source files
FILES = [
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/修了者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/退学者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/卒業者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/在籍者.xlsx"
]

OUTPUT_JSON = r"e:/デスクトップ/LMS(神戸外語)/lms-app/data/student_classes.json"

def clean_student_id(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    # Extract only digits, maybe leading/trailing usage
    # Based on previous knowledge, IDs are numeric strings
    # Ensure it looks like a student ID (e.g., 6 or 7 digits)
    if re.match(r'^\d+$', s):
        return s
    return None

def extract_classes():
    mapping = {}
    
    for file_path in FILES:
        if not os.path.exists(file_path):
            print(f"Skipping missing file: {file_path}")
            continue
            
        print(f"Processing {os.path.basename(file_path)}...")
        try:
            df = pd.read_excel(file_path)
            
            # Identify columns
            cols = df.columns.tolist()
            
            # Prioritize '学籍番号'
            id_col = next((c for c in cols if '学籍番号' in c), None)
            if not id_col:
                # Fallback to '番号'
                id_col = next((c for c in cols if '番号' in c and '電話' not in c and '郵便' not in c and '証書' not in c), None)
            
            class_col = next((c for c in cols if 'クラス' in c), None)

            
            if not id_col or not class_col:
                print(f"  Warning: Could not find ID or Class column in {file_path}. ID: {id_col}, Class: {class_col}")
                continue
                
            print(f"  Using ID: '{id_col}', Class: '{class_col}'")
            
            count = 0
            for _, row in df.iterrows():
                sid = clean_student_id(row[id_col])
                cls = str(row[class_col]).strip() if not pd.isna(row[class_col]) else None
                
                if sid and cls and cls != 'nan' and cls != '-':
                    mapping[sid] = cls
                    count += 1
            print(f"  Extracted {count} records.")
            
        except Exception as e:
            print(f"  Error processing {file_path}: {e}")

    # Save to JSON
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    
    print(f"Total unique students with class data: {len(mapping)}")
    print(f"Saved to {OUTPUT_JSON}")

if __name__ == "__main__":
    extract_classes()
