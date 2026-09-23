"""
Extract the remaining no-title AppModal (Match/Event Detail popup) from Schedules.jsx.
"""
import re, os

SCHEDULES_PATH = 'frontend/src/pages/coordinator/Schedules.jsx'
MODALS_DIR = 'frontend/src/components/schedule/modals'
COMPONENT_NAME = 'MatchDetailModal'

content = open(SCHEDULES_PATH, encoding='utf-8').read()
blocks = re.findall(r'<AppModal[\s\S]*?</AppModal>', content)
modal_jsx = blocks[0]  # last remaining one
print(f'Modal size: {len(modal_jsx)} chars')

# Heuristic prop detection
candidates = set()
for m in re.finditer(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', modal_jsx):
    candidates.add(m.group(1))
for m in re.finditer(r'=\{([a-zA-Z_][a-zA-Z0-9_]*)[\}\.]', modal_jsx):
    candidates.add(m.group(1))
for m in re.finditer(r'=>\s*([a-zA-Z_][a-zA-Z0-9_]*)\(', modal_jsx):
    candidates.add(m.group(1))
for m in re.finditer(r'\b(set[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
    candidates.add(m.group(1))
for m in re.finditer(r'\b(handle[A-Z][a-zA-Z0-9_]*|format[A-Z][a-zA-Z0-9_]*|get[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
    candidates.add(m.group(1))

skip = {
    'true', 'false', 'null', 'undefined', 'console', 'Math', 'Date',
    'Set', 'Map', 'Array', 'String', 'Number', 'Boolean', 'Object', 'JSON',
    'parseInt', 'parseFloat', 'isNaN', 'window', 'document', 'React',
    'AppModal', 'AlertTriangle', 'CheckCircle2', 'Info', 'MapPin',
    'forEach', 'map', 'filter', 'length', 'toString', 'split', 'join', 'trim', 'slice',
}
props = sorted(candidates - skip)
print(f'Props ({len(props)}): {props}')

# Write component
lucide_import = 'import { AlertTriangle, Info, MapPin } from "lucide-react";'
props_str = ',\n  '.join(props)
component_content = f"""import React from 'react';
import AppModal from "../../../components/common/AppModal";
{lucide_import}

export default function {COMPONENT_NAME}({{
  {props_str}
}}) {{
  return (
    {modal_jsx}
  );
}}
"""
out_path = os.path.join(MODALS_DIR, f'{COMPONENT_NAME}.jsx')
open(out_path, 'w', encoding='utf-8').write(component_content)
print(f'Written to {out_path}')

# Build replacement tag
props_tag = ' '.join([f'{p}={{{p}}}' for p in props])
replacement = f'<{COMPONENT_NAME} {props_tag} />'

# Replace in Schedules.jsx and add import
new_content = content.replace(modal_jsx, replacement, 1)
import_line = f'import {COMPONENT_NAME} from "../../components/schedule/modals/{COMPONENT_NAME}";'
new_content = new_content.replace(
    'import ScheduleIssueModal from "../../components/schedule/modals/ScheduleIssueModal";',
    f'import {COMPONENT_NAME} from "../../components/schedule/modals/{COMPONENT_NAME}";\nimport ScheduleIssueModal from "../../components/schedule/modals/ScheduleIssueModal";',
    1
)
open(SCHEDULES_PATH, 'w', encoding='utf-8').write(new_content)
print('Schedules.jsx updated.')
