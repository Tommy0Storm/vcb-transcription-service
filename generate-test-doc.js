import { generateProfessionalDocument } from './document-export-system.js';
import { Packer } from 'docx';
import fs from 'fs';

// Sample transcript from your format folder
const sampleTranscript = `[00:00:00]
**SPEAKER 1**: So, um, should the Okay, so, um, yes, because 1.1, what does it?

[00:00:07]
**SPEAKER 1**: Should the above be completed so my my eyes are terrible.

[00:00:12]
**SPEAKER 1**: Um should the above project not be completed could be terminated before the termination date referred to by the part of terminate on such earlier completion.

[00:00:19]
**SPEAKER 1**: Okay.

[00:00:20]
**SPEAKER 1**: How how does this contract differ from her her um final sign contract?

[00:00:27]
**SPEAKER 2**: Uh, define what sense.

[00:00:29]
**SPEAKER 1**: So the key I saw.

[00:00:32]
**SPEAKER 1**: contract, contract.

[00:00:36]
**SPEAKER 1**: Sorry, you broke up there.

[00:00:38]
**SPEAKER 1**: Okay, the limited duration contract that you testified to earlier, I think it's extra 5.`;

const metadata = {
    fileName: 'Sample Court Transcript',
    projectName: 'Export Fix Verification',
    sourceFileName: 'court-hearing.mp3',
    recordingDate: '2025-01-09',
    duration: '00:00:45',
    sourceLanguage: 'English',
    summaryObjective: 'Discussion regarding contract terms and limited duration agreements.',
    summaryKeyPoints: '• Contract termination clauses\n• Limited duration contract comparison\n• Audio quality issues during testimony'
};

console.log('Generating test document with transcript content...');

const document = generateProfessionalDocument(sampleTranscript, metadata);
const buffer = await Packer.toBuffer(document);
fs.writeFileSync('VCB_Test_Export_Fixed.docx', buffer);

console.log('✅ Document created: VCB_Test_Export_Fixed.docx');
console.log('📄 Size:', Math.round(buffer.length / 1024), 'KB');
console.log('🔍 Open the document to see the transcript content is now included!');