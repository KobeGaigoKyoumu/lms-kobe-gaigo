import json

with open('data/historical_students.json', 'r', encoding='utf-8') as f:
    students = json.load(f)['students']

with open('data/jlpt_historical.json', 'r', encoding='utf-8') as f:
    jlpt_records = json.load(f)['records']

# 1. Group students by enrollment year to determine graduation year
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

# 2. Get best JLPT level for each student
student_best_jlpt = {}
for r in jlpt_records:
    sid = str(r.get('studentId', ''))
    if r['result'] == '合格':
        level_num = int(r['level'].replace('N', ''))
        if level_num <= 3:
            current_best = student_best_jlpt.get(sid)
            if current_best is None or level_num < current_best:
                student_best_jlpt[sid] = level_num

# 3. Calculate stats for each cohort
print("Year | Total Students | N3+ Holders | Rate")
print("---|---|---|---")
for year in sorted(grad_cohorts.keys()):
    if year < 2018 or year > 2026: continue
    
    cohort_students = grad_cohorts[year]
    total = len(cohort_students)
    
    n3_plus_count = 0
    for s in cohort_students:
        sid = str(s['student_id'])
        if sid in student_best_jlpt and student_best_jlpt[sid] <= 3:
            n3_plus_count += 1
            
    rate = (n3_plus_count / total * 100) if total > 0 else 0
    print(f"{year}年3月卒 | {total} | {n3_plus_count} | {rate:.1f}%")
