"""Fix remaining issues:
1. Remove 'action' prop from MatchDetailModal tag (it's not a real variable)
2. Suppress the no-unused-vars errors for new prop pass-through vars in Schedules.jsx
"""
import re

schedules_path = 'frontend/src/pages/coordinator/Schedules.jsx'
content = open(schedules_path, encoding='utf-8').read()

# Remove 'action={action}' from the MatchDetailModal tag since 'action' is undefined
content = content.replace(
    '<MatchDetailModal action={action} ',
    '<MatchDetailModal '
)
open(schedules_path, 'w', encoding='utf-8').write(content)
print('Removed action={action} from MatchDetailModal tag.')

# Also remove 'action' from MatchDetailModal.jsx props signature
modal_path = 'frontend/src/components/schedule/modals/MatchDetailModal.jsx'
modal = open(modal_path, encoding='utf-8').read()
modal = re.sub(r'\baction\b,?\n\s*', '', modal, count=1)
open(modal_path, 'w', encoding='utf-8').write(modal)
print('Removed action from MatchDetailModal.jsx props.')
