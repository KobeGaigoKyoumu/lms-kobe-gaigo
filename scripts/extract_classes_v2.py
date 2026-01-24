import pandas as pd
import os
import glob
import json

EXCEL_DIR = r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者"
OUTPUT_FILE = r"data/student_classes.json"

def extract():
    all_classes = {}
    
    files = glob.glob(os.path.join(EXCEL_DIR, "*.xlsx"))
    # Exclude temps and '在籍者.xlsx'
    files = [f for f in files if not os.path.basename(f).startswith('~$')]
    files = [f for f in files if '在籍者.xlsx' not in os.path.basename(f)]
    
    print(f"Target files: {[os.path.basename(f) for f in files]}")
    
    for file_path in files:
        print(f"Processing {os.path.basename(file_path)}...")
        try:
            xls = pd.ExcelFile(file_path)
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                cols = df.columns.tolist()
                
                # Column Detection Logic
                id_col = next((c for c in cols if '学籍番号' in c), None)
                if not id_col:
                    id_col = next((c for c in cols if '番号' in c and '電話' not in c and '郵便' not in c and '証書' not in c), None)
                
                class_col = next((c for c in cols if 'クラス' in c), None)
                
                if not id_col or not class_col:
                    continue
                    
                print(f"  Sheet '{sheet_name}': ID='{id_col}', Class='{class_col}'")
                
                count = 0
                for idx, row in df.iterrows():
                    sid = str(row[id_col]).strip() if not pd.isna(row[id_col]) else ''
                    if sid.endswith('.0'): sid = sid[:-2]
                    
                    cname = str(row[class_col]).strip() if not pd.isna(row[class_col]) else ''
                    
                    if sid and cname and cname.lower() != 'nan':
                        all_classes[sid] = cname
                        count += 1
                print(f"    Extracted {count} records")
                
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    # Write to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_classes, f, ensure_ascii=False, indent=2)
    print(f"Total extracted students: {len(all_classes)}")

if __name__ == "__main__":
    extract()
