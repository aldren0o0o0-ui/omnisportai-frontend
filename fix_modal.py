import json
import re

data = json.loads(open('frontend/lint_output.json', encoding='utf-16').read())
missing_vars = set()
for msg in data[0]['messages']:
    if msg['ruleId'] == 'no-undef':
        missing_vars.add(msg['message'].split("'")[1])

final_props = list(missing_vars)
print('Props:', final_props)

schedules = open('frontend/src/pages/coordinator/Schedules.jsx', encoding='utf-8').read()
new_props = ' '.join([f"{v}={{{v}}}" for v in final_props])
schedules = re.sub(r'<PreflightModal[^>]*>', f'<PreflightModal {new_props} />', schedules)
open('frontend/src/pages/coordinator/Schedules.jsx', 'w', encoding='utf-8').write(schedules)

modal = open('frontend/src/components/schedule/modals/PreflightModal.jsx', encoding='utf-8').read()
new_sig = f"export default function PreflightModal({{\n  " + ",\n  ".join(final_props) + "\n}})"
modal = re.sub(r'export default function PreflightModal\(\{\s*[^}]*\}\)', new_sig, modal)
open('frontend/src/components/schedule/modals/PreflightModal.jsx', 'w', encoding='utf-8').write(modal)
print('Fixed files successfully.')
