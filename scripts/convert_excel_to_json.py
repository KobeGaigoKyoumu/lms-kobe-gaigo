#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
歴代受験結果データベース.xlsx から JSON ファイルを生成するスクリプト
生成したJSONは data/jlpt_historical.json に保存される
"""

import pandas as pd
import json
import os
import sys

def convert_excel_to_json():
    # パスの設定
    excel_path = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\歴代受験結果データベース.xlsx'
    output_dir = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data'
    output_path = os.path.join(output_dir, 'jlpt_historical.json')
    
    print(f"Reading Excel file: {excel_path}")
    
    # 歴代受験記録シートを読み込む
    df = pd.read_excel(excel_path, sheet_name='歴代受験記録')
    
    print(f"Loaded {len(df)} records")
    print(f"Columns: {list(df.columns)}")
    
    # 必要な列のみ抽出（列1-4は計算列なので除外）
    required_cols = ['受験回', '学籍番号', '国籍', '氏名', 'レベル', '得点', '合否']
    df = df[required_cols]
    
    # 欠損値を処理
    df = df.dropna(subset=['学籍番号', '氏名'])
    
    # 学籍番号を文字列に変換
    df['学籍番号'] = df['学籍番号'].astype(str).str.strip()
    
    # 受験回を年と回に分解 (例: "2017_1" -> year: 2017, round: 1)
    def parse_exam_session(session):
        try:
            parts = str(session).split('_')
            return {
                'year': int(parts[0]),
                'round': int(parts[1]) if len(parts) > 1 else 1
            }
        except:
            return {'year': 0, 'round': 0}
    
    # 受験回を標準形式に変換 (2017_1 -> 2017年第1回)
    def convert_session_format(session):
        parts = str(session).split('_')
        if len(parts) == 2:
            return f"{parts[0]}年第{parts[1]}回"
        return str(session)
    
    # データを変換
    records = []
    for _, row in df.iterrows():
        session = convert_session_format(row['受験回'])
        # スコアの変換（無効な値は0として扱う）
        try:
            score_val = row['得点']
            if pd.notna(score_val):
                if isinstance(score_val, (int, float)):
                    score = int(score_val)
                elif str(score_val).isdigit():
                    score = int(score_val)
                else:
                    score = 0
            else:
                score = 0
        except:
            score = 0
        
        records.append({
            'session': session,
            'studentId': str(row['学籍番号']).strip(),
            'country': str(row['国籍']).strip() if pd.notna(row['国籍']) else '',
            'name': str(row['氏名']).strip() if pd.notna(row['氏名']) else '',
            'level': str(row['レベル']).strip() if pd.notna(row['レベル']) else '',
            'score': score,
            'result': str(row['合否']).strip() if pd.notna(row['合否']) else ''
        })
    
    # 統計情報
    sessions = set(r['session'] for r in records)
    print(f"\nSession count: {len(sessions)}")
    print(f"Sessions: {sorted(sessions)}")
    print(f"Total records: {len(records)}")
    
    # JSONとして保存
    output_data = {
        'version': '1.0',
        'source': '歴代受験結果データベース.xlsx',
        'recordCount': len(records),
        'records': records
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nJSON saved to: {output_path}")
    print(f"File size: {os.path.getsize(output_path):,} bytes")
    
    # サンプルデータを表示
    print("\nSample records:")
    for r in records[:5]:
        print(f"  {r['session']} | {r['studentId']} | {r['name']} | {r['level']} | {r['score']} | {r['result']}")

if __name__ == '__main__':
    convert_excel_to_json()
