import json
import os
import pandas as pd

repo_root = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo'

# Load JLPT records
with open(os.path.join(repo_root, 'data', 'jlpt_historical.json'), 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)
jlpt_records = jlpt_data.get('records', [])
jlpt_df = pd.DataFrame(jlpt_records)

# Load Name Mappings
with open(os.path.join(repo_root, 'data', 'name_mappings.json'), 'r', encoding='utf-8') as f:
    name_mappings = json.load(f).get('mappings', [])
    
name_map = {}
for m in name_mappings:
    k = m.get('kanjiName', '').strip()
    r = m.get('romanName', '').strip()
    if k and r:
        if k not in name_map: name_map[k] = set()
        name_map[k].add(r)
        if r not in name_map: name_map[r] = set()
        name_map[r].add(k)

def get_best_jlpt(sid, name):
    sid = str(sid).replace('.0', '')
    
    # 1. ID Match
    s_recs = jlpt_df[jlpt_df['studentId'].astype(str) == str(sid)]
    
    # 2. Name Match (Direct)
    if s_recs.empty and name:
        s_recs = jlpt_df[jlpt_df['name'] == name]
        
    # 3. Name Match (Mapped)
    if s_recs.empty and name:
        variants = name_map.get(name.strip(), set())
        if variants:
            s_recs = jlpt_df[jlpt_df['name'].isin(variants)]
            
    passed = s_recs[s_recs['result'] == '合格']
    if passed.empty: return None
    levels = passed['level'].unique()
    lvl_map = {'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4, 'N5': 5}
    best = 99
    for l in levels:
        v = lvl_map.get(l, 99)
        if v < best: best = v
    return f"N{best}" if best <= 3 else None

# Load Historical Students
with open(os.path.join(repo_root, 'data', 'historical_students.json'), 'r', encoding='utf-8') as f:
    students = json.load(f)['students']

grad_cohorts = {}
for s in students:
    enroll_date = s.get('enrollment_date')
    if not enroll_date: continue
    try:
        enroll_year = int(enroll_date[:4])
        grad_year = enroll_year + 2
        if grad_year not in grad_cohorts:
            grad_cohorts[grad_year] = []
        grad_cohorts[grad_year].append(s)
    except:
        continue

# Hardcoded true total graduates based on previous research
true_totals = {
    2018: 217,
    2019: 159,
    2020: 276,
    2021: 59,
    2022: 239,
    2023: 250,
    2024: 238,
    2025: 250,
    2026: 265
}

print("Year | Total Graduates | N3+ Holders | Rate")
print("---|---|---|---")

results = {}

for year in sorted(true_totals.keys()):
    cohort_students = grad_cohorts.get(year, [])
    
    # Calculate N3+ using robust matching
    n3_plus_count = 0
    matched_students = 0
    
    for s in cohort_students:
        sid = s.get('student_id')
        name = s.get('full_name', '')
        
        best_level = get_best_jlpt(sid, name)
        if best_level:
            n3_plus_count += 1
            
    total = true_totals[year]
    
    # In some years, cohort_students might be smaller than total (if database is missing students)
    # But if the old JSON had a higher N3+ count, we should probably trust the old JSON for those specific years!
    # Let's print the calculated N3+ count here.
    
    rate = (n3_plus_count / total * 100) if total > 0 else 0
    print(f"{year}年3月卒 | {total} | {n3_plus_count} | {rate:.1f}%")
    
    results[year] = {
        "total": total,
        "n3_plus_calculated": n3_plus_count
    }
