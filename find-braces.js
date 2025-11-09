const fs = require('fs');

const content = fs.readFileSync('vcb-transcription-service.jsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
const issues = [];

for (let i = 0; i < Math.min(lines.length, 962); i++) {
    const line = lines[i];
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    balance += open - close;
    
    if (balance < 0) {
        issues.push({
            line: i + 1,
            balance,
            content: line.substring(0, 100)
        });
    }
}

console.log('Lines with negative balance (extra closing braces):');
issues.forEach(issue => {
    console.log(`Line ${issue.line}: Balance=${issue.balance} | ${issue.content}`);
});

console.log(`\nFinal balance for lines 1-962: ${balance}`);
