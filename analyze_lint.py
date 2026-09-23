import json, re, sys, os

lint_file = sys.argv[1] if len(sys.argv) > 1 else 'lint_output.json'

try:
    data = json.loads(open(f'frontend/{lint_file}', encoding='utf-16').read())
except Exception:
    data = json.loads(open(f'frontend/{lint_file}', encoding='utf-8').read())

for file_report in data:
    fpath = file_report['filePath']
    # Trim to readable path
    for prefix in ['omnisport-ai\\frontend\\', 'omnisport-ai/frontend/']:
        if prefix in fpath:
            fpath = fpath.split(prefix)[1]
    errors = [m for m in file_report['messages'] if m['severity'] == 2]
    warnings = [m for m in file_report['messages'] if m['severity'] == 1]
    if errors or warnings:
        print(f"\n=== {fpath} ===")
        error_types = {}
        for m in errors:
            rule = m.get('ruleId', 'parse-error')
            error_types.setdefault(rule, []).append(m['message'])
        for rule, msgs in error_types.items():
            print(f"  [{rule}] x{len(msgs)}: {msgs[0][:100]}")
        if warnings:
            print(f"  [warnings] x{len(warnings)}")
