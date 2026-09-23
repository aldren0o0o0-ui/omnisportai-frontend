"""
Extract all AppModal blocks from Teams.jsx into standalone components.
Run from the project root: backend\venv\Scripts\python.exe frontend\extract_teams_modals.py
"""
import re
import os

TEAMS_PATH = 'frontend/src/pages/coordinator/Teams.jsx'
MODALS_DIR = 'frontend/src/components/teams/modals'

MODAL_MAP = [
    # (title_fragment, component_name, lucide_icons_list)
    ('Archive Team?',                               'ArchiveTeamModal',         []),
    ('Intramural-aware view for roster',            'TeamProfileModal',         ['AlertTriangle', 'CheckCircle2', 'Info']),
    ('Remove from roster?',                         'RemoveFromRosterModal',    []),
    ('Player Details',                              'PlayerDetailsModal',       []),
    ('Application Details',                         'ApplicationDetailsModal',  ['AlertTriangle', 'Info', 'CheckCircle2']),
]

LUCIDE_ALL = ['AlertTriangle', 'CheckCircle2', 'Info', 'MapPin']

os.makedirs(MODALS_DIR, exist_ok=True)

def find_undefined_vars(modal_jsx):
    candidates = set()
    for m in re.finditer(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', modal_jsx):
        candidates.add(m.group(1))
    for m in re.finditer(r'=\{([a-zA-Z_][a-zA-Z0-9_]*)[\}\.]', modal_jsx):
        candidates.add(m.group(1))
    for m in re.finditer(r'=>\s*([a-zA-Z_][a-zA-Z0-9_]*)\(', modal_jsx):
        candidates.add(m.group(1))
    for m in re.finditer(r'\b(set[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
        candidates.add(m.group(1))
    for m in re.finditer(r'\b(handle[A-Z][a-zA-Z0-9_]*|format[A-Z][a-zA-Z0-9_]*|get[A-Z][a-zA-Z0-9_]*|build[A-Z][a-zA-Z0-9_]*|render[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
        candidates.add(m.group(1))

    skip = {
        'true', 'false', 'null', 'undefined', 'console', 'Math', 'Date', 'Set', 'Map',
        'Array', 'String', 'Number', 'Boolean', 'Object', 'JSON', 'parseInt', 'parseFloat',
        'isNaN', 'window', 'document', 'React', 'AppModal',
        'AlertTriangle', 'CheckCircle2', 'Info', 'MapPin',
        'TeamLogo', 'PlayerAvatar', 'UserProfileDrawer',
        'StatusBadge', 'CollapsibleFilterPanel',
        'forEach', 'map', 'filter', 'length', 'toString', 'split', 'join', 'trim', 'slice',
        'includes', 'find', 'some', 'every', 'reduce', 'keys', 'values', 'entries',
    }
    return sorted(candidates - skip)

def write_component(name, modal_jsx, props, lucide_icons):
    lucide_str = ', '.join(sorted(set(lucide_icons) & set(LUCIDE_ALL)))
    lucide_import = f'import {{ {lucide_str} }} from "lucide-react";\n' if lucide_str else ''
    
    extra_imports = ''
    # Detect component refs in modal JSX
    if 'TeamLogo' in modal_jsx or 'PlayerAvatar' in modal_jsx:
        extra_imports += 'import { TeamLogo, PlayerAvatar } from "../../../components/common/IdentityImage";\n'
    if 'StatusBadge' in modal_jsx:
        extra_imports += 'import StatusBadge from "../../../components/common/StatusBadge";\n'
    if 'UserProfileDrawer' in modal_jsx:
        extra_imports += 'import UserProfileDrawer from "../../user_management/UserProfileDrawer";\n'

    props_str = ',\n  '.join(props) if props else ''
    out = f'''import React from 'react';
import AppModal from "../../../components/common/AppModal";
{lucide_import}{extra_imports}
export default function {name}({{
  {props_str}
}}) {{
  return (
    {modal_jsx}
  );
}}
'''
    out_path = os.path.join(MODALS_DIR, f'{name}.jsx')
    open(out_path, 'w', encoding='utf-8').write(out)
    return out_path


def main():
    content = open(TEAMS_PATH, encoding='utf-8').read()
    replacements = []
    created = []

    for (title_frag, name, lucide_icons) in MODAL_MAP:
        blocks = re.findall(r'<AppModal[\s\S]*?</AppModal>', content)
        modal_jsx = None
        for b in blocks:
            if title_frag in b:
                modal_jsx = b
                break
        if modal_jsx is None:
            print(f'  [SKIP] {name}: not found')
            continue
        
        props = find_undefined_vars(modal_jsx)
        out_path = write_component(name, modal_jsx, props, lucide_icons)
        created.append((name, out_path))
        print(f'  [OK] {name} ({len(modal_jsx)} chars, {len(props)} props) -> {out_path}')

        props_tag = ' '.join([f'{p}={{{p}}}' for p in props])
        replacement = f'<{name} {props_tag} />'
        replacements.append((modal_jsx, replacement))

    # Apply replacements
    new_content = content
    for original, replacement in replacements:
        new_content = new_content.replace(original, replacement, 1)

    # Add imports
    import_lines = '\n'.join([
        f'import {n} from "../../components/teams/modals/{n}";'
        for n, _ in created
    ])
    # Insert after AppModal import
    new_content = new_content.replace(
        'import AppModal from "../../components/common/AppModal";',
        f'import AppModal from "../../components/common/AppModal";\n{import_lines}',
        1
    )

    open(TEAMS_PATH, 'w', encoding='utf-8').write(new_content)
    print(f'\nDone! {len(created)} modal(s) extracted. Teams.jsx updated.')


if __name__ == '__main__':
    main()
