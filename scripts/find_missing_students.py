import pandas as pd
import json
import os
import glob

JSON_PATH = r"e:/デスクトップ/LMS(神戸外語)/lms-app/data/historical_students.json"
EXCEL_DIR = r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者"
TARGET_IDS = ['2104006', '2004009']

def search_in_excel():
    # 1. Get Names
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    targets = {}
    for s in data['students']:
        sid = str(s['student_id'])
        if sid in TARGET_IDS:
            targets[sid] = s
            print(f"Target: {sid}, Name: {s['name']}, Romaji: {s['name_romaji']}")

    # 2. Search in Excels
    files = glob.glob(os.path.join(EXCEL_DIR, "*.xlsx"))
    files.append(os.path.join(EXCEL_DIR, "在籍者.xlsx")) # Explicitly add if glob misses
    files = list(set(files)) # Unique

    for file_path in files:
        if not os.path.exists(file_path): continue
        print(f"Searching in {os.path.basename(file_path)}...")
        try:
            df = pd.read_excel(file_path)
            # Convert whole dataframe to string for easy search
            df_str = df.astype(str)
            
            for sid, info in targets.items():
                # Search ID
                found_id = False
                for col in df_str.columns:
                    if df_str[col].str.contains(sid).any():
                        print(f"  [FOUND ID] {sid} found in column '{col}'")
                        # Print the row content for Class
                        matched_rows = df[df_str[col].str.contains(sid)]
                        for idx, row in matched_rows.iterrows():
                            # transform row to dict and print
                            print(f"    Row data: {row.to_dict()}")
                        found_id = True
                
                # Search Name (Kanji)
                name = info['name']
                if name:
                    for col in df_str.columns:
                        if df_str[col].str.contains(name).any():
                            print(f"  [FOUND NAME] {name} found in column '{col}'")

        except Exception as e:
            print(f"  Error reading {file_path}: {e}")


if __name__ == "__main__":
    import sys
    with open('result_missing.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        search_in_excel()

