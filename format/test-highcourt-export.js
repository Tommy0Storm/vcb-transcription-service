import { Document, Paragraph, AlignmentType, Packer, TextRun } from 'docx';
import fs from 'fs';

const transcriptData = fs.readFileSync('Transcription-translation.txt', 'utf-8');
const [englishSection, afrikaansSection] = transcriptData.split('# Afrikaans Transcription');

const parseTranscript = (text) => {
  const entries = [];
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.match(/^SPEAKER \d+ \[[\d:]+\]$/)) {
      const speaker = line;
      const content = lines[i + 1]?.trim() || '';
      entries.push({ speaker, content });
      i += 2;
    } else {
      i++;
    }
  }
  return entries;
};

const english = parseTranscript(englishSection);
const afrikaans = parseTranscript(afrikaansSection);

const children = [
  new Paragraph({ text: 'TRANSCRIPT', heading: 1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
  new Paragraph({ text: '22-10-2025.MP3', alignment: AlignmentType.CENTER, spacing: { after: 600 } })
];

for (let i = 0; i < Math.max(english.length, afrikaans.length); i++) {
  const eng = english[i] || { speaker: '', content: '' };
  const afr = afrikaans[i] || { speaker: '', content: '' };
  const lineNum = (i + 1) * 10;
  
  children.push(
    new Paragraph({ text: eng.speaker, spacing: { after: 100 } }),
    new Paragraph({ text: eng.content, spacing: { after: 200 } }),
    new Paragraph({ 
      children: [
        new TextRun(afr.speaker),
        new TextRun({ text: `     ${lineNum}`, break: 0 })
      ],
      spacing: { after: 100 } 
    }),
    new Paragraph({ text: afr.content, spacing: { after: 400 } })
  );
}

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children
  }],
  styles: {
    default: {
      document: {
        run: { font: 'Arial', size: 24 }
      }
    }
  }
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('TEST-HighCourt-Bilingual.docx', buffer);
  console.log('Document created with ' + english.length + ' entries');
});
