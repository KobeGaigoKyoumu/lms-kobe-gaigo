#!/usr/bin/env python3
"""
JLPT統計PDFデータ抽出スクリプト
国際交流基金が公開するJLPT試験結果PDFから統計データを抽出してJSONに保存する
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

try:
    import pdfplumber
except ImportError:
    print("pdfplumberがインストールされていません。以下のコマンドでインストールしてください:")
    print("pip install pdfplumber")
    exit(1)


def parse_number(text):
    """テキストから数値を抽出（カンマ区切りにも対応）"""
    if not text:
        return None
    # 最初の数値を抽出（カッコ内の前年比較データは無視）
    text = text.split('\n')[0]  # 改行前の部分のみ
    text = text.replace(',', '')
    match = re.search(r'(\d+)', text)
    if match:
        return int(match.group(1))
    return None


def parse_rate(text):
    """テキストからパーセンテージを抽出"""
    if not text:
        return None
    # 最初のパーセンテージを抽出
    match = re.search(r'(\d+\.?\d*)%', text)
    if match:
        return float(match.group(1))
    return None


def extract_jlpt_stats_from_pdf(pdf_path):
    """
    PDFファイルからJLPT統計データを抽出する
    """
    # ファイル名から年度と回を抽出 (例: 2024_1_2.pdf -> 2024年第1回)
    filename = os.path.basename(pdf_path)
    match = re.match(r'(\d{4})_(\d)_(\d)', filename)
    
    if not match:
        return None
    
    year = int(match.group(1))
    session = int(match.group(2))  # 1 = 7月, 2 = 12月
    file_type = int(match.group(3))  # 2 or 5
    
    # タイプ5は別の統計なのでスキップ（タイプ2が基本統計）
    if file_type != 2:
        return None
    
    result = {
        "year": year,
        "session": session,
        "session_name": f"{year}年{'7月' if session == 1 else '12月'}",
        "japan": {},
        "overseas": {},
        "total": {}
    }
    
    levels = ['N1', 'N2', 'N3', 'N4', 'N5']
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                
                for table in tables:
                    if not table or len(table) < 5:
                        continue
                    
                    # ヘッダー行を探す
                    header_row = None
                    for i, row in enumerate(table):
                        if row and 'N1' in str(row) and 'N2' in str(row):
                            header_row = i
                            break
                    
                    if header_row is None:
                        continue
                    
                    # レベルのインデックスを特定
                    header = table[header_row]
                    level_indices = {}
                    for i, cell in enumerate(header):
                        if cell:
                            for level in levels:
                                if level in str(cell):
                                    level_indices[level] = i
                    
                    if not level_indices:
                        continue
                    
                    # 各行を解析
                    current_region = None
                    for row in table[header_row + 1:]:
                        if not row:
                            continue
                        
                        row_text = ' '.join([str(cell) if cell else '' for cell in row])
                        
                        # 地域を判定
                        if 'Japan' in row_text or '国内' in row_text:
                            current_region = 'japan'
                        elif 'Overseas' in row_text or '海外' in row_text:
                            current_region = 'overseas'
                        elif 'Total' in row_text or '合計' in row_text:
                            current_region = 'total'
                        
                        if current_region is None:
                            continue
                        
                        # 合格率の行を検出
                        if 'certified' in row_text.lower() or 'Percentage' in row_text or '%' in row_text:
                            for level, idx in level_indices.items():
                                if idx < len(row) and row[idx]:
                                    rate = parse_rate(str(row[idx]))
                                    if rate is not None:
                                        if level not in result[current_region]:
                                            result[current_region][level] = {}
                                        result[current_region][level]['pass_rate'] = rate
                        
                        # 受験者数の行を検出
                        elif 'examinees' in row_text.lower() or '受験者' in row_text:
                            for level, idx in level_indices.items():
                                if idx < len(row) and row[idx]:
                                    num = parse_number(str(row[idx]))
                                    if num is not None:
                                        if level not in result[current_region]:
                                            result[current_region][level] = {}
                                        result[current_region][level]['examinees'] = num
                        
                        # 合格者数の行を検出
                        elif ('certified' in row_text.lower() or '認定' in row_text) and 'Percentage' not in row_text and '%' not in row_text:
                            for level, idx in level_indices.items():
                                if idx < len(row) and row[idx]:
                                    num = parse_number(str(row[idx]))
                                    if num is not None:
                                        if level not in result[current_region]:
                                            result[current_region][level] = {}
                                        result[current_region][level]['certified'] = num
                                        
    except Exception as e:
        result["error"] = str(e)
    
    return result


def extract_all_pdfs(pdf_dir, output_path):
    """
    指定ディレクトリ内の全PDFからデータを抽出してJSONに保存
    """
    pdf_dir = Path(pdf_dir)
    all_data = {
        "source": "国際交流基金 JLPT公式統計",
        "description": "日本語能力試験の全国統計データ（日本国内・海外）",
        "extracted_at": datetime.now().isoformat(),
        "sessions": []
    }
    
    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_file in pdf_files:
        print(f"Processing: {pdf_file.name}")
        data = extract_jlpt_stats_from_pdf(pdf_file)
        if data:  # タイプ2のファイルのみ追加
            all_data["sessions"].append(data)
            print(f"  -> Extracted: {data.get('session_name', 'Unknown')}")
    
    # JSONに保存
    output_path = Path(output_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nData saved to: {output_path}")
    print(f"Total sessions extracted: {len(all_data['sessions'])}")
    
    return all_data


def analyze_pdf_structure(pdf_path):
    """
    PDFの構造を詳細に分析する（デバッグ用）
    """
    print(f"\n=== Analyzing: {pdf_path} ===")
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"\n--- Page {i+1} ---")
            
            # テキスト
            text = page.extract_text()
            if text:
                print("Text content:")
                print(text[:1000])  # 最初の1000文字
                
            # テーブル
            tables = page.extract_tables()
            if tables:
                print(f"\nFound {len(tables)} tables:")
                for j, table in enumerate(tables):
                    print(f"\nTable {j+1}:")
                    for row in table[:10]:  # 最初の10行
                        print(row)


if __name__ == "__main__":
    import sys
    
    # デフォルトのパス設定
    pdf_dir = r"c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\JLPT統計"
    output_path = r"c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_national_stats.json"
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--analyze":
            # 単一PDFの構造分析
            if len(sys.argv) > 2:
                analyze_pdf_structure(sys.argv[2])
            else:
                # 最初のPDFを分析
                pdf_files = list(Path(pdf_dir).glob("*.pdf"))
                if pdf_files:
                    analyze_pdf_structure(pdf_files[0])
        else:
            pdf_dir = sys.argv[1]
    
    if len(sys.argv) <= 1 or sys.argv[1] != "--analyze":
        # 全PDFを抽出
        extract_all_pdfs(pdf_dir, output_path)
