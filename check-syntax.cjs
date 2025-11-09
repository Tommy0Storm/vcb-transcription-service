const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');

const parser = acorn.Parser.extend(jsx());

try {
    const code = fs.readFileSync('vcb-transcription-service.jsx', 'utf8');
    parser.parse(code, {
        ecmaVersion: 2020,
        sourceType: 'module'
    });
    console.log('✓ No syntax errors found');
} catch (error) {
    console.log('✗ Syntax error found:');
    console.log(`  Line ${error.loc.line}, Column ${error.loc.column}`);
    console.log(`  ${error.message}`);
    
    // Show context
    const lines = fs.readFileSync('vcb-transcription-service.jsx', 'utf8').split('\n');
    const errorLine = error.loc.line - 1;
    const start = Math.max(0, errorLine - 2);
    const end = Math.min(lines.length, errorLine + 3);
    
    console.log('\nContext:');
    for (let i = start; i < end; i++) {
        const marker = i === errorLine ? '>>>' : '   ';
        console.log(`${marker} ${i + 1}: ${lines[i]}`);
    }
}
