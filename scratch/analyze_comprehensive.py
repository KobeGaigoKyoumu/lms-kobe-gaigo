import json

with open('data/jlpt_historical.json', 'r', encoding='utf-8') as f:
    jlpt_records = json.load(f)['records']

cohort_stats = {}

for r in jlpt_records:
    sid = str(r.get('studentId', '')).replace('.0', '').strip()
    if not sid or sid.startswith('UNKNOWN'): continue
    
    grad_year = None
    
    if len(sid) == 7:
        prefix = sid[:2]
        if prefix.isdigit():
            pref_int = int(prefix)
            # Heisei 29-31 = 2017-2019
            if pref_int == 29: grad_year = 2019
            elif pref_int == 30: grad_year = 2020
            elif pref_int == 31: grad_year = 2021
            elif 15 <= pref_int <= 30: # 2015 to 2030 enrollment
                grad_year = 2000 + pref_int + 2
                
    elif len(sid) == 6:
        prefix = sid[:2]
        if prefix.isdigit():
            pref_int = int(prefix)
            if pref_int == 29: grad_year = 2019 # rare 6-digit Heisei 29
            elif 15 <= pref_int <= 30: # 2015 to 2030 enrollment
                grad_year = 2000 + pref_int + 2
                
    if not grad_year: continue
    
    if grad_year not in cohort_stats:
        cohort_stats[grad_year] = {}
        
    if sid not in cohort_stats[grad_year]:
        cohort_stats[grad_year][sid] = {
            'best_level': 99
        }
        
    if r['result'] == '合格':
        level_num = int(r['level'].replace('N', ''))
        if level_num < cohort_stats[grad_year][sid]['best_level']:
            cohort_stats[grad_year][sid]['best_level'] = level_num

# Output
print("Year | Tracked Students (in JLPT) | N3+ Holders | Rate")
print("---|---|---|---")

results = {}
for year in sorted(cohort_stats.keys()):
    if year < 2018 or year > 2026: continue
    
    students = cohort_stats[year]
    tracked = len(students)
    n3_plus = sum(1 for s in students.values() if s['best_level'] <= 3)
    rate = (n3_plus / tracked * 100) if tracked > 0 else 0
    
    print(f"{year}年3月卒 | {tracked} | {n3_plus} | {rate:.1f}%")
    results[year] = {"tracked": tracked, "n3_plus": n3_plus}

