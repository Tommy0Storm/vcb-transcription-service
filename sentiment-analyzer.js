// Sentiment Analysis using AI SDK
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
});

export async function analyzeSentiment(text) {
  const { text: result } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt: `Analyze the sentiment of this text. Return ONLY a JSON object with: overall (positive/negative/neutral), score (-1 to 1), emotions (array), and summary (one sentence).

Text: ${text}`,
  });

  try {
    const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      overall: 'neutral',
      score: 0,
      emotions: [],
      summary: 'Unable to analyze sentiment'
    };
  }
}
