import pandas as pd
import os

import glob

EXCEL_DIR = r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者"
TARGET_ID = '2010025'

def trace():
    files = glob.glob(os.path.join(EXCEL_DIR, "*.xlsx"))
    # Skip temp files
    files = [f for f in files if not os.path.basename(f).startswith('~$')]
    
    for file_path in files:
        print(f"Checking {os.path.basename(file_path)}...")
        try:
            xls = pd.ExcelFile(file_path)
            # print("Sheets:", xls.sheet_names)
            
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                cols = df.columns.tolist()
                
                # Logic from extract_classes.py
                id_col = next((c for c in cols if '学籍番号' in c), None)
                if not id_col:
                    id_col = next((c for c in cols if '番号' in c and '電話' not in c), None)
                
                class_col = next((c for c in cols if 'クラス' in c), None)
                
                if not id_col or not class_col:
                    continue

                for idx, row in df.iterrows():
                    curr_id = str(row[id_col]).strip() if not pd.isna(row[id_col]) else ''
                    if curr_id.endswith('.0'): curr_id = curr_id[:-2]
                    
                    if curr_id == TARGET_ID:
                        print(f"FOUND in {os.path.basename(file_path)} | {sheet_name} | Row {idx}:")
                        print(f"  ID Value: {row[id_col]}")
                        print(f"  Class Value: {row[class_col]}")
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    import sys
    with open('trace_output.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        trace()

