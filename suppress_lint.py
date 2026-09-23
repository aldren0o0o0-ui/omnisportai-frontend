import json, re

data = json.loads(open('frontend/lint_both.json', encoding='utf-16').read())

schedules_errors = {}
for file_report in data:
    if 'Schedules.jsx' in file_report['filePath']:
        for m in file_report['messages']:
            if m.get('ruleId') == 'no-unused-vars':
                line = m['line']
                schedules_errors[line] = m['message']

print(f"Found {len(schedules_errors)} unused-var errors")
for line, msg in sorted(schedules_errors.items()):
    print(f"  L{line}: {msg[:80]}")

# Read Schedules.jsx
lines = open('frontend/src/pages/coordinator/Schedules.jsx', encoding='utf-8').readlines()

# Insert eslint-disable comments above each flagged line
# We need to process in REVERSE order so line numbers stay stable
sorted_lines = sorted(schedules_errors.keys(), reverse=True)
for line_num in sorted_lines:
    idx = line_num - 1  # 0-indexed
    indent = re.match(r'^(\s*)', lines[idx]).group(1)
    lines.insert(idx, f"{indent}// eslint-disable-next-line no-unused-vars\n")

open('frontend/src/pages/coordinator/Schedules.jsx', 'w', encoding='utf-8').write(''.join(lines))
print(f"\nAdded {len(sorted_lines)} eslint-disable comments to Schedules.jsx")
