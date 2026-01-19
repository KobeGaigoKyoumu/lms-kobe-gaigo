#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Check Chinese student names in historical data"""

import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\神戸外語03\Desktop\lms-kobe-gaigo-repo\data\jlpt_historical.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Sample of Chinese students
chinese = [r for r in data['records'] if r['country'] == '中国'][:30]
print(f"Chinese students (sample of {len(chinese)}):")
for r in chinese:
    print(f"  {r['studentId']} | {r['name']}")

# Check for patterns - some might have romanized names
print("\n\nLooking for romanized names (all caps):")
romanized = [r for r in data['records'] if r['country'] == '中国' and r['name'].isupper()][:10]
for r in romanized:
    print(f"  {r['studentId']} | {r['name']}")

print("\n\nLooking for kanji names (mixed case or contains kanji):")
kanji = [r for r in data['records'] if r['country'] == '中国' and not r['name'].isupper()][:10]
for r in kanji:
    print(f"  {r['studentId']} | {r['name']}")
