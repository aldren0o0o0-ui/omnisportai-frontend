const fs = require('fs');

const lintOutput = JSON.parse(fs.readFileSync('lint_output.json', 'utf8'));
const fileData = lintOutput[0];

const missingVars = new Set();
fileData.messages.forEach(msg => {
    if (msg.ruleId === 'no-undef') {
        const match = msg.message.match(/'([^']+)' is not defined/);
        if (match) {
            missingVars.add(match[1]);
        }
    }
});

// also some variables from the original extraction
const badVars = ['last_checked_at', 'summary', 'total_sports', 'sports_checked', 'total_venues', 'venues_checked', 'required_slots', 'matches_needed', 'estimated_capacity', 'match_id', 'resolution_options', 'impact_summary', 'expected_effect', 'limitations'];
// These bad vars shouldn't be extracted, they are properties of preflightResult.

const finalProps = Array.from(missingVars);
console.log('Props to pass:', finalProps);

const schedulesPath = 'src/pages/coordinator/Schedules.jsx';
let schedulesContent = fs.readFileSync(schedulesPath, 'utf8');

// Replace the bad props with the good props in Schedules.jsx
const badPropsString = badVars.map(v => `${v}={${v}}`).join(' ');
const newPropsString = finalProps.map(v => `${v}={${v}}`).join(' ');

// Since babel formatted it, it might be on multiple lines.
// We can just use a regex to replace <PreflightModal ... /> completely.
schedulesContent = schedulesContent.replace(/<PreflightModal[^>]*>/, `<PreflightModal ${newPropsString}>`);

fs.writeFileSync(schedulesPath, schedulesContent);

// Fix PreflightModal.jsx
const modalPath = 'src/components/schedule/modals/PreflightModal.jsx';
let modalContent = fs.readFileSync(modalPath, 'utf8');

const modalRegex = /export default function PreflightModal\(\{\s*[^}]*\}\)/s;
const newSignature = `export default function PreflightModal({\n  ${finalProps.join(',\n  ')}\n})`;
modalContent = modalContent.replace(modalRegex, newSignature);

fs.writeFileSync(modalPath, modalContent);
console.log('Fixed files successfully.');
