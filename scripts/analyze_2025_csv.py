#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
2025年度のJLPT受験データをCSVファイルも含めて詳細分析し、
延べ人数とユニーク人数の差異原因を特定する
（src/lib/jlpt.js のロジックをPythonで再現）
"""
import json
import sys
import os
import glob
import re
from collections import defaultdict


sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
JLPT_HISTORICAL_PATH = os.path.join(BASE_DIR, 'data', 'jlpt_historical.json')
JLPT_RESULTS_DIR = os.path.join(BASE_DIR, 'data', 'JLPT結果')

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 1. Historical JSON読み込み
jlpt_data = load_json(JLPT_HISTORICAL_PATH)
records = jlpt_data.get('records', []) if jlpt_data else []
print(f"Historical JSON レコード数: {len(records)}")

# 2. CSVデータ読み込み (2025年度のみ対象)
# 実際のディレクトリ名は "2025年第1回" など
target_sessions_csv = ["2025年第1回", "2025年第2回"]
target_sessions_json = ["2025_1", "2025_2"] # JSONはたぶんこの形式

csv_records = []

if os.path.exists(JLPT_RESULTS_DIR):
    for session_dir in os.listdir(JLPT_RESULTS_DIR):
        # 部分一致または完全一致で対象を広げる
        if "2025" not in session_dir:
            continue
            
        full_session_path = os.path.join(JLPT_RESULTS_DIR, session_dir)
        if not os.path.isdir(full_session_path):
            continue
            
        csv_files = glob.glob(os.path.join(full_session_path, "*.csv"))
        print(f"Directory {session_dir}: found {len(csv_files)} csv files")
        
        for csv_file in csv_files:
            try:
                # エンコーディング試行
                content = None
                encodings = ['utf-8', 'shift_jis', 'cp932']
                
                for enc in encodings:
                    try:
                        with open(csv_file, 'r', encoding=enc) as f:
                            content = f.readlines()
                        break
                    except UnicodeDecodeError:
                        continue
                
                if content is None:
                    print(f"Could not decode {csv_file}")
                    continue
                
                lines = content
                
                # ヘッダスキップ
                header_skipped = False
                for line in lines:
                    line = line.strip()
                    if not line: continue
                    
                    # 簡易的なCSVパース (カンマ区切りと仮定)
                    # 実際はクオートなどを考慮すべきだが、JLPT結果データは単純なCSVが多い
                    parts = line.split(',')
                    if len(parts) < 5: continue
                    
                    # ヘッダ判定（例: 受験番号,氏名...）
                    if not header_skipped and ("受験番号" in line or "Name" in line):
                        header_skipped = True
                        continue
                        
                    # データ行
                    # 受験番号, 名前, ...
                    # カラム位置はファイルによって異なる可能性があるが、
                    # src/lib/jlpt.jsの parseLine を参考に推定
                    # ここでは単純に全カラムを表示して目視確認用とする
                    
                    # JSのロジック:
                    # 2017以降: 受験番号, 名前, 性別, 生年月日, 結果, 得点...
                    # 2025_1フォルダ内のCSV形式を確認する必要がある
                    
                    csv_records.append({
                        'session': session_dir,
                        'file': os.path.basename(csv_file),
                        'raw': line
                    })
                    
            except Exception as e:
                print(f"Error reading {csv_file}: {e}")

print(f"CSVレコード数 (2025年度): {len(csv_records)}")

# 統合データ作成
all_records = []
# Historicalから2025年度抽出
all_records.extend([r for r in records if r.get('session') in target_sessions_json])

if not csv_records:
    print("CSVファイルからデータを読み込めませんでした。")
else:
    # CSVレコードをパースして追加
    print("\n--- CSVデータサンプル (最初の5件) ---")
    for r in csv_records[:5]:
        print(f"{r['session']} [{r['file']}]: {r['raw']}")
        
    # 生データを分析用リストに追加
    for r in csv_records:
        line = r['raw']
        parts = line.split(',')
        if len(parts) >= 2:
            # 形式推定: CSVからの読み込み (受験番号, 名前...)
            # src/lib/jlpt.jsのロジック:
            # cleanParts[1]=Level, [2]=ID, [3]=Name...
            # しかしこれは shift_jis 用の parseLine の結果。
            # CSVファイルがどのようなカラム順かわからないので、
            # サンプルを見てから手動でマッピングする方が良いが、
            # とりあえず session をキーにしておく
            
            all_records.append({
                'source': 'csv',
                'session': r['session'],
                'raw': line
            })

# 統合データの分析
print(f"\n=== 2025年度統合データ分析 ===")
id_counts = defaultdict(int)
name_level_counts = defaultdict(int)
no_id_count = 0

# CSVからID抽出してチェック
print("\n--- CSVデータ内の重複チェック ---")
for r in csv_records:
    line = r['raw']
    parts = line.split(',')
    
    has_id = False
    if len(parts) >= 4:
        student_id = parts[3].strip()
        if student_id and student_id.isdigit():
            id_counts[student_id] += 1
            has_id = True
    
    if not has_id:
        no_id_count += 1
        
    # 名前+レベルでの重複チェック (IDがない場合の重複判定ロジックに近いもの)
    if len(parts) >= 5:
        # 代表者,Session,Level,ID,Name,...
        level = parts[2].strip()
        name = parts[4].strip()
        key = f"{name}|{level}"
        name_level_counts[key] += 1

print(f"IDありレコード数: {len(csv_records) - no_id_count}")
print(f"IDなしレコード数: {no_id_count}")

duplicates_id = {k: v for k, v in id_counts.items() if v > 1}
print(f"ID重複数: {len(duplicates_id)}")

duplicates_name = {k: v for k, v in name_level_counts.items() if v > 1}
print(f"名前+レベル重複数: {len(duplicates_name)}")

if duplicates_name:
    print("名前+レベル重複の例:")
    for k, v in list(duplicates_name.items())[:5]:
        print(f"  Key: {k}, Count: {v}")

combined_records = []

# CSV (簡易変換: 想定フォーマットに合わせて調整が必要)
# 実際のCSVの中身を見てから調整する方が安全なので、まずはダンプ結果を見てから判断

print(f"JSONからの抽出数: {len(combined_records)}件")

