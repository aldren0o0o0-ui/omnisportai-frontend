"""
Extract all remaining AppModal blocks from Schedules.jsx into standalone components.
Run from the project root: backend\venv\Scripts\python.exe frontend\extract_all_modals.py
"""
import re
import os

SCHEDULES_PATH = 'frontend/src/pages/coordinator/Schedules.jsx'
MODALS_DIR = 'frontend/src/components/schedule/modals'

# Map of modal title → component name (for titles) / open-prop → component name (for no-title)
MODAL_MAP = [
    # (match_key, component_name, imports_needed)
    ('Schedule Issue Drawer',           'ScheduleIssueModal',       ['AlertTriangle']),
    ('Venue Profiles',                  'VenueProfilesModal',       ['MapPin']),
    ('(no title)',                      'MatchDetailModal',          ['AlertTriangle', 'Info', 'MapPin']),
    ('How schedule generation works',   'GenerationHelpModal',      ['Info']),
    ('Regenerate schedule?',            'RegenerateConfirmModal',    ['AlertTriangle']),
    ('Generate Partial Schedule?',      'PartialScheduleModal',     ['AlertTriangle']),
    ('Move this match to a valid',      'EditScheduleModal',        ['AlertTriangle', 'MapPin']),
    ('Manage Program Blocks',           'ProgramBlockModal',        ['AlertTriangle', 'Info', 'CheckCircle2']),
]

LUCIDE_ALL = ['AlertTriangle', 'CheckCircle2', 'Info', 'MapPin']

def extract_modal_block(content, title_fragment):
    """Find and return an AppModal block matching the title fragment."""
    # Find all AppModal blocks
    blocks = re.findall(r'<AppModal[\s\S]*?</AppModal>', content)
    for block in blocks:
        if title_fragment in block:
            return block
    return None

def find_undefined_vars_simple(modal_jsx, component_name):
    """
    Quick heuristic: find all {identifier} or identifier= patterns in JSX
    that look like state references. Returns a set of variable names.
    """
    # Match {varName} or {varName.something} or varName={varName}
    candidates = set()
    
    # JSX expression containers: {someVar}
    for m in re.finditer(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', modal_jsx):
        candidates.add(m.group(1))
    
    # JSX attribute values: prop={someVar}
    for m in re.finditer(r'=\{([a-zA-Z_][a-zA-Z0-9_]*)[\}\.]', modal_jsx):
        candidates.add(m.group(1))
    
    # Arrow function args and handlers: () => someFunc(
    for m in re.finditer(r'=>\s*([a-zA-Z_][a-zA-Z0-9_]*)\(', modal_jsx):
        candidates.add(m.group(1))
    
    # set* calls: setState pattern
    for m in re.finditer(r'\b(set[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
        candidates.add(m.group(1))

    # handle* and other common prefixes
    for m in re.finditer(r'\b(handle[A-Z][a-zA-Z0-9_]*|format[A-Z][a-zA-Z0-9_]*|get[A-Z][a-zA-Z0-9_]*|build[A-Z][a-zA-Z0-9_]*)\b', modal_jsx):
        candidates.add(m.group(1))
    
    # filter out known globals and React builtins
    skip = {
        'true', 'false', 'null', 'undefined', 'console', 'Math', 'Date', 'Set',
        'Map', 'Array', 'String', 'Number', 'Boolean', 'Object', 'JSON',
        'parseInt', 'parseFloat', 'isNaN', 'setTimeout', 'clearTimeout',
        'window', 'document', 'React', 'AppModal',
        # Lucide icons
        'AlertTriangle', 'CheckCircle2', 'Info', 'MapPin',
        # common keywords that match patterns
        'getTime', 'getDate', 'getMonth', 'getFullYear',
        'forEach', 'map', 'filter', 'reduce', 'find', 'some', 'every',
        'length', 'toString', 'valueOf', 'split', 'join', 'trim', 'slice',
    }
    candidates -= skip
    return sorted(candidates)

def write_modal_component(component_name, modal_jsx, props, lucide_imports):
    """Write a standalone modal component file."""
    lucide_str = ', '.join(sorted(set(lucide_imports) & set(LUCIDE_ALL)))
    lucide_import = f'import {{ {lucide_str} }} from "lucide-react";\n' if lucide_str else ''
    
    props_str = ',\n  '.join(props) if props else ''
    
    content = f'''import React from 'react';
import AppModal from "../../../components/common/AppModal";
{lucide_import}
export default function {component_name}({{
  {props_str}
}}) {{
  return (
    {modal_jsx}
  );
}}
'''
    out_path = os.path.join(MODALS_DIR, f'{component_name}.jsx')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return out_path


def main():
    content = open(SCHEDULES_PATH, encoding='utf-8').read()
    
    replacements = []  # list of (original_block, replacement_tag)
    created_files = []

    all_modal_blocks = re.findall(r'<AppModal[\s\S]*?</AppModal>', content)
    
    # Already-extracted PreflightModal is gone; remaining modals:
    for idx, (title_frag, component_name, lucide_icons) in enumerate(MODAL_MAP):
        modal_jsx = extract_modal_block(content, title_frag)
        if modal_jsx is None:
            print(f'  [SKIP] Could not find modal: {title_frag}')
            continue
        
        props = find_undefined_vars_simple(modal_jsx, component_name)
        
        out_path = write_modal_component(component_name, modal_jsx, props, lucide_icons)
        created_files.append((component_name, out_path))
        print(f'  [OK] Extracted {component_name} ({len(modal_jsx)} chars, {len(props)} props) -> {out_path}')
        
        # Build the replacement self-closing tag
        props_tag = ' '.join([f'{p}={{{p}}}' for p in props])
        replacement = f'<{component_name} {props_tag} />'
        replacements.append((modal_jsx, replacement, component_name))
    
    # Apply replacements to Schedules.jsx
    new_content = content
    for original, replacement, name in replacements:
        new_content = new_content.replace(original, replacement, 1)
    
    # Build import block for new modals
    import_lines = []
    for component_name, _ in created_files:
        import_lines.append(
            f'import {component_name} from "../../components/schedule/modals/{component_name}";'
        )
    
    # Insert imports after PreflightModal import line
    import_block = '\n'.join(import_lines)
    new_content = new_content.replace(
        'import PreflightModal from "../../components/schedule/modals/PreflightModal";',
        'import PreflightModal from "../../components/schedule/modals/PreflightModal";\n' + import_block,
        1
    )
    
    with open(SCHEDULES_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f'\nDone! Created {len(created_files)} modal components.')
    print('Updated Schedules.jsx.')


if __name__ == '__main__':
    main()
