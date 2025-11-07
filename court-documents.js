import { Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } from 'docx';

const parseSegments = (text) => {
  const lines = text.split('\n\n');
  return lines.map(line => {
    const match = line.match(/\[([^\]]+)\]\s*\*\*([^:]+):\*\*\s*(.+)/s);
    return match ? { timestamp: match[1], speaker: match[2], text: match[3] } : null;
  }).filter(Boolean);
};

// High Court Single Language
export const generateHighCourtDoc = (transcript, meta = {}) => {
  const segments = parseSegments(transcript);
  let lineNum = 10;

  const metaTable = new Table({
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Case Number:')] }), new TableCell({ children: [new Paragraph(meta.caseNumber || '[To be completed]')] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Division:')] }), new TableCell({ children: [new Paragraph(meta.division || '[To be completed]')] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Date of Hearing:')] }), new TableCell({ children: [new Paragraph(meta.hearingDate || new Date().toISOString().split('T')[0])] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Plaintiff/Applicant:')] }), new TableCell({ children: [new Paragraph('[To be completed]')] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Defendant/Respondent:')] }), new TableCell({ children: [new Paragraph('[To be completed]')] })] })
    ],
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  const transcriptParagraphs = [];
  segments.forEach(seg => {
    seg.text.split(/(?<=[.!?])\s+/).forEach(line => {
      transcriptParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line }), new TextRun({ text: `     ${lineNum}`, break: 0 })],
        spacing: { line: 480 }
      }));
      lineNum += 10;
    });
  });

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ text: 'HIGH COURT RECORD OF PROCEEDINGS', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ text: '1. CASE INFORMATION:', bold: true, spacing: { before: 400, after: 200 } }),
        metaTable,
        new Paragraph({ text: '2. OFFICIAL TRANSCRIPTION:', bold: true, spacing: { before: 800, after: 400 } }),
        ...transcriptParagraphs,
        new Paragraph({ text: 'END OF TRANSCRIPTION', alignment: AlignmentType.CENTER, bold: true, spacing: { before: 800, after: 400 } }),
        new Paragraph({ text: 'DUAL CERTIFICATION', bold: true, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: `I certify this is a true transcription of proceedings in the ${meta.division || '[Division]'} High Court.`, spacing: { after: 200 } }),
        new Paragraph({ text: 'Transcriber: _____________________ Date: _____', spacing: { after: 200 } }),
        new Paragraph({ text: 'Signature: _____________________', spacing: { after: 400 } })
      ]
    }],
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480 } } } } }
  });
};

// High Court Bilingual
export const generateHighCourtBilingualDoc = (original, translation, meta = {}) => {
  const origSegs = parseSegments(original);
  const transSegs = parseSegments(translation);
  let lineNum = 10;

  const metaTable = new Table({
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Case Number:')] }), new TableCell({ children: [new Paragraph(meta.caseNumber || '[To be completed]')] })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph('Languages:')] }), new TableCell({ children: [new Paragraph(`${meta.sourceLanguage || 'English'} / ${meta.targetLanguage || 'Afrikaans'}`)] })] })
    ],
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  const transcriptRows = [];
  origSegs.forEach((orig, i) => {
    const trans = transSegs[i] || { text: '' };
    transcriptRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(orig.text)], width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(trans.text), new TextRun({ text: `     ${lineNum}`, break: 0 })] })], width: { size: 50, type: WidthType.PERCENTAGE } })
      ]
    }));
    lineNum += 10;
  });

  const transcriptTable = new Table({
    rows: transcriptRows,
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } },
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ text: 'HIGH COURT RECORD OF PROCEEDINGS', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ text: '1. CASE INFORMATION:', bold: true, spacing: { before: 400, after: 200 } }),
        metaTable,
        new Paragraph({ text: '2. OFFICIAL TRANSCRIPTION:', bold: true, spacing: { before: 800, after: 400 } }),
        transcriptTable,
        new Paragraph({ text: 'END OF TRANSCRIPTION', alignment: AlignmentType.CENTER, bold: true, spacing: { before: 800, after: 400 } }),
        new Paragraph({ text: 'DUAL CERTIFICATION', bold: true, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: `I certify this is a true transcription and translation.`, spacing: { after: 200 } }),
        new Paragraph({ text: 'Transcriber: _____________________ Date: _____', spacing: { after: 200 } }),
        new Paragraph({ text: 'Translator: _____________________ Date: _____', spacing: { after: 400 } })
      ]
    }],
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480 } } } } }
  });
};

// Professional (No Court Info)
export const generateProfessionalDoc = (transcript, meta = {}) => {
  const segments = parseSegments(transcript);

  const transcriptParagraphs = [];
  segments.forEach(seg => {
    transcriptParagraphs.push(new Paragraph({ text: `[${seg.timestamp}] ${seg.speaker}:`, bold: true, spacing: { before: 200, after: 100 } }));
    transcriptParagraphs.push(new Paragraph({ text: seg.text, spacing: { after: 200 } }));
  });

  return new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'TRANSCRIPT', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ text: meta.fileName || 'Audio Recording', alignment: AlignmentType.CENTER, italics: true, spacing: { after: 600 } }),
        ...transcriptParagraphs
      ]
    }],
    styles: { default: { document: { run: { font: 'Arial', size: 24 } } } }
  });
};
