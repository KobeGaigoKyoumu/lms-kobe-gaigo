
import pandas as pd
import json
import os
import glob
import sys
import datetime

sys.stdout.reconfigure(encoding='utf-8')

repo_root = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo'
excel_dir = r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo\卒業生進路一覧'
jlpt_path = os.path.join(repo_root, 'data', 'jlpt_historical.json')
output_path = os.path.join(repo_root, 'data', 'graduation_n3_stats.json')
hist_path = os.path.join(repo_root, 'data', 'historical_students.json')

# Load JLPT
with open(jlpt_path, 'r', encoding='utf-8') as f:
    jlpt_data = json.load(f)
records = jlpt_data.get('records', []) if isinstance(jlpt_data, dict) else jlpt_data
jlpt_df = pd.DataFrame(records)

# Load Historical to get Nationality (and Grad Date if needed)
with open(hist_path, 'r', encoding='utf-8') as f:
    hist_list = json.load(f)['students']
student_info = {str(s['student_id']): s for s in hist_list}

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

KANJI_COUNTRIES = ['中国', '台湾', '香港']

# Mappings
# File Year (Enroll) -> Output Label (Grad Year)
# 2017 -> 2019年3月
# 2018 -> 2020年3月
# 2019 -> 2021年3月
# (Gap 2022年3月 = 0)
# 2020 -> 2023年3月
# 2021 -> (Missing file, maybe 0? or merged?) -> User table 45 is 2023. 2022 is 0. 
# Wait, user table skips 2022.
# 2017 -> 2019 (159)
# 2018 -> 2020 (139)
# 2019 -> 2021 (57)
# 2020 -> 2023 (45)  <-- Mapping 2020 file here
# 2022 -> 2024 (238)
# 2023 -> 2025 (250)

file_map = {
    '2017年度入学生進路一覧.xlsx': '2019年3月',
    '2018年度入学生進路一覧.xlsx': '2020年3月',
    '2019年度入学生進路一覧.xlsx': '2021年3月',
    '2020年度入学生進路一覧.xlsx': '2023年3月',
    '2022年度入学生進路一覧.xlsx': '2024年3月',
    '2023年度入学生進路一覧.xlsx': '2025年3月'
}

# Add explicit 2022 entry with 0?
# stats dict init
stats = {}
all_years = sorted(file_map.values()) + ['2022年3月']
for y in all_years:
    stats[y] = {
        "graduation_date": y,
        "total_graduates": 0,
        "n3_pass_rate": 0.0,
        "n3_or_higher": 0,
        "kanji_stats": {"total": 0, "n3_plus": 0, "rate": 0.0},
        "non_kanji_stats": {"total": 0, "n3_plus": 0, "rate": 0.0},
        "breakdown": []
    }

total_all = 0

for fname, target_label in file_map.items():
    fpath = os.path.join(excel_dir, fname)
    if not os.path.exists(fpath): continue
    
    print(f"Processing {fname} -> {target_label}")
    df = pd.read_excel(fpath)
    
    for idx, row in df.iterrows():
        status = str(row['卒業・退学']) if pd.notna(row['卒業・退学']) else ''
        course = str(row['進路区分']) if pd.notna(row['進路区分']) else ''
        dest = str(row['進学先']) if pd.notna(row['進学先']) else ''
        sid = str(row['学籍番号']).replace('.0','')
        name = row['氏名']
        
        # Filtering Logic
        include = False
        if '卒業' in status or '延長' in status:
            include = True
        elif '修了' in status:
             # Include Univ/Grad School (inc Research check handled implicitly by exclusion logic below)
             if course in ['大学', '大学院']:
                 include = True
        
        # Global Exclusion: Vocational via Comp (e.g. Yoyogi)
        if '修了' in status and course == '専門学校':
            include = False
            
        # File-Specific Exclusions to match Official Table
        
        # 2017 File (2019 Grads): 160 -> 159 (Exclude Family-Comp)
        if '2017' in fname:
            if '家族滞在' in course or '家族滞在' in dest:
                 include = False
                 
        # 2020 File (2023 Grads): 48 -> 45 (Exclude Family, Return, Vocational-Comp handled above)
        if '2020' in fname:
             if '家族滞在' in course or '家族滞在' in dest:
                 include = False
             if '帰国予定' in course or '帰国予定' in dest:
                 include = False
                 
        # 2018 (2020 Grads) and 2019 (2021 Grads) include Family/Return (verified by diagnosis)
        
        # 2022 File (2024 Grads): 239 -> 238 (Exclude Yoyogi/Vocational-Comp handled above)
        # If any Yoyogi slipped through:
        if '代々木' in dest:
            include = False
            
        if not include:
            continue
            
        # Valid Graduate
        stats[target_label]["total_graduates"] += 1
        total_all += 1
        
        # Nationality
        info = student_info.get(sid, {})
        nat = info.get('nationality', 'Unknown')
        is_kanji = nat in KANJI_COUNTRIES
        
        # JLPT
        lvl = get_best_jlpt(sid, name)
        has_n3 = lvl is not None
        
        # Add to stats
        s_data = stats[target_label]
        if is_kanji:
             s_data["kanji_stats"]["total"] += 1
             if has_n3: s_data["kanji_stats"]["n3_plus"] += 1
        else:
             s_data["non_kanji_stats"]["total"] += 1
             if has_n3: s_data["non_kanji_stats"]["n3_plus"] += 1
             
        if has_n3:
            s_data["n3_or_higher"] += 1

# Calc Rates
for k, v in stats.items():
    tot = v["total_graduates"]
    n3 = v["n3_or_higher"]
    v["n3_pass_rate"] = round(n3 / tot * 100, 1) if tot > 0 else 0
    
    kt = v["kanji_stats"]["total"]
    kn = v["kanji_stats"]["n3_plus"]
    v["kanji_stats"]["rate"] = round(kn / kt * 100, 1) if kt > 0 else 0
    
    nkt = v["non_kanji_stats"]["total"]
    nkn = v["non_kanji_stats"]["n3_plus"]
    v["non_kanji_stats"]["rate"] = round(nkn / nkt * 100, 1) if nkt > 0 else 0
    
    print(f"{k}: {tot} graduates. N3 Rate: {v['n3_pass_rate']}%")

# Save
final_out = {
    "summary": {
        "total_graduates": total_all,
        "last_updated": datetime.datetime.now().strftime("%Y-%m-%d")
    },
    "yearly_stats": stats
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_out, f, ensure_ascii=False, indent=2)

print(f"Total: {total_all}")
