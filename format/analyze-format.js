import JSZip from 'jszip';
import fs from 'fs';

const data = fs.readFileSync('Format-HC.docx');
const zip = await JSZip.loadAsync(data);
const xml = await zip.file('word/document.xml').async('string');
const styles = await zip.file('word/styles.xml').async('string');

console.log('=== DOCUMENT STRUCTURE ===');
console.log(xml.substring(0, 3000));
console.log('\n=== STYLES ===');
console.log(styles.substring(0, 2000));
