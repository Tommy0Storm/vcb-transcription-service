// AI SDK Integration for Transcription with Storage
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { saveTranscript } from './transcript-storage.js';
import { analyzeSentiment } from './sentiment-analyzer.js';
import { formatPremiumTranscript, generateCourtFormat, generateMeetingMinutes } from './premium-formatter.js';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

// Transcribe audio and save to storage
export async function transcribeAndSave(audioFile, language = 'English', options = {}) {
  try {
    const { detectSentiment = false, premiumFormat = null, formatOptions = {} } = options;
    
    const audioData = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
    
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Transcribe this audio in ${language}:` },
            { type: 'file', data: base64Audio, mimeType: audioFile.type }
          ]
        }
      ]
    });

    const transcriptData = {
      audioName: audioFile.name,
      language,
      transcription: text,
      duration: audioFile.duration || null,
    };

    // Optional sentiment analysis
    if (detectSentiment) {
      transcriptData.sentiment = await analyzeSentiment(text);
    }

    // Optional premium formatting
    if (premiumFormat) {
      transcriptData.isPremium = true;
      if (premiumFormat === 'professional') {
        transcriptData.premiumFormat = await formatPremiumTranscript(text, formatOptions);
      } else if (premiumFormat === 'court') {
        transcriptData.premiumFormat = await generateCourtFormat(text, formatOptions);
      } else if (premiumFormat === 'meeting') {
        transcriptData.premiumFormat = await generateMeetingMinutes(text, formatOptions);
      }
    }

    const id = await saveTranscript(transcriptData);
    return { id, ...transcriptData };
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}

// Add translation to existing transcript (supports multiple)
export async function translateAndUpdate(transcriptId, targetLanguage) {
  const { addTranslation } = await import('./translation-manager.js');
  return addTranslation(transcriptId, targetLanguage);
}

// Stream transcription (for real-time display)
export async function streamTranscription(audioFile, language = 'English', onChunk) {
  try {
    const { streamText } = await import('ai');
    const audioData = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
    
    const result = streamText({
      model: google('gemini-1.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Transcribe this audio in ${language}:` },
            { type: 'file', data: base64Audio, mimeType: audioFile.type }
          ]
        }
      ]
    });

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
      if (onChunk) onChunk(chunk, fullText);
    }

    const id = await saveTranscript({
      audioName: audioFile.name,
      language,
      transcription: fullText,
    });

    return { id, transcription: fullText };
  } catch (error) {
    console.error('Stream transcription failed:', error);
    throw error;
  }
}
