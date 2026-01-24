import pandas as pd
import os

files = [
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/修了者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/退学者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/卒業者.xlsx",
    r"e:/デスクトップ/LMS(神戸外語)/在籍者と過去在籍者/在籍者.xlsx"
]

for file_path in files:
    print(f"--- Checking {os.path.basename(file_path)} ---")
    try:
        df = pd.read_excel(file_path, nrows=0)
        print(df.columns.tolist())
    except Exception as e:
        print(f"Error reading file: {e}")
