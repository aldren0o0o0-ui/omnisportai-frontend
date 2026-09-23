import re
content = open('frontend/src/pages/coordinator/Schedules.jsx', encoding='utf-8').read()
modals = re.findall(r'<AppModal.*?</AppModal>', content, re.DOTALL)
for i, m in enumerate(modals):
    title_match = re.search(r'title="([^"]+)"', m)
    title = title_match.group(1) if title_match else '(no title)'
    print(f'[{i}] {len(m):6} chars - {title}')
