import json

with open('data/jlpt_historical.json', 'r', encoding='utf-8') as f:
    jlpt_records = json.load(f)['records']

cohort_stats = {}

for r in jlpt_records:
    sid = str(r.get('studentId', '')).replace('.0', '')
    if not sid or len(sid) < 6: continue
    
    prefix = sid[:2]
    if not prefix.isdigit(): continue
    
    enroll_year = 2000 + int(prefix)
    grad_year = enroll_year + 2
    
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
print("Year | Tracked Students (in JLPT) | N3+ Holders")
print("---|---|---")

results = {}
for year in sorted(cohort_stats.keys()):
    if year < 2018 or year > 2026: continue
    
    students = cohort_stats[year]
    tracked = len(students)
    n3_plus = sum(1 for s in students.values() if s['best_level'] <= 3)
    
    print(f"{year}年3月卒 | {tracked} | {n3_plus}")
    results[year] = {"tracked": tracked, "n3_plus": n3_plus}

with open('scratch/tracked_jlpt.json', 'w') as f:
    json.dump(results, f, indent=2)
