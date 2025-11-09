// Premium Professional Transcript Formatter
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

export async function formatPremiumTranscript(transcription, options = {}) {
  const {
    includeTimestamps = true,
    includeSpeakers = true,
    includeHeadings = true,
    includeSummary = true,
    language = 'English'
  } = options;

  const prompt = `Format this transcript professionally for ${language} legal/business use:

${transcription}

Requirements:
${includeTimestamps ? '- Add [HH:MM:SS] timestamps every paragraph' : ''}
${includeSpeakers ? '- Identify and label speakers (Speaker 1, Speaker 2, etc.)' : ''}
${includeHeadings ? '- Add section headings for topic changes' : ''}
${includeSummary ? '- Add executive summary at top' : ''}
- Proper punctuation and capitalization
- Paragraph breaks for readability
- Remove filler words (um, uh, like)
- Professional tone

Return formatted transcript only.`;

  const { text } = await generateText({
    model: google('gemini-1.5-pro'),
    prompt,
  });

  return text;
}

export async function generateCourtFormat(transcription, caseDetails = {}) {
  const { caseNumber, court, date, parties } = caseDetails;

  const prompt = `Format this as a professional court transcript:

CASE: ${caseNumber || '[Case Number]'}
COURT: ${court || '[Court Name]'}
DATE: ${date || new Date().toLocaleDateString()}
PARTIES: ${parties || '[Parties]'}

TRANSCRIPT:
${transcription}

Format with:
- Formal court header
- Line numbers every 5 lines
- Speaker identification (JUDGE, COUNSEL, WITNESS)
- Proper legal formatting
- Timestamps
- Page breaks every 25 lines

Return formatted court transcript.`;

  const { text } = await generateText({
    model: google('gemini-1.5-pro'),
    prompt,
  });

  return text;
}

export async function generateMeetingMinutes(transcription, meetingInfo = {}) {
  const { title, attendees, date } = meetingInfo;

  const prompt = `Convert this transcript to professional meeting minutes:

MEETING: ${title || '[Meeting Title]'}
DATE: ${date || new Date().toLocaleDateString()}
ATTENDEES: ${attendees || '[Attendees]'}

TRANSCRIPT:
${transcription}

Format as:
1. Executive Summary
2. Key Discussion Points
3. Decisions Made
4. Action Items (with responsible parties)
5. Next Steps

Professional business format.`;

  const { text } = await generateText({
    model: google('gemini-1.5-pro'),
    prompt,
  });

  return text;
}
