import json
import os

repo_root = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
historical_path = os.path.join(repo_root, 'data', 'historical_students.json')
grad_details_path = os.path.join(repo_root, 'student_grad_details.json')

with open(historical_path, 'r', encoding='utf-8') as f:
    hist_data = json.load(f)
with open(grad_details_path, 'r', encoding='utf-8') as f:
    grad_details = json.load(f)

grad_detail_ids = set(grad_details.keys())

# The 6 original "Completed" students from Step 155
completed_ids = ['1710009', '1910020', '2004007', '2004013', '2007004', '2010006']

missing_from_details = []
for cid in completed_ids:
    if cid not in grad_detail_ids:
        missing_from_details.append(cid)

print(f"Original Completed (6) missing from Details (886): {len(missing_from_details)}")
print(missing_from_details)

# If len is 2, then Details(886) + 2 = 888. 
# We just need to ensure `historical` has All 888.
# (886 IDs from Details) + (2 Missing Completed IDs).
# Check if `historical` has all 886 IDs?
# Step 228 said matching details in historical was... wait.
# Step 228: "In Details (886) but not in Historical (1185): 295".
# This implies historical DOES NOT HAVE 295 of the grad_details.
# THIS IS A PROBLEM.
# If `historical` is missing 295 students, I cannot generate stats for them from `historical`!?
# Unless `historical` has them under different IDs? Or I need to ADD them to `historical`.
# The 295 missing IDs were 29xxxx, 30xxxx.
# Step 95 `jlpt.js` logic: `29xxxx` = 2017 enrollment.
# These seem to be valid older students. 
# Why are they missing from `historical_students.json`?
# Maybe `historical` was created recently and missed old data?
# User wants 888.
# If I just use `grad_details` (886) + 2 missing = 888?
# But I need JLPT data for them. `calculate_n3_rate.py` joins `students` with `jlpt_historical`.
# `jlpt_historical` might have them.
# But I need the Student Master data (Name, Enroll Date) for the stats.
# If `historical_students.json` is missing them, I must ADD them to it.
# So I need to:
# 1. Identify the 2 missing completed IDs. (Likely 1710009 and another).
# 2. Identify the 295 IDs in `grad_details` missing from `historical`.
# 3. Add ALL of them to `historical_students.json`.
#    Name/Enroll for 295?
#    I can infer from `student_grad_details.json` (has Period, Country).
#    Name? `grad_details` DOES NOT HAVE NAMES?
#    Step 74 `student_grad_details` content: `{"1901001": {"period":..., "country":...}}`. No Name!
#    If I don't have names, I can't match JLPT by name.
#    I can match JLPT by ID.
#    Does `jlpt_historical.json` have names for these IDs?
#    Step 117 loop: `jlpt_by_sid[sid]`.
#    If I have ID, I can find JLPT.
#    But `calculate_n3_rate` output uses Name/Country stats.
#    `student_grad_details` has Country.
#    So I can add them to `historical` with `student_id`, `nationality`=(Country), `enrollment_date`=(Infer from ID).
#    `name`?
#    If `jlpt_historical` has the ID, I can fetch the name from there!
#    If not, I'll use "Unknown".

print("\nPlan Check:")
print(f"Merge 295 missing IDs + 2 Missing Completed into Historical?")
