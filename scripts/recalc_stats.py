
import json
import os
import pandas as pd
from datetime import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Current Environment Paths
repo_root = r"e:/デスクトップ/LMS(神戸外語)/lms-app"
historical_path = os.path.join(repo_root, 'data', 'historical_students.json')
jlpt_path = os.path.join(repo_root, 'data', 'jlpt_historical.json')
output_path = os.path.join(repo_root, 'data', 'graduation_n3_stats.json')

print(f"Reading from: {jlpt_path}")
print(f"Writing to: {output_path}")

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

# Define Helper to get Max JLPT Level for a student
def get_student_jlpt_level(sid):
    if jlpt_df.empty:
        return None
        
    # Filter for student (Ensure string comparison)
    # Both 'studentId' and 'id' might be used in records, currently 'studentId' is standard
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
    
    # 2. Check for Early Graduation or explicit date
    if grad_date_str and pd.notna(grad_date_str):
        try:
            dt = pd.to_datetime(grad_date_str)
            # March graduation belongs to that year. April graduation belongs to next fiscal?
            # Typically graduation is March.
            # 2021-03-31 -> 2021 class.
            actual_year = dt.year
            
            # Use actual year if available and logical
            final_grad_year = actual_year
        except:
             pass
             
    label = f"{final_grad_year}年3月"
    
    if label not in stats_by_year:
        stats_by_year[label] = {
            "graduation_date": label,
            "total_graduates": 0,
            "total": 0,  # Legacy field
            "matched": 0, # Legacy field
            "n3_plus": 0, 
            "n3_or_higher": 0, # New field support
            "rate": 0, # Legacy field
            "matched_with_jlpt": 0,
            "match_rate": 0, # Legacy field
            "kanji_stats": {"total": 0, "n3_plus": 0, "rate": 0},
            "non_kanji_stats": {"total": 0, "n3_plus": 0, "rate": 0},
            "students": []
        }
    
    # Check Kanji Name (Simple check: China/Taiwan/HK)
    nationality = s.get('nationality', 'Unknown')
    is_kanji = nationality in ['中国', '台湾', '香港']
    
    data = stats_by_year[label]
    data["total_graduates"] += 1
    data["total"] += 1 # Legacy
    
    if is_kanji:
        data["kanji_stats"]["total"] += 1
    else:
        data["non_kanji_stats"]["total"] += 1

    # Check JLPT
    level = get_student_jlpt_level(sid)
    has_jlpt_record = not jlpt_df[jlpt_df['studentId'].astype(str) == str(sid)].empty
    
    if has_jlpt_record:
        data["matched_with_jlpt"] += 1
        data["matched"] += 1 # Legacy

    if level in ['N1', 'N2', 'N3']:
        data["n3_plus"] += 1
        data["n3_or_higher"] = data["n3_plus"] # New field name support
        if is_kanji:
            data["kanji_stats"]["n3_plus"] += 1
        else:
            data["non_kanji_stats"]["n3_plus"] += 1
        
    # data["students"].append({
    #     "id": sid,
    #     "name": s['name'],
    #     "nationality": nationality,
    #     "level": level
    # })

# Output Summary
total_processed = 0
year_keys = sorted(stats_by_year.keys())
formatted_stats = []

print("\n--- Summary ---")
for year in year_keys:
    data = stats_by_year[year]
    count = data['total_graduates']
    n3 = data['n3_plus']
    rate = (n3 / count * 100) if count > 0 else 0
    data['n3_pass_rate'] = round(rate, 2)
    data['rate'] = rate # Legacy
    
    # Kanji rates
    kt = data["kanji_stats"]["total"]
    kn = data["kanji_stats"]["n3_plus"]
    data["kanji_stats"]["rate"] = (kn / kt * 100) if kt > 0 else 0
    
    # Non-kanji rates
    nkt = data["non_kanji_stats"]["total"]
    nkn = data["non_kanji_stats"]["n3_plus"]
    data["non_kanji_stats"]["rate"] = (nkn / nkt * 100) if nkt > 0 else 0
    
    total_processed += count
    
    print(f"{year}: {count}人 (N3+: {n3}, Rate: {rate:.1f}%)")
    
    # Clean up fields for JSON output (legacy + v2 compatibility)
    # Remove large students list if not needed or keep? The original file didn't seem to have students list.
    if 'students' in data:
        del data['students']
    
    formatted_stats.append(data)

print(f"\nTotal Graduates: {total_processed}")

# Write to JSON (Keep structure of original file)
# The original file structure from view_file was:
# { "graduation_stats": [...], "summary": {...} }

final_output = {
    "graduation_stats": formatted_stats,
    "summary": {
        "total_graduates": total_processed,
        "n3_plus_count": sum(d['n3_plus'] for d in formatted_stats),
        "n3_plus_rate": (sum(d['n3_plus'] for d in formatted_stats) / total_processed * 100) if total_processed > 0 else 0
    }
}

# Backup
import shutil
if os.path.exists(output_path):
    shutil.copy2(output_path, output_path + ".bak")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_output, f, ensure_ascii=False, indent=2)
    
print(f"Saved stats to {output_path}")
