import re, os

path = 'frontend/src/pages/coordinator/Teams.jsx'
content = open(path, encoding='utf-8').read()
lines = content.splitlines()

# Imports
imports = [l.strip() for l in lines if l.strip().startswith('import ')]
print('=== IMPORTS ===')
for i in imports:
    print(f'  {i}')

# AppModal blocks
print('\n=== AppModal BLOCKS ===')
modals = re.findall(r'<AppModal[\s\S]*?</AppModal>', content)
for i, m in enumerate(modals):
    title_match = re.search(r'title="([^"]+)"', m)
    title = title_match.group(1) if title_match else '(no title)'
    print(f'  [{i}] {len(m):6} chars - {title}')

# Total lines
print(f'\nTotal lines: {len(lines)}')
print(f'Total size: {len(content):,} bytes')
