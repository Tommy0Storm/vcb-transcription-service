// Multi-language Translation Manager
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getTranscript, saveTranscript } from './transcript-storage.js';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

// Add translation to existing transcript
export async function addTranslation(transcriptId, targetLanguage) {
  const transcript = await getTranscript(transcriptId);
  if (!transcript) throw new Error('Transcript not found');

  // Check if translation already exists
  const existing = transcript.translations?.find(t => t.language === targetLanguage);
  if (existing) return existing;

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt: `Translate to ${targetLanguage}:\n\n${transcript.transcription}`
  });

  const translation = {
    language: targetLanguage,
    text,
    timestamp: Date.now()
  };

  transcript.translations = transcript.translations || [];
  transcript.translations.push(translation);
  
  await saveTranscript(transcript);
  return translation;
}

// Get specific translation
export function getTranslation(transcript, language) {
  return transcript.translations?.find(t => t.language === language);
}

// Remove translation
export async function removeTranslation(transcriptId, language) {
  const transcript = await getTranscript(transcriptId);
  if (!transcript) throw new Error('Transcript not found');

  transcript.translations = transcript.translations?.filter(t => t.language !== language) || [];
  await saveTranscript(transcript);
}

// Batch translate to multiple languages
export async function batchTranslate(transcriptId, languages) {
  const results = [];
  for (const lang of languages) {
    try {
      const translation = await addTranslation(transcriptId, lang);
      results.push({ language: lang, success: true, translation });
    } catch (error) {
      results.push({ language: lang, success: false, error: error.message });
    }
  }
  return results;
}
