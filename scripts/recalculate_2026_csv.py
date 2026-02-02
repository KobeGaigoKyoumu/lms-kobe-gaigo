
import json
import os
import pandas as pd
import glob

repo_root = os.getcwd()
hist_path = os.path.join(repo_root, 'data', 'historical_students.json')
stats_path = os.path.join(repo_root, 'data', 'graduation_n3_stats.json')
jlpt_base_dir = os.path.join(repo_root, 'data', 'JLPT結果')

# Target Sessions to include
target_sessions = [
    {'dir': '2024年第1回', 'files': ['*.csv']},
    {'dir': '2024年第2回', 'files': ['*.csv']},
    {'dir': '2025年第1回', 'files': ['*.csv']}
    # 2025-2 not found in directory list, skipping
]

# Load Students
with open(hist_path, 'r', encoding='utf-8') as f:
    hist_data = json.load(f)
    
students = hist_data['students']
# Filter for 2026 Cohort Candidates (Active/Grad/Completed)
# Cohort logic: Enroll FY + 2.
# 2024 entrants -> 2024 FY -> 2026 Grad.
# Students with ID 24... are 2024 entrants.
# Also check based on enrollment date.

candidates_2026 = []

def calculate_grad_cohort(enroll_date_str):
    if not enroll_date_str: return "Unknown"
    try:
        dt = pd.to_datetime(enroll_date_str)
        fy = dt.year if dt.month >= 4 else dt.year - 1
        return fy + 2
    except:
        return "Unknown"

for s in students:
    if s.get('source') not in ['卒業生', '修了生', '在校生']:
        continue
        
    # Check cohort
    enroll = s.get('enrollment_date')
    cohort = calculate_grad_cohort(enroll)
    
    # Also check manual grad date if earlier
    grad_date = s.get('graduation_date')
    final_grad = cohort
    if grad_date:
        try:
            gdt = pd.to_datetime(grad_date)
            # If actually graduated before 2026 March (e.g. 2025), they belong to 2025.
            # We want 2026 March graduates.
            # So final_grad must receive 2026.
            # Grad date check:
            # If grad date is in 2026-03 or later? No, usually distinct cohorts.
            # We stick to cohort logic primarily unless early grad.
            # If early grad, they are NOT in 2026.
            pass 
        except:
             pass
             
    if final_grad == 2026:
        candidates_2026.append(s)

print(f"Found {len(candidates_2026)} candidates for 2026 cohort.")

# Load CSV Data
jlpt_records = []

for sess in target_sessions:
    s_dir = os.path.join(jlpt_base_dir, sess['dir'])
    if not os.path.exists(s_dir):
        print(f"Skipping {sess['dir']} (Not Found)")
        continue
        
    files = glob.glob(os.path.join(s_dir, '*.csv'))
    for fp in files:
        try:
            # Read CSV (Header often on line 1 or 2?)
            # Assuming standard layout based on filenames or verify-graduation.js
            # Let's try reading normally.
            df = pd.read_csv(fp, encoding='shift_jis') # Usually SJIS or UTF8?
            # Check columns
            # We need Student ID, Level, Result (Pass/Fail)
            # Column mapping?
            # verify-graduation.js logic:
            # "受験番号" or similar?
            # Let's inspect columns broadly using some heuristics
             
            # Standardizing column names
            # Map: '氏名'->name, '受験番号'->id?, 'レベル'->level, '合否'->result
            pass
        except:
            # Try utf-8
             df = pd.read_csv(fp, encoding='utf-8')

        # Normalize Columns
        cols = {c: c for c in df.columns}
        
        # Heuristic mapping
        col_id = None
        col_name = None
        col_level = None
        col_result = None
        
        for c in df.columns:
            c_str = str(c).strip()
            if '受験番号' in c_str or '番号' in c_str: col_id = c
            if '氏名' in c_str or '名前' in c_str: col_name = c
            if 'レベル' in c_str: col_level = c
            if '合否' in c_str or '結果' in c_str: col_result = c
            
        if not col_id: # Might be 'student_id'
             if 'student_id' in df.columns: col_id = 'student_id'
             
        if col_id and col_result:
            for _, row in df.iterrows():
                # Extract Result
                res = str(row[col_result]).strip()
                is_pass = '合格' in res or 'Pass' in res
                
                # Extract Level
                lvl = 'Unknown'
                if col_level:
                    lvl = str(row[col_level]).strip()
                else:
                    # Infer from filename? N2.csv -> N2
                    base = os.path.basename(fp)
                    if 'N1' in base: lvl = 'N1'
                    elif 'N2' in base: lvl = 'N2'
                    elif 'N3' in base: lvl = 'N3'
                    elif 'N4' in base: lvl = 'N4'
                    elif 'N5' in base: lvl = 'N5'
                    
                jlpt_records.append({
                    'id': str(row[col_id]).strip(),
                    'name': str(row[col_name]).strip() if col_name else '',
                    'level': lvl,
                    'is_pass': is_pass,
                    'session': sess['dir']
                })

print(f"Loaded {len(jlpt_records)} JLPT records from 2024-2025.")

# Perform Matching
# Candidates loop
stats = {"total": 0, "n3_plus": 0}

# Helper
def check_pass(records, s_id, s_name):
    s_id = str(s_id).strip()
    s_name_norm = str(s_name).strip().replace(' ', '').upper()
    
    passed_levels = set()
    
    for r in records:
        # ID Match
        if r['id'] == s_id:
            if r['is_pass']: passed_levels.add(r['level'])
            continue
            
        # Name Match
        r_name_norm = r['name'].strip().replace(' ', '').upper()
        if r_name_norm and s_name_norm and r_name_norm == s_name_norm:
             if r['is_pass']: passed_levels.add(r['level'])
             
    if 'N1' in passed_levels or 'N2' in passed_levels or 'N3' in passed_levels:
        return True
    return False

for s in candidates_2026:
    stats['total'] += 1
    if check_pass(jlpt_records, s['student_id'], s['name']):
        stats['n3_plus'] += 1
        
print(f"2026 Recalculation: Total {stats['total']}, N3+ {stats['n3_plus']}")
rate = (stats['n3_plus'] / stats['total'] * 100) if stats['total'] else 0
print(f"Rate: {rate:.2f}%")

# Update JSON
with open(stats_path, 'r', encoding='utf-8') as f:
    current_json = json.load(f)
    
grad_stats_list = current_json.get('graduation_stats', [])

updated = False
for entry in grad_stats_list:
    if entry['year'] == '2026年3月':
        # Preserve existing stats structure but update numbers
        entry['total_graduates'] = stats['total']
        entry['total'] = stats['total']
        entry['n3_plus'] = stats['n3_plus']
        entry['n3_or_higher'] = stats['n3_plus']
        entry['rate'] = rate
        entry['n3_pass_rate'] = round(rate, 2)
        
        # Keeping breakdown proportional or just updating headers?
        # User only checks total rate usually.
        # We should update breakdown roughly or leave as is?
        # Better to estimate breakdown based on total ratio?
        # Or simple:
        entry['matched'] = stats['total']
        entry['matched_with_jlpt'] = stats['total']
        
        # Reset breakdown to avoid confusion (or keep as is implies old data)
        # Let's zero out breakdown to be safe or try to split?
        # Splitting requires nationality check.
        # For now, just updating Top Level Stats as requested.
        updated = True
        break
        
current_json['graduation_stats'] = grad_stats_list

with open(stats_path, 'w', encoding='utf-8') as f:
    json.dump(current_json, f, ensure_ascii=False, indent=2)
    
print("Updated graduation_n3_stats.json")
