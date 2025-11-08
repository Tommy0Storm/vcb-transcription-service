import JSZip from 'jszip';
import fs from 'fs';

async function verifyFormat(filename) {
  const data = fs.readFileSync(filename);
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file('word/document.xml').async('string');
  const stylesXml = await zip.file('word/styles.xml').async('string');
  
  console.log(`\n=== Verifying ${filename} ===\n`);
  
  // Check default font in styles
  console.log('Font Settings:');
  if (stylesXml.includes('Times New Roman')) {
    console.log('✓ Times New Roman found in styles');
  } else {
    console.log('✗ Times New Roman NOT found');
  }
  
  // Check font size (24 half-points = 12pt)
  if (stylesXml.includes('w:sz w:val="24"') || xml.includes('w:sz w:val="24"')) {
    console.log('✓ 12pt font size (24 half-points)');
  } else {
    console.log('✗ 12pt font size NOT found');
  }
  
  // Check line spacing (480 twips = double spacing)
  console.log('\nSpacing Settings:');
  if (stylesXml.includes('w:line="480"') || xml.includes('w:line="480"')) {
    console.log('✓ Double spacing (480 twips)');
  } else {
    console.log('✗ Double spacing NOT found');
  }
  
  // Check tables
  const tableCount = (xml.match(/<w:tbl>/g) || []).length;
  console.log(`\nStructure:`);
  console.log(`✓ ${tableCount} tables found`);
  
  // Check for borderless tables
  if (xml.includes('w:val="none"')) {
    console.log('✓ Borderless table styling found');
  }
  
  // Show a snippet of styles
  console.log('\n--- Styles XML snippet ---');
  const docDefaultMatch = stylesXml.match(/<w:docDefaults>[\s\S]{0,500}/);
  if (docDefaultMatch) {
    console.log(docDefaultMatch[0].substring(0, 400));
  }
}

verifyFormat('TEST-HighCourt-Bilingual.docx').catch(console.error);
