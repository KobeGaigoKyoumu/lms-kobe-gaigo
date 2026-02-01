import json
import os
import pandas as pd
from datetime import datetime

repo_root = os.getcwd()
historical_path = os.path.join(repo_root, 'data', 'historical_students.json')
jlpt_path = os.path.join(repo_root, 'data', 'jlpt_historical.json')
output_path = os.path.join(repo_root, 'data', 'graduation_n3_stats.json')

# Load Data
with open(historical_path, 'r', encoding='utf-8') as f:
    hist_data = json.load(f)
with open(jlpt_path, 'r', encoding='utf-8') as f:
    jlpt_raw = json.load(f)

# Handle JLPT Structure (Dict with 'records' or List)
if isinstance(jlpt_raw, dict) and 'records' in jlpt_raw:
    jlpt_records = jlpt_raw['records']
elif isinstance(jlpt_raw, list):
    jlpt_records = jlpt_raw
else:
    jlpt_records = []
    print("Warning: Unknown JLPT JSON structure")

print(f"Loaded {len(jlpt_records)} JLPT records.")
jlpt_df = pd.DataFrame(jlpt_records)

# Pre-compute normalized names
jlpt_df['norm_name'] = jlpt_df['name'].astype(str).str.strip().str.replace(' ', '').str.upper()

# Define Helper to get Max JLPT Level for a student
def get_student_jlpt_level(sid, name, name_romaji):
    if jlpt_df.empty:
        return None
        
    # 1. Filter for student by ID (Ensure string comparison)
    s_records = jlpt_df[jlpt_df['studentId'].astype(str) == str(sid)]
    passed = s_records[s_records['result'] == '合格']
    
    if passed.empty:
        return None
    
    # Check levels
    levels = passed['level'].unique()
    if 'N1' in levels: return 'N1'
    if 'N2' in levels: return 'N2'
    if 'N3' in levels: return 'N3'
    if 'N4' in levels: return 'N4'
    if 'N5' in levels: return 'N5'
    return None

import sys
sys.stdout.reconfigure(encoding='utf-8')

# Define Enrollment-Based Grad Year Logic
def calculate_grad_cohort(enroll_date_str):
    if not enroll_date_str:
        return "Unknown"
    try:
        dt = pd.to_datetime(enroll_date_str)
        # Fiscal Year Calculation
        # April-Dec: Current Year
        # Jan-March: Prev Year
        fy = dt.year if dt.month >= 4 else dt.year - 1
        
        # Grad Cohort = Enroll FY + 2
        grad_year = fy + 2
        return grad_year
    except:
        return "Unknown"

# Filter Students
students = hist_data['students']
# We want to include 2 sources: 卒業生, 修了生
# But we must be careful not to include duplicates if they exist
# (Though we cleaned up duplicates or they shouldn't exist in 'students' list if IDs are unique)
# We trust the IDs are unique in 'students' list.

graduates = [s for s in students if s.get('source') in ['卒業生', '修了生']]

print(f"Total Graduates/Completed in DB: {len(graduates)}")

# Process Stats
stats_by_year = {}

for s in graduates:
    sid = s['student_id']
    enroll_date = s.get('enrollment_date')
    grad_date_str = s.get('graduation_date')
    
    # 1. Base: Calculate Cohort Year (FY + 2)
    cohort_year = calculate_grad_cohort(enroll_date)
    
    if cohort_year == "Unknown":
        continue
        
    final_grad_year = cohort_year
    
    # 2. Check for Early Graduation using actual date
    if grad_date_str and pd.notna(grad_date_str):
        try:
            dt = pd.to_datetime(grad_date_str)
            actual_year = dt.year if dt.month >= 4 else dt.year # Wait, March 2021 is 2021 bucket.
            # My current buckets are "YYYY年3月" -> Year YYYY.
            # So 2021-03-31 -> 2021.
            
            # Use actual year if it is EARLIER than cohort year
            if actual_year < cohort_year:
                final_grad_year = actual_year
            # If actual_year >= cohort_year, we stick to cohort_year 
            # (treating them as "Class of 2022" who graduated late)
        except:
             pass
             
    label = f"{final_grad_year}年3月"
    
    if label not in stats_by_year:
        stats_by_year[label] = {"total": 0, "n3_plus": 0, "students": []}
        
    stats_by_year[label]["total"] += 1
    
    # Check JLPT
    level = get_student_jlpt_level(sid)
    if level in ['N1', 'N2', 'N3']:
        stats_by_year[label]["n3_plus"] += 1
        
    stats_by_year[label]["students"].append({
        "id": sid,
        "name": s['name'],
        "nationality": s.get('nationality', 'Unknown'),
        "level": level
    })

# Output Summary
total_processed = 0
# We only care about relevant years? (e.g. 2018-2024?)
# User's chart showed 2018-2024.
# If we have 2025, 2026?
# We'll output all.

year_keys = sorted(stats_by_year.keys())
formatted_stats = {}

print("\n--- Summary ---")
for year in year_keys:
    data = stats_by_year[year]
    count = data['total']
    n3 = data['n3_plus']
    rate = (n3 / count * 100) if count > 0 else 0
    total_processed += count
    
    print(f"{year}: {count}人 (N3+: {n3}, Rate: {rate:.1f}%)")
    
    formatted_stats[year] = {
        "graduation_date": year,
        "total_graduates": count,
        "n3_pass_rate": round(rate, 2),
        "n3_or_higher": n3,
        "breakdown": [] 
    }

print(f"\nTotal Calculated Graduates: {total_processed}")

# Write to JSON
final_output = {
    "summary": {
        "total_graduates": total_processed,
        "last_updated": datetime.now().strftime("%Y-%m-%d")
    },
    "yearly_stats": formatted_stats
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_output, f, ensure_ascii=False, indent=2)
    
print(f"Saved stats to {output_path}")
