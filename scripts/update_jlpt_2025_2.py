# -*- coding: utf-8 -*-
import json
import csv
import os
import sys
import re

# Paths
BASE_DIR = r"e:/デスクトップ/LMS(神戸外語)/lms-app"
CSV_PATH = r"e:/デスクトップ/LMS(神戸外語)/JLPT結果/2025年第2回/SCORE_20260130174113.csv"
DATA_DIR = os.path.join(BASE_DIR, "data")
JLPT_JSON_PATH = os.path.join(DATA_DIR, "jlpt_historical.json")
STUDENTS_JSON_PATH = os.path.join(DATA_DIR, "historical_students.json")
MAPPINGS_JSON_PATH = os.path.join(DATA_DIR, "name_mappings.json")

SESSION_NAME = "2025年第2回"

sys.stdout.reconfigure(encoding='utf-8')

def normalize_name(name):
    if not name: return ""
    # Normalize spaces: remove extra, strip
    name = re.sub(r'\s+', ' ', name).strip()
    return name.upper()

def parse_fraction(val):
    """ '25/60' -> 25 """
    if not val: return 0
    match = re.search(r'(\d+)', str(val))
    if match:
        return int(match.group(1))
    return 0

def load_json(path):
    if not os.path.exists(path):
        print(f"Warning: {path} not found.")
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    print("Loading master data...")
    students_data = load_json(STUDENTS_JSON_PATH)
    mappings_data = load_json(MAPPINGS_JSON_PATH)
    
    # Build student lookup maps
    # Key: Normalized Name -> List of Records
    name_map = {}
    
    # Load historical students
    count_s = 0
    for s in students_data.get('students', []):
        sid = s.get('student_id')
        nm = normalize_name(s.get('name'))
        nr = normalize_name(s.get('name_romaji'))
        
        if nm:
            if nm not in name_map: name_map[nm] = []
            name_map[nm].append(s)
        if nr and nr != nm:
            if nr not in name_map: name_map[nr] = []
            name_map[nr].append(s)
        count_s += 1
            
    # Load custom mappings
    for m in mappings_data.get('mappings', []):
        sid = m.get('studentId')
        kn = normalize_name(m.get('kanjiName'))
        rn = normalize_name(m.get('romanName'))
        
        # We need to link this back to a student record if possible, or create a mock one
        # Ideally, look up student by ID first from historical data
        # But here we just want to map Name -> ID
        
        # Add to name map (create dummy student obj for ID lookup)
        dummy_s = {'student_id': sid, 'nationality': 'Unknown'} 
        
        if kn:
            if kn not in name_map: name_map[kn] = []
            name_map[kn].append(dummy_s)
        if rn:
            if rn not in name_map: name_map[rn] = []
            name_map[rn].append(dummy_s)

    print(f"Loaded {count_s} students. Name map size: {len(name_map)}")

    print(f"Reading CSV: {CSV_PATH}")
    new_records = []
    
    # CSV Column Indices (based on inspection)
    # 2: Level, 4: Name, 5: Country, 8: Result, 9: Total Score
    # 11: Section1 Name, 12: Section1 Score ...
    
    try:
        with open(CSV_PATH, 'r', encoding='cp932') as f:
            reader = csv.reader(f)
            header = next(reader) # skip header
            
            for row in reader:
                if len(row) < 10: continue
                
                raw_level = row[2].strip()
                raw_name = row[4].strip()
                raw_country = row[5].strip()
                raw_result = row[8].strip()
                raw_score = row[9].strip()
                
                # Sections
                # Sec1: 11,12 (Vocab/Grammar/LangKnowledge)
                # Sec2: 13,14 (Reading)
                # Sec3: 15,16 (Listening)
                section_scores = {}
                
                # Helper to map section name to key
                def map_section(name):
                    if '言語知識' in name: return 'vocab' # Often combined
                    if '文字' in name or '語彙' in name: return 'vocab'
                    if '読解' in name: return 'reading'
                    if '聴解' in name: return 'listening'
                    return None

                for i in [11, 13, 15]:
                    if i < len(row) and row[i]:
                        sec_name = row[i]
                        sec_sc = parse_fraction(row[i+1])
                        key = map_section(sec_name)
                        if key:
                            section_scores[key] = sec_sc

                # Find Student ID
                norm_name = normalize_name(raw_name)
                candidates = name_map.get(norm_name, [])
                
                student_id = None
                
                if len(candidates) == 1:
                    student_id = candidates[0]['student_id']
                elif len(candidates) > 1:
                    # Filter by country if possible
                    same_country = [c for c in candidates if c.get('nationality') == raw_country]
                    if len(same_country) == 1:
                        student_id = same_country[0]['student_id']
                    else:
                        print(f"Ambiguous name: {raw_name} ({raw_country}). Candidates: {[c['student_id'] for c in candidates]}")
                        # Fallback: Pick the first or leave None? 
                        # For safely, maybe pick the latest ID (numerically largest often implies newer)?
                        # Or checking enrollment dates. Too complex for now.
                        # We'll take the first match as best effort.
                        student_id = candidates[0]['student_id']
                else:
                    print(f"Student not found: {raw_name} ({raw_country})")
                    # If not found, we can't really add to historical json effectively without ID.
                    # But maybe we should add with ID=null or generated?
                    # Current system likely expects valid IDs.
                    # Let's keep it but mark ID as null or specific placeholder?
                    # Actually, for statistics, ID is important for grouping but Name is also used.
                    pass

                if not student_id:
                    # Try to use existing logic in front-end?
                    # The historical json usually has IDs.
                    # If we skip, we lose data.
                    # Let's use name as ID if really needed? No, that breaks schema.
                    # Let's look for "学籍番号" in col 3? The inspection said "受験番号" at col 3.
                    pass

                # Create Record
                rec = {
                    "session": SESSION_NAME,
                    "studentId": student_id if student_id else f"UNKNOWN_{hash(raw_name)}", 
                    "country": raw_country,
                    "name": raw_name,
                    "level": raw_level,
                    "score": parse_fraction(raw_score),
                    "result": raw_result,
                    # Optional: adding section scores if needed, though schema might not support it yet.
                    # We will add it; JSON is flexible.
                    "sectionScores": section_scores
                }
                new_records.append(rec)
                
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        return

    print(f"Parsed {len(new_records)} records.")
    
    # Update JSON
    jlpt_data = load_json(JLPT_JSON_PATH)
    if not jlpt_data:
        jlpt_data = {"version": "1.0", "source": "User Upload CSV", "recordCount": 0, "records": []}
        
    old_records = jlpt_data.get('records', [])
    print(f"Existing records: {len(old_records)}")
    
    # Remove existing 2025_2 records to avoid duplicates (replace mode)
    filtered_records = [r for r in old_records if r.get('session') != SESSION_NAME]
    print(f"Records after removing {SESSION_NAME}: {len(filtered_records)}")
    
    final_records = filtered_records + new_records
    jlpt_data['records'] = final_records
    jlpt_data['recordCount'] = len(final_records)
    
    # Backup
    import shutil
    backup_path = JLPT_JSON_PATH + ".bak"
    if os.path.exists(JLPT_JSON_PATH):
        shutil.copy2(JLPT_JSON_PATH, backup_path)
        print(f"Backup created at {backup_path}")
        
    with open(JLPT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(jlpt_data, f, ensure_ascii=False, indent=2)
        
    print("Done! JLPT data updated.")

if __name__ == '__main__':
    main()
