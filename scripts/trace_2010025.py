import pandas as pd
import os

import glob

EXCEL_DIR = r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者"
TARGET_ID = '2010025'

def trace():
    # Recursive search in parent directory
    PARENT_DIR = r"e:/デスクトップ/LMS(神戸外語)"
    files = glob.glob(os.path.join(PARENT_DIR, "**", "*.xlsx"), recursive=True)
    # Skip temp files
    files = [f for f in files if not os.path.basename(f).startswith('~$')]
    
    print(f"Scanning {len(files)} Excel files in {PARENT_DIR}...")
    
    for file_path in files:
        # print(f"Checking {os.path.basename(file_path)}...")
        try:
            xls = pd.ExcelFile(file_path)
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                row_count = len(df)
                
                # Optimization: Skip small files if looking for row 1713? 
                # User image shows row 1713. So dataframe must have >= 1713 rows.
                # Or maybe row 1713 in Excel corresponds to ~1712 in DF.
                
                cols = df.columns.tolist()
                id_col = next((c for c in cols if '学籍番号' in c), None) or next((c for c in cols if '番号' in c and '電話' not in c), None)
                class_col = next((c for c in cols if 'クラス' in c), None)

                if id_col or class_col:
                    print(f"File: {os.path.basename(file_path)} | Sheet: {sheet_name} | Rows: {row_count}")
                
                if not id_col or not class_col:
                    continue

                for idx, row in df.iterrows():
                    curr_id = str(row[id_col]).strip() if not pd.isna(row[id_col]) else ''
                    if curr_id.endswith('.0'): curr_id = curr_id[:-2]
                    
                    if curr_id == TARGET_ID:
                        print(f"  >>> FOUND MATCH in {file_path} (Row {idx}) <<<")
                        print(f"      ID: {row[id_col]}, Class: {row[class_col]}")
        except Exception as e:
            # print(f"Error reading {file_path}: {e}")
            pass

if __name__ == "__main__":
    import sys
    with open('deep_trace.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        trace()

