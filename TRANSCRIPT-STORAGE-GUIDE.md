# Transcript Storage System

Local-only transcript storage using IndexedDB and localStorage with AI SDK integration.

## Architecture

- **IndexedDB**: Stores full transcript data (transcription, translation, metadata)
- **localStorage**: Stores transcript IDs for quick lookup
- **AI SDK**: Vercel AI SDK for transcription/translation

## Files

1. `transcript-storage.js` - Core storage functions
2. `transcript-manager.jsx` - UI component for managing transcripts
3. `ai-transcript-handler.js` - AI SDK integration with auto-save

## Usage

### Basic Storage

```javascript
import { saveTranscript, getTranscript, getAllTranscripts } from './transcript-storage.js';

// Save
const id = await saveTranscript({
  audioName: 'meeting.mp3',
  language: 'English',
  transcription: 'Hello world...',
  translation: 'Hola mundo...',
});

// Retrieve
const transcript = await getTranscript(id);
const all = await getAllTranscripts();
```

### AI SDK Integration

```javascript
import { transcribeAndSave, translateAndUpdate } from './ai-transcript-handler.js';

// Basic transcription
const result = await transcribeAndSave(audioFile, 'English');

// With sentiment detection
const withSentiment = await transcribeAndSave(audioFile, 'English', {
  detectSentiment: true
});

// With premium formatting
const premium = await transcribeAndSave(audioFile, 'English', {
  premiumFormat: 'professional',
  formatOptions: {
    includeTimestamps: true,
    includeSpeakers: true,
    includeHeadings: true,
    includeSummary: true
  }
});

// Court format
const court = await transcribeAndSave(audioFile, 'English', {
  premiumFormat: 'court',
  formatOptions: {
    caseNumber: 'CR-2024-001',
    court: 'High Court',
    parties: 'State vs Defendant'
  }
});
```

### React Component

```jsx
import TranscriptManager from './transcript-manager.jsx';

function App() {
  return <TranscriptManager />;
}
```

## API Reference

### Storage Functions

- `initDB()` - Initialize IndexedDB
- `saveTranscript(data)` - Save/update transcript
- `getTranscript(id)` - Get single transcript
- `getAllTranscripts()` - Get all transcripts
- `deleteTranscript(id)` - Delete transcript
- `clearAllTranscripts()` - Delete all
- `getTranscriptIds()` - Get IDs from localStorage

### AI Functions

- `transcribeAndSave(audioFile, language, options)` - Transcribe with options
  - `options.detectSentiment` - Enable sentiment analysis
  - `options.premiumFormat` - 'professional', 'court', or 'meeting'
  - `options.formatOptions` - Format-specific options
- `translateAndUpdate(id, targetLanguage)` - Add translation (supports multiple)
- `streamTranscription(audioFile, language, onChunk)` - Stream with save

### Translation Functions

```javascript
import { addTranslation, removeTranslation, batchTranslate, getTranslation } from './translation-manager.js';

// Add single translation
await addTranslation(transcriptId, 'Spanish');

// Add multiple translations
await batchTranslate(transcriptId, ['Spanish', 'French', 'Zulu']);

// Get specific translation
const spanish = getTranslation(transcript, 'Spanish');

// Remove translation
await removeTranslation(transcriptId, 'Spanish');
```

### Sentiment Analysis

```javascript
import { analyzeSentiment } from './sentiment-analyzer.js';

const sentiment = await analyzeSentiment(text);
// Returns: { overall, score, emotions, summary }
```

### Premium Formatters

```javascript
import { formatPremiumTranscript, generateCourtFormat, generateMeetingMinutes } from './premium-formatter.js';

// Professional format
const formatted = await formatPremiumTranscript(text, {
  includeTimestamps: true,
  includeSpeakers: true
});

// Court transcript
const court = await generateCourtFormat(text, {
  caseNumber: 'CR-2024-001',
  court: 'High Court'
});

// Meeting minutes
const minutes = await generateMeetingMinutes(text, {
  title: 'Board Meeting',
  attendees: 'John, Jane, Bob'
});
```

## Data Structure

```javascript
{
  id: 'transcript_1234567890',
  timestamp: 1234567890,
  audioName: 'recording.mp3',
  language: 'English',
  transcription: 'Full text...',
  translations: [
    {
      language: 'Spanish',
      text: 'Texto traducido...',
      timestamp: 1234567891
    },
    {
      language: 'French',
      text: 'Texte traduit...',
      timestamp: 1234567892
    }
  ],
  duration: 120,
  sentiment: {
    overall: 'positive',
    score: 0.8,
    emotions: ['confident', 'professional'],
    summary: 'Professional and positive tone'
  },
  isPremium: true,
  premiumFormat: 'Formatted professional transcript...'
}
```

## Storage Limits

- **IndexedDB**: ~50MB-100MB (browser dependent)
- **localStorage**: ~5-10MB (for IDs only)

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- All modern browsers with IndexedDB support
