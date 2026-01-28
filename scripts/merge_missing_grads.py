import json
import os
import pandas as pd

repo_root = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo'
historical_path = os.path.join(repo_root, 'data', 'historical_students.json')
grad_details_path = os.path.join(repo_root, 'student_grad_details.json')
jlpt_path = os.path.join(repo_root, 'data', 'jlpt_historical.json')

# Load Data
with open(historical_path, 'r', encoding='utf-8') as f:
    hist_data = json.load(f)
with open(grad_details_path, 'r', encoding='utf-8') as f:
    grad_details = json.load(f)
with open(jlpt_path, 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)

# JLPT Name Lookup
# Check structure: usually list of dicts. If list of strings (lines?), parse them.
# Based on view_file, if it's a list of objects, accessing .get is fine.
# If error was 'str' object has no attribute 'get', maybe some elements are strings?
# JLPT Name Lookup
jlpt_names = {}
records = jlpt_data.get('records', []) if isinstance(jlpt_data, dict) else jlpt_data

for entry in records:
    # entry is expected to be a dict
    if not isinstance(entry, dict):
        continue
        
    sid = str(entry.get('studentId', ''))
    name = entry.get('name')
    if sid and name:
        jlpt_names[sid] = name

# ID Set in Historical
hist_ids = set(str(s['student_id']) for s in hist_data['students'])

# Process Missing 295
added_count = 0
for sid, details in grad_details.items():
    if sid not in hist_ids:
        # Create new student entry
        prefix = int(sid[:2])
        month = int(sid[2:4])
        
        if prefix > 20: # Heisei
             year = 1988 + prefix
        else: # 20xx
             year = 2000 + prefix
             
        enroll_date = f"{year}-{month:02d}-01 00:00:00"
        
        name = jlpt_names.get(sid, "Unknown")
        country = details.get('country', 'Unknown')
        
        new_student = {
            "student_id": int(sid),
            "name": name,
            "nationality": country,
            "enrollment_date": enroll_date,
            "graduation_date": None, # Will be calc
            "status": "Graduated",
            "source": "卒業生" # Assume grad from details
        }
        
        hist_data['students'].append(new_student)
        added_count += 1
        hist_ids.add(sid) # Prevent dupes

print(f"Added {added_count} missing students from grad_details.")

# Ensure 1710009 is 'Completed'
for s in hist_data['students']:
    if str(s['student_id']) == '1710009':
        print(f"1710009: {s.get('source')} (Updating to ensures valid)")
        if s.get('source') not in ['卒業生', '修了生']:
             s['source'] = '修了生'
        break

# Save
with open(historical_path, 'w', encoding='utf-8') as f:
    json.dump(hist_data, f, ensure_ascii=False, indent=2)
    
print("Updated historical_students.json")
