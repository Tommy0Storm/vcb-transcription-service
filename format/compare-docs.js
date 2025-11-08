import JSZip from 'jszip';
import fs from 'fs';

async function analyzeDoc(filename) {
  const data = fs.readFileSync(filename);
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file('word/document.xml').async('string');
  
  console.log(`\n=== ${filename} ===`);
  
  // Extract text content
  const textMatches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const texts = textMatches.map(m => m.replace(/<[^>]+>/g, ''));
  
  console.log('\nText Content:');
  texts.forEach((t, i) => {
    if (t.trim()) console.log(`${i + 1}. "${t}"`);
  });
  
  // Check for tables
  const tableCount = (xml.match(/<w:tbl>/g) || []).length;
  console.log(`\nTables: ${tableCount}`);
  
  // Check spacing
  const hasDoubleSpacing = xml.includes('w:line="480"') || xml.includes('w:lineRule="auto"');
  console.log(`Double spacing: ${hasDoubleSpacing}`);
  
  // Check font
  const hasTimesNewRoman = xml.includes('Times New Roman');
  console.log(`Times New Roman: ${hasTimesNewRoman}`);
}

analyzeDoc('Format-HC.docx').then(() => {
  analyzeDoc('TEST-HighCourt-Bilingual.docx');
}).catch(console.error);
