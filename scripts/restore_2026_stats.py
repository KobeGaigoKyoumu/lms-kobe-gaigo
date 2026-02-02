
import json
import os

repo_root = os.getcwd()
stats_path = os.path.join(repo_root, 'data', 'graduation_n3_stats.json')

# The "previous" stats for 2026 (from reverted state)
stats_2026_prev = {
    "year": "2026年3月",
    "graduation_date": "2026年3月",
    "total_graduates": 238,
    "total": 238,
    "matched": 129,
    "n3_plus": 49,
    "n3_or_higher": 49,
    "rate": 20.588235294117645,
    "matched_with_jlpt": 129,
    "match_rate": 0,
    "kanji_stats": {
        "total": 13,
        "n3_plus": 2,
        "rate": 15.384615384615385
    },
    "non_kanji_stats": {
        "total": 225,
        "n3_plus": 47,
        "rate": 20.88888888888889
    },
    "n3_pass_rate": 20.59
}

with open(stats_path, 'r', encoding='utf-8') as f:
    current_json = json.load(f)
    
grad_stats_list = current_json.get('graduation_stats', [])

# Find and update 2026 entry
found = False
for i, entry in enumerate(grad_stats_list):
    if entry['year'] == '2026年3月':
        grad_stats_list[i] = stats_2026_prev
        found = True
        print("Restored 2026 Stats to previous values.")
        break

if not found:
    print("2026 entry not found, appending...")
    grad_stats_list.append(stats_2026_prev)

current_json['graduation_stats'] = grad_stats_list

with open(stats_path, 'w', encoding='utf-8') as f:
    json.dump(current_json, f, ensure_ascii=False, indent=2)
    
print("Saved stats.")
