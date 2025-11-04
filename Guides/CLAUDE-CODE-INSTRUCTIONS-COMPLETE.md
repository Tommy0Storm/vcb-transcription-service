# CLAUDE CODE - COMPLETE IMPLEMENTATION INSTRUCTIONS
**VCB Instant Transcription Service - Final Implementation Guide**

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Core Requirements Overview](#core-requirements-overview)
3. [Current Implementation Status](#current-implementation-status)
4. [Features to Implement](#features-to-implement)
5. [Technical Architecture](#technical-architecture)
6. [Detailed Implementation Steps](#detailed-implementation-steps)
7. [Testing & Validation](#testing--validation)
8. [Deployment Checklist](#deployment-checklist)

---

## EXECUTIVE SUMMARY

### What We're Building

A **browser-based transcription application** that:
- ✅ Transcribes audio/video files using Google Gemini API
- ✅ Generates professional Word documents instantly
- ✅ Translates to 11 official SA languages
- ✅ Generates voice synthesis (male/female speakers)
- ✅ Supports High Court certified format (Rule 8 & 59 compliant)
- ✅ Uses token-based pricing system
- ✅ Stores ALL data locally (IndexedDB) - ZERO server storage (POPIA compliant)

### Key Principles

1. **POPIA Compliance First**: No server-side data storage - everything in browser IndexedDB
2. **Simplified & Seamless UX**: User uploads → Gets instant results → Downloads document
3. **Token Economy**: Users buy tokens, spend per transcription/translation/voice
4. **Zero Tolerance for Errors**: All code must be production-ready and tested

---

## CORE REQUIREMENTS OVERVIEW

### 1. USER WORKFLOW

```
User uploads audio file
        ↓
Real-time validation (format, size, duration)
        ↓
Processing with Google Gemini API (15-30 seconds)
        ↓
User selects options:
  - Professional or High Court format
  - Translation (optional): Choose from 11 SA languages
  - Voice synthesis (optional): Male/female voices per speaker
        ↓
Generate Word document according to selected template
        ↓
Calculate token cost & deduct from user's balance
        ↓
Store in IndexedDB (local only)
        ↓
Provide instant download (DOCX + optional MP3)
```

### 2. NO SERVER STORAGE (CRITICAL)

**POPIA Compliance Rule:**
- ❌ NO audio files stored server-side
- ❌ NO transcription text stored server-side
- ❌ NO user recordings stored anywhere except user's browser
- ✅ ALL data in IndexedDB only
- ✅ Auto-delete after 30 days (configurable)
- ✅ Clear warning: "We do NOT keep your recordings"

---

## CURRENT IMPLEMENTATION STATUS

### ✅ Already Implemented (Based on vcb-transcription-service.jsx)

1. **Audio Upload & Validation**
   - File format validation
   - Size limit checking (32MB for Gemini)
   - Waveform visualization
   - Drag-and-drop interface

2. **Google Gemini API Integration**
   - Audio transcription with structured output
   - Speaker identification
   - Timestamp generation
   - Error handling with categorization

3. **Document Generation (DOCX)**
   - Professional template (Template A)
   - Speaker labels, timestamps
   - Basic formatting

4. **UI Components**
   - File upload zone
   - Processing indicators
   - Error handling with toast notifications
   - Cleaner Theme design system

### ❌ MISSING / INCOMPLETE Features

1. **Translation System**
   - Gemini API translation to 11 SA languages
   - Bilingual document generation (two-column table)
   - Language selector UI

2. **Voice Synthesis (Text-to-Speech)**
   - Google Cloud TTS integration
   - Multi-speaker voice assignment (male/female)
   - MP3 generation and download

3. **Token System**
   - Token purchase flow (PayFast integration)
   - Token balance display
   - Token deduction on service use
   - Cost calculator

4. **High Court Document Format**
   - Double-spacing (2.0 line height) throughout
   - Line numbering every 10th line
   - Witness headers on pages
   - Rule 8 & 59 compliance validation

5. **IndexedDB Storage System**
   - Store transcriptions locally
   - History dashboard
   - Export/Import functionality
   - Auto-delete after 30 days

6. **POPIA Warning System**
   - First-time user modal
   - Upload page warnings
   - Settings for auto-delete

---

## FEATURES TO IMPLEMENT

### PRIORITY 1: Core Missing Features

#### Feature 1: Translation System

**Location:** Add to main component after transcription completes

**Implementation:**

```javascript
// 1. Language Selector UI
const LANGUAGES = {
  official: [
    { code: 'af-ZA', name: 'Afrikaans', widthAdjust: 1.15 },
    { code: 'zu-ZA', name: 'IsiZulu', widthAdjust: 1.30 },
    { code: 'xh-ZA', name: 'IsiXhosa', widthAdjust: 1.30 },
    { code: 'st-ZA', name: 'Sesotho', widthAdjust: 1.15 },
    { code: 'ts-ZA', name: 'Xitsonga', widthAdjust: 1.20 },
    { code: 'ss-ZA', name: 'siSwati', widthAdjust: 1.25 },
    { code: 've-ZA', name: 'Tshivenda', widthAdjust: 1.20 },
    { code: 'nr-ZA', name: 'Ndebele', widthAdjust: 1.25 },
    { code: 'nso-ZA', name: 'Sepedi', widthAdjust: 1.15 },
    { code: 'tn-ZA', name: 'Setswana', widthAdjust: 1.15 },
  ],
  foreign: [
    { code: 'zh-CN', name: 'Mandarin Chinese', widthAdjust: 0.75 },
    { code: 'fr-FR', name: 'French', widthAdjust: 1.10 },
    { code: 'es-ES', name: 'Spanish', widthAdjust: 1.15 },
    { code: 'pt-PT', name: 'Portuguese', widthAdjust: 1.15 },
    { code: 'de-DE', name: 'German', widthAdjust: 1.10 },
    { code: 'ar-SA', name: 'Arabic', widthAdjust: 1.15 },
  ]
};

// 2. Translation API Call
const translateTranscript = async (transcriptText, targetLanguage) => {
  const prompt = `Translate the following English transcript into professional ${targetLanguage.name} (South African spelling if applicable).

CRITICAL RULES:
1. Maintain speaker names EXACTLY as provided (do NOT translate names)
2. Keep ALL timestamps EXACTLY as provided: [HH:MM:SS]
3. Keep ALL [NOTATION] markers unchanged: [PAUSE], [INAUDIBLE], etc.
4. Preserve structure: [HH:MM:SS] SPEAKER: translated text
5. Use formal register for court/legal context
6. Use professional legal terminology where applicable

Transcript to translate:
${transcriptText}

Return ONLY the translated transcript in the same format.`;

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192
    }
  });

  return response.text;
};

// 3. Bilingual Document Generation (Two-Column Table)
const generateBilingualDocument = (sourceText, translatedText, metadata) => {
  // Parse both transcripts into segments
  const sourceSegments = parseTranscriptSegments(sourceText);
  const translatedSegments = parseTranscriptSegments(translatedText);

  // Create document with two-column table layout
  const doc = new Document({
    sections: [{
      children: [
        // Header
        new Paragraph({
          text: "PROFESSIONAL TRANSCRIPTION & TRANSLATION",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),

        // Metadata
        new Paragraph({ text: `Source Language: ${metadata.sourceLanguage}` }),
        new Paragraph({ text: `Target Language: ${metadata.targetLanguage}` }),
        new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
        new Paragraph({ text: "" }), // Spacing

        // Two-column table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    text: `SOURCE (${metadata.sourceLanguage})`,
                    bold: true
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({
                    text: `TRANSLATION (${metadata.targetLanguage})`,
                    bold: true
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                })
              ]
            }),

            // Content rows (one per segment)
            ...sourceSegments.map((sourceSeg, idx) => {
              const translatedSeg = translatedSegments[idx] || {};
              return new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ text: sourceSeg.timestamp }),
                      new Paragraph({ text: `${sourceSeg.speaker}:`, bold: true }),
                      new Paragraph({ text: sourceSeg.text })
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: translatedSeg.timestamp || sourceSeg.timestamp }),
                      new Paragraph({ text: `${translatedSeg.speaker || sourceSeg.speaker}:`, bold: true }),
                      new Paragraph({ text: translatedSeg.text || '[Translation missing]' })
                    ]
                  })
                ]
              });
            })
          ]
        }),

        // Translator certification
        new Paragraph({ text: "" }),
        new Paragraph({ text: "TRANSLATOR CERTIFICATION", bold: true }),
        new Paragraph({ text: "I certify that this translation is accurate and faithful to the original." }),
        new Paragraph({ text: "NOTE: AI-generated translation - human certification recommended for legal use." })
      ]
    }]
  });

  return doc;
};
```

**UI Integration:**

Add after transcription completes:
```jsx
{transcriptResult && (
  <div className="translation-options">
    <h3>Add Translation (Optional)</h3>
    <select
      value={selectedLanguage}
      onChange={(e) => setSelectedLanguage(e.target.value)}
    >
      <option value="">No Translation</option>
      <optgroup label="Official SA Languages">
        {LANGUAGES.official.map(lang => (
          <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </optgroup>
      <optgroup label="Foreign Languages">
        {LANGUAGES.foreign.map(lang => (
          <option key={lang.code} value={lang.code}>{lang.name}</option>
        ))}
      </optgroup>
    </select>

    {selectedLanguage && (
      <p className="cost-estimate">
        Translation cost: +{calculateTranslationCost(duration, selectedLanguage)} tokens
      </p>
    )}

    <button onClick={handleTranslateAndGenerate}>
      Generate {selectedLanguage ? 'Bilingual' : 'Standard'} Document
    </button>
  </div>
)}
```

---

#### Feature 2: Voice Synthesis (Text-to-Speech)

**Google Cloud TTS Integration:**

```javascript
// 1. Install Google Cloud TTS library
// npm install @google-cloud/text-to-speech

// 2. Voice Configuration
const VOICE_OPTIONS = {
  male: [
    { name: 'en-US-Wavenet-D', label: 'Male Voice 1 (Premium)' },
    { name: 'en-US-Wavenet-A', label: 'Male Voice 2 (Premium)' },
    { name: 'en-US-Standard-D', label: 'Male Voice (Standard)' }
  ],
  female: [
    { name: 'en-US-Wavenet-F', label: 'Female Voice 1 (Premium)' },
    { name: 'en-US-Wavenet-C', label: 'Female Voice 2 (Premium)' },
    { name: 'en-US-Standard-F', label: 'Female Voice (Standard)' }
  ]
};

// 3. Multi-Speaker Voice Synthesis
const generateVoiceNarration = async (transcriptSegments, speakerVoiceMap, isWaveNet = false) => {
  const audioSegments = [];

  for (const segment of transcriptSegments) {
    const voiceConfig = speakerVoiceMap[segment.speaker] || VOICE_OPTIONS.male[2]; // Default standard male

    // Prepare text for TTS
    const textToSpeak = `${segment.speaker} says: ${segment.text}`;

    // Call Google TTS API
    const audioContent = await synthesizeSpeech(textToSpeak, voiceConfig.name, isWaveNet);

    audioSegments.push({
      timestamp: segment.timestamp,
      speaker: segment.speaker,
      audioData: audioContent
    });
  }

  // Concatenate all audio segments with 0.5s silence between speakers
  const finalAudio = await concatenateAudioSegments(audioSegments);

  return finalAudio; // Returns MP3 Blob
};

const synthesizeSpeech = async (text, voiceName, isWaveNet) => {
  // Use Gemini's TTS capability or Google Cloud TTS
  const response = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceName,
      voiceType: isWaveNet ? 'WAVENET' : 'STANDARD'
    })
  });

  const audioBlob = await response.blob();
  return audioBlob;
};

// 4. Audio Concatenation
const concatenateAudioSegments = async (segments) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const buffers = [];

  // Decode all audio segments
  for (const segment of segments) {
    const arrayBuffer = await segment.audioData.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    buffers.push(audioBuffer);
  }

  // Calculate total length (including 0.5s silence between segments)
  const silenceDuration = 0.5; // seconds
  const totalLength = buffers.reduce((sum, buf) => sum + buf.duration, 0) +
                      (buffers.length - 1) * silenceDuration;

  // Create final buffer
  const finalBuffer = audioContext.createBuffer(
    1, // mono
    totalLength * audioContext.sampleRate,
    audioContext.sampleRate
  );

  let offset = 0;
  buffers.forEach((buffer, index) => {
    const channelData = finalBuffer.getChannelData(0);
    const sourceData = buffer.getChannelData(0);

    for (let i = 0; i < sourceData.length; i++) {
      channelData[offset + i] = sourceData[i];
    }

    offset += buffer.length;

    // Add silence between segments (except after last)
    if (index < buffers.length - 1) {
      offset += silenceDuration * audioContext.sampleRate;
    }
  });

  // Convert to MP3
  const wavBlob = await audioBufferToWav(finalBuffer);
  return wavBlob;
};
```

**UI for Voice Selection:**

```jsx
{transcriptResult && (
  <div className="voice-synthesis-options">
    <h3>Add Voice Narration (Optional)</h3>

    <div className="voice-quality-selector">
      <label>
        <input
          type="radio"
          value="standard"
          checked={voiceQuality === 'standard'}
          onChange={(e) => setVoiceQuality(e.target.value)}
        />
        Standard Voice (+R{calculateVoiceCost(duration, 'standard')} tokens)
      </label>
      <label>
        <input
          type="radio"
          value="wavenet"
          checked={voiceQuality === 'wavenet'}
          onChange={(e) => setVoiceQuality(e.target.value)}
        />
        Premium WaveNet Voice (+R{calculateVoiceCost(duration, 'wavenet')} tokens)
      </label>
    </div>

    <h4>Assign Voices to Speakers</h4>
    {detectedSpeakers.map(speaker => (
      <div key={speaker} className="speaker-voice-assignment">
        <span>{speaker}:</span>
        <select onChange={(e) => assignVoiceToSpeaker(speaker, e.target.value)}>
          <optgroup label="Male Voices">
            {VOICE_OPTIONS.male.map(voice => (
              <option key={voice.name} value={voice.name}>{voice.label}</option>
            ))}
          </optgroup>
          <optgroup label="Female Voices">
            {VOICE_OPTIONS.female.map(voice => (
              <option key={voice.name} value={voice.name}>{voice.label}</option>
            ))}
          </optgroup>
        </select>
      </div>
    ))}

    <button onClick={handleGenerateVoice}>Generate Voice Narration</button>
  </div>
)}
```

---

#### Feature 3: Token System

**Token Storage (IndexedDB):**

```javascript
// 1. Initialize Token Database
const initTokenDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VCBTokenDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create token balance store
      if (!db.objectStoreNames.contains('tokenBalance')) {
        db.createObjectStore('tokenBalance', { keyPath: 'userId' });
      }

      // Create transaction history store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', {
          keyPath: 'id',
          autoIncrement: true
        });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

// 2. Token Balance Management
const getTokenBalance = async () => {
  const db = await initTokenDB();
  return new Promise((resolve) => {
    const tx = db.transaction('tokenBalance', 'readonly');
    const store = tx.objectStore('tokenBalance');
    const request = store.get('local-user');

    request.onsuccess = () => {
      resolve(request.result || {
        userId: 'local-user',
        totalTokens: 0,
        tokensUsed: 0,
        tokensRemaining: 0
      });
    };
  });
};

const updateTokenBalance = async (tokensToDeduct, description) => {
  const db = await initTokenDB();
  const balance = await getTokenBalance();

  if (balance.tokensRemaining < tokensToDeduct) {
    throw new Error(`Insufficient tokens. You need ${tokensToDeduct} tokens but only have ${balance.tokensRemaining}.`);
  }

  const newBalance = {
    userId: 'local-user',
    totalTokens: balance.totalTokens,
    tokensUsed: balance.tokensUsed + tokensToDeduct,
    tokensRemaining: balance.tokensRemaining - tokensToDeduct,
    lastUpdated: new Date().toISOString()
  };

  // Update balance
  const tx1 = db.transaction('tokenBalance', 'readwrite');
  tx1.objectStore('tokenBalance').put(newBalance);

  // Log transaction
  const tx2 = db.transaction('transactions', 'readwrite');
  tx2.objectStore('transactions').add({
    date: new Date().toISOString(),
    type: 'USAGE',
    amount: tokensToDeduct,
    description,
    balanceAfter: newBalance.tokensRemaining
  });

  return newBalance;
};

const addTokens = async (tokensToAdd, description = 'Token Purchase') => {
  const db = await initTokenDB();
  const balance = await getTokenBalance();

  const newBalance = {
    userId: 'local-user',
    totalTokens: balance.totalTokens + tokensToAdd,
    tokensUsed: balance.tokensUsed,
    tokensRemaining: balance.tokensRemaining + tokensToAdd,
    lastUpdated: new Date().toISOString()
  };

  // Update balance
  const tx1 = db.transaction('tokenBalance', 'readwrite');
  tx1.objectStore('tokenBalance').put(newBalance);

  // Log transaction
  const tx2 = db.transaction('transactions', 'readwrite');
  tx2.objectStore('transactions').add({
    date: new Date().toISOString(),
    type: 'PURCHASE',
    amount: tokensToAdd,
    description,
    balanceAfter: newBalance.tokensRemaining
  });

  return newBalance;
};

// 3. Cost Calculation
const calculateServiceCost = (audioMinutes, options) => {
  let totalCost = 0;

  // Transcription cost: R 0.26 per minute (50% margin)
  totalCost += audioMinutes * 0.26;

  // Translation cost: R 0.26 per minute
  if (options.translation) {
    totalCost += audioMinutes * 0.26;
  }

  // Voice synthesis cost
  if (options.voiceSynthesis) {
    if (options.voiceQuality === 'wavenet') {
      totalCost += audioMinutes * 0.60; // Premium WaveNet
    } else {
      totalCost += audioMinutes * 0.15; // Standard voice
    }
  }

  // Convert to tokens (1 token = R 0.01 for simplicity)
  const tokens = Math.ceil(totalCost * 100);

  return {
    costInRands: totalCost.toFixed(2),
    tokens,
    breakdown: {
      transcription: (audioMinutes * 0.26).toFixed(2),
      translation: options.translation ? (audioMinutes * 0.26).toFixed(2) : 0,
      voiceSynthesis: options.voiceSynthesis ?
        (options.voiceQuality === 'wavenet' ? audioMinutes * 0.60 : audioMinutes * 0.15).toFixed(2) : 0
    }
  };
};
```

**Token UI Components:**

```jsx
// Token Balance Display (Top-right corner)
const TokenBalanceWidget = () => {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const bal = await getTokenBalance();
    setBalance(bal);
  };

  return (
    <div className="token-balance-widget">
      <span>Token Balance:</span>
      <strong>{balance?.tokensRemaining || 0}</strong>
      <button onClick={() => window.location.href = '/tokens'}>
        Buy Tokens
      </button>
    </div>
  );
};

// Cost Calculator (Before Processing)
const CostEstimator = ({ audioMinutes, options }) => {
  const cost = calculateServiceCost(audioMinutes, options);

  return (
    <div className="cost-estimator">
      <h4>Estimated Cost</h4>
      <div className="cost-breakdown">
        <div>Transcription: R {cost.breakdown.transcription}</div>
        {options.translation && (
          <div>Translation: R {cost.breakdown.translation}</div>
        )}
        {options.voiceSynthesis && (
          <div>Voice Synthesis: R {cost.breakdown.voiceSynthesis}</div>
        )}
        <div className="total">
          <strong>Total: {cost.tokens} tokens (R {cost.costInRands})</strong>
        </div>
      </div>
    </div>
  );
};
```

---

#### Feature 4: High Court Document Format

**Implement Rule 8 & 59 Compliance:**

```javascript
const generateHighCourtDocument = (transcriptSegments, metadata) => {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch = 1440 twips
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },

      headers: {
        default: new DocxHeader({
          children: [new Paragraph({
            text: `Case: ${metadata.caseNumber} | Witness: ${metadata.witnessName || 'N/A'}`,
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 }
          })]
        })
      },

      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun("Page "),
              new TextRun({
                children: [PageNumber.CURRENT]
              }),
              new TextRun(" of "),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES]
              })
            ],
            alignment: AlignmentType.CENTER
          })]
        })
      },

      children: [
        // Header Section
        new Paragraph({
          text: "HIGH COURT RECORD OF PROCEEDINGS",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: "CERTIFIED TRANSCRIPTION",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),

        // Case Information
        new Paragraph({ text: `Case Number: ${metadata.caseNumber}` }),
        new Paragraph({ text: `Case Name: ${metadata.caseName}` }),
        new Paragraph({ text: `Division: ${metadata.division}` }),
        new Paragraph({ text: `Date of Hearing: ${metadata.hearingDate}` }),
        new Paragraph({ text: `Judge: ${metadata.judge}` }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        // Transcript Content with Line Numbering
        ...generateTranscriptWithLineNumbers(transcriptSegments),

        // Certification Footer
        new Paragraph({
          text: "",
          pageBreakBefore: true,
          spacing: { before: 800 }
        }),
        new Paragraph({
          text: "═".repeat(70),
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          text: "END OF TRANSCRIPTION",
          alignment: AlignmentType.CENTER,
          bold: true,
          spacing: { after: 400 }
        }),
        new Paragraph({ text: `Document Status: ${metadata.status || 'DRAFT'}` }),
        new Paragraph({ text: `Total Pages: [Auto-calculated]` }),
        new Paragraph({ text: `Date Finalized: ${new Date().toLocaleDateString()}` }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({ text: "TRANSCRIBER CERTIFICATION", bold: true }),
        new Paragraph({
          text: `I certify that the foregoing is a true and faithful transcription of the proceedings held in the ${metadata.division} on ${metadata.hearingDate}.`,
          spacing: { after: 400 }
        }),
        new Paragraph({ text: "Transcriber: _____________________  Date: __________" })
      ]
    }]
  });

  return doc;
};

const generateTranscriptWithLineNumbers = (segments) => {
  const paragraphs = [];
  let lineNumber = 10;

  segments.forEach((segment, index) => {
    // Timestamp
    paragraphs.push(new Paragraph({
      text: segment.timestamp,
      spacing: {
        before: 480,  // Double spacing
        after: 240
      }
    }));

    // Speaker label
    paragraphs.push(new Paragraph({
      text: `${segment.speaker.toUpperCase()}:`,
      bold: true,
      spacing: { after: 120 }
    }));

    // Content with line numbering every 10 lines
    const contentLines = segment.text.split('\n');
    contentLines.forEach((line, lineIndex) => {
      const showLineNumber = (index * contentLines.length + lineIndex) % 10 === 0;

      paragraphs.push(new Paragraph({
        children: [
          ...(showLineNumber ? [
            new TextRun({
              text: `${lineNumber}  `,
              size: 20,
              color: '6C757D'
            })
          ] : []),
          new TextRun({
            text: line,
            size: 22, // 11pt
            font: 'Times New Roman'
          })
        ],
        spacing: {
          before: 240,  // Double spacing
          after: 240
        }
      }));

      if (showLineNumber) lineNumber += 10;
    });
  });

  return paragraphs;
};
```

---

#### Feature 5: IndexedDB Storage System

**Complete Implementation:**

```javascript
// 1. Database Schema
const DB_NAME = 'VCBTranscriptionApp';
const DB_VERSION = 1;

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Transcriptions store
      if (!db.objectStoreNames.contains('transcriptions')) {
        const transcStore = db.createObjectStore('transcriptions', {
          keyPath: 'transcriptionId',
          autoIncrement: true
        });
        transcStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        transcStore.createIndex('fileName', 'fileName', { unique: false });
        transcStore.createIndex('duration', 'duration', { unique: false });
      }

      // User tokens store
      if (!db.objectStoreNames.contains('userTokens')) {
        db.createObjectStore('userTokens', { keyPath: 'userId' });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'settingKey' });
      }
    };
  });
};

// 2. Save Transcription
const saveTranscription = async (transcriptionData) => {
  const db = await initializeDatabase();

  const record = {
    fileName: transcriptionData.fileName,
    fileSize: transcriptionData.fileSize,
    duration: transcriptionData.duration,
    uploadDate: new Date().toISOString(),
    sourceLanguage: transcriptionData.sourceLanguage,
    targetLanguage: transcriptionData.targetLanguage || null,
    transcriptText: transcriptionData.transcriptText,
    translationText: transcriptionData.translationText || null,
    templateType: transcriptionData.templateType, // "PROFESSIONAL" | "HIGH_COURT"
    documentBlob: transcriptionData.documentBlob, // Word document
    audioBlob: transcriptionData.audioBlob || null, // Voice synthesis MP3
    tokensCost: transcriptionData.tokensCost,
    status: 'COMPLETED'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transcriptions', 'readwrite');
    const store = tx.objectStore('transcriptions');
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 3. Retrieve History
const getTranscriptionHistory = async (filters = {}) => {
  const db = await initializeDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transcriptions', 'readonly');
    const store = tx.objectStore('transcriptions');
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result;

      // Apply filters
      if (filters.startDate) {
        results = results.filter(r => new Date(r.uploadDate) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        results = results.filter(r => new Date(r.uploadDate) <= new Date(filters.endDate));
      }
      if (filters.language) {
        results = results.filter(r => r.sourceLanguage === filters.language || r.targetLanguage === filters.language);
      }
      if (filters.templateType) {
        results = results.filter(r => r.templateType === filters.templateType);
      }

      // Sort by most recent first
      results.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

// 4. Auto-Delete Old Files (30 days)
const autoDeleteOldTranscriptions = async () => {
  const settings = await getSetting('autoDeleteDays');
  const daysToKeep = settings?.settingValue || 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const db = await initializeDatabase();
  const tx = db.transaction('transcriptions', 'readwrite');
  const store = tx.objectStore('transcriptions');
  const index = store.index('uploadDate');
  const range = IDBKeyRange.upperBound(cutoffDate.toISOString());

  const request = index.openCursor(range);
  const deletedIds = [];

  request.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      store.delete(cursor.primaryKey);
      deletedIds.push(cursor.primaryKey);
      cursor.continue();
    }
  };

  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(deletedIds);
  });
};

// 5. Export/Import History
const exportHistory = async () => {
  const history = await getTranscriptionHistory();
  const tokenBalance = await getTokenBalance();
  const settings = await getAllSettings();

  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    history: history.map(item => ({
      ...item,
      documentBlob: null, // Exclude large blobs from export
      audioBlob: null
    })),
    tokenBalance,
    settings
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  return blob;
};

const importHistory = async (fileBlob) => {
  const text = await fileBlob.text();
  const importData = JSON.parse(text);

  // Import token balance
  if (importData.tokenBalance) {
    await addTokens(importData.tokenBalance.tokensRemaining, 'Imported from backup');
  }

  // Import settings
  if (importData.settings) {
    for (const setting of importData.settings) {
      await saveSetting(setting.settingKey, setting.settingValue);
    }
  }

  // Note: Document/audio blobs are not included in export, so only metadata is imported
  return {
    imported: importData.history.length,
    skippedBlobs: true
  };
};
```

**History Dashboard UI:**

```jsx
const HistoryDashboard = () => {
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    const data = await getTranscriptionHistory(filters);
    setHistory(data);
  };

  const handleDownload = async (id, type) => {
    const db = await initializeDatabase();
    const tx = db.transaction('transcriptions', 'readonly');
    const store = tx.objectStore('transcriptions');
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result;
      if (!record) return;

      if (type === 'document' && record.documentBlob) {
        downloadBlob(record.documentBlob, `${record.fileName}_transcript.docx`);
      } else if (type === 'audio' && record.audioBlob) {
        downloadBlob(record.audioBlob, `${record.fileName}_voice.mp3`);
      }
    };
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transcription?')) return;

    const db = await initializeDatabase();
    const tx = db.transaction('transcriptions', 'readwrite');
    tx.objectStore('transcriptions').delete(id);

    tx.oncomplete = () => loadHistory();
  };

  const filteredHistory = history.filter(item =>
    item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="history-dashboard">
      <h2>Transcription History</h2>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by file name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select onChange={(e) => setFilters({...filters, templateType: e.target.value})}>
          <option value="">All Types</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="HIGH_COURT">High Court</option>
        </select>

        <input
          type="date"
          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          placeholder="Start Date"
        />
        <input
          type="date"
          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          placeholder="End Date"
        />
      </div>

      {/* History Table */}
      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>File Name</th>
            <th>Duration</th>
            <th>Language(s)</th>
            <th>Type</th>
            <th>Tokens</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHistory.map(item => (
            <tr key={item.transcriptionId}>
              <td>{new Date(item.uploadDate).toLocaleDateString()}</td>
              <td>{item.fileName}</td>
              <td>{item.duration}</td>
              <td>
                {item.sourceLanguage}
                {item.targetLanguage && ` → ${item.targetLanguage}`}
              </td>
              <td>{item.templateType}</td>
              <td>{item.tokensCost}</td>
              <td>
                <button onClick={() => handleDownload(item.transcriptionId, 'document')}>
                  <ExportIcon /> Document
                </button>
                {item.audioBlob && (
                  <button onClick={() => handleDownload(item.transcriptionId, 'audio')}>
                    <ListenIcon /> Audio
                  </button>
                )}
                <button onClick={() => handleDelete(item.transcriptionId)}>
                  <RemoveIcon /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Export/Import */}
      <div className="history-actions">
        <button onClick={async () => {
          const blob = await exportHistory();
          downloadBlob(blob, `vcb-history-${new Date().toISOString()}.json`);
        }}>
          Export History
        </button>
        <button onClick={() => document.getElementById('import-file').click()}>
          Import History
        </button>
        <input
          id="import-file"
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            if (e.target.files[0]) {
              const result = await importHistory(e.target.files[0]);
              alert(`Imported ${result.imported} records`);
              loadHistory();
            }
          }}
        />
      </div>
    </div>
  );
};
```

---

#### Feature 6: POPIA Compliance Warnings

**Implementation:**

```jsx
// 1. First-Time User Modal
const POPIAWarningModal = ({ onAccept }) => {
  const [hasSeenWarning, setHasSeenWarning] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('vcb-popia-warning-seen');
    setHasSeenWarning(!!seen);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vcb-popia-warning-seen', 'true');
    setHasSeenWarning(true);
    onAccept();
  };

  if (hasSeenWarning) return null;

  return (
    <div className="popia-modal-overlay">
      <div className="popia-modal">
        <h2>DATA PRIVACY NOTICE</h2>

        <div className="popia-content">
          <p>Your transcriptions are stored <strong>LOCALLY on your device only</strong>.</p>
          <p>We do <strong>NOT</strong> store, transmit, or access your audio files or transcriptions.</p>

          <ul>
            <li>✓ All data remains on YOUR device</li>
            <li>✓ Files automatically deleted after 30 days</li>
            <li>✓ You can export/backup your history at any time</li>
          </ul>

          <p className="popia-compliance">
            This app is fully compliant with <strong>POPIA</strong> (Protection of Personal Information Act).
          </p>
        </div>

        <button onClick={handleAccept} className="button button-primary">
          I Understand
        </button>
      </div>
    </div>
  );
};

// 2. Upload Page Warning
const UploadWarning = () => (
  <div className="upload-warning">
    <InfoIcon />
    <span>Your files are processed locally and NOT stored on our servers.</span>
  </div>
);

// 3. Settings - Auto-Delete Configuration
const SettingsPanel = () => {
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const setting = await getSetting('autoDeleteDays');
    if (setting) setAutoDeleteDays(setting.settingValue);
  };

  const handleSave = async () => {
    await saveSetting('autoDeleteDays', autoDeleteDays);
    alert('Settings saved');
  };

  return (
    <div className="settings-panel">
      <h3>Privacy Settings</h3>

      <label>
        Auto-delete files after:
        <select value={autoDeleteDays} onChange={(e) => setAutoDeleteDays(Number(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={30}>30 days (recommended)</option>
          <option value={90}>90 days</option>
          <option value={0}>Never (manual cleanup required)</option>
        </select>
      </label>

      <button onClick={handleSave}>Save Settings</button>

      <div className="privacy-info">
        <h4>Your Privacy</h4>
        <p>VCB AI complies with POPIA. We do not store your data on servers.</p>
        <p>All transcriptions remain on your local device only.</p>
      </div>
    </div>
  );
};

// 4. Download Page Warning
const DownloadWarning = () => (
  <div className="download-warning">
    <AlertIcon />
    <span>This is your only copy. Save this file securely.</span>
  </div>
);
```

---

### PRIORITY 2: PayFast Integration (Token Purchase)

**Implementation:**

```javascript
// PayFast Configuration (from payfast-dev.md)
const PAYFAST_CONFIG = {
  merchantId: '31995055',
  merchantKey: 'g3kamzqwU6dc0',
  passphrase: 'Viable_Core_Business_007',
  returnUrl: 'https://your-domain.com/payment-success',
  cancelUrl: 'https://your-domain.com/payment-cancelled',
  notifyUrl: 'https://your-domain.com/api/payfast/notify',
  sandbox: true // Set to false for production
};

// Token Packages
const TOKEN_PACKAGES = [
  { id: 'starter', tokens: 1000, price: 100, label: 'Starter' },
  { id: 'basic', tokens: 5000, price: 450, label: 'Basic', discount: '10%' },
  { id: 'pro', tokens: 10000, price: 800, label: 'Pro', discount: '20%' },
  { id: 'enterprise', tokens: 50000, price: 3500, label: 'Enterprise', discount: '30%' }
];

const initiateTokenPurchase = async (packageId) => {
  const package = TOKEN_PACKAGES.find(p => p.id === packageId);
  if (!package) throw new Error('Invalid package');

  // Generate PayFast payment data
  const paymentData = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: PAYFAST_CONFIG.returnUrl,
    cancel_url: PAYFAST_CONFIG.cancelUrl,
    notify_url: PAYFAST_CONFIG.notifyUrl,

    // Item details
    item_name: `VCB Tokens - ${package.label}`,
    item_description: `${package.tokens} transcription tokens`,
    amount: package.price.toFixed(2),

    // Custom fields
    custom_int1: package.tokens, // Store token amount
    custom_str1: 'local-user', // User ID

    // Generate signature
    passphrase: PAYFAST_CONFIG.passphrase
  };

  // Create signature
  const signature = generatePayFastSignature(paymentData);
  paymentData.signature = signature;

  // Redirect to PayFast
  const form = createPayFastForm(paymentData);
  document.body.appendChild(form);
  form.submit();
};

const generatePayFastSignature = (data) => {
  // Create parameter string
  let paramString = '';
  const sortedKeys = Object.keys(data).sort();

  for (const key of sortedKeys) {
    if (key !== 'signature') {
      paramString += `${key}=${encodeURIComponent(data[key])}&`;
    }
  }
  paramString = paramString.slice(0, -1); // Remove trailing &

  // Add passphrase
  if (data.passphrase) {
    paramString += `&passphrase=${encodeURIComponent(data.passphrase)}`;
  }

  // Generate MD5 hash (you'll need crypto-js or similar)
  const CryptoJS = require('crypto-js');
  return CryptoJS.MD5(paramString).toString();
};

const createPayFastForm = (data) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_CONFIG.sandbox ?
    'https://sandbox.payfast.co.za/eng/process' :
    'https://www.payfast.co.za/eng/process';

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'passphrase') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
  }

  return form;
};

// Handle successful payment (callback from PayFast)
const handlePaymentSuccess = async (paymentDetails) => {
  const tokensToAdd = paymentDetails.custom_int1;
  const userId = paymentDetails.custom_str1;

  // Add tokens to user's balance
  await addTokens(tokensToAdd, `Purchase: ${paymentDetails.item_name}`);

  // Show success message
  alert(`Successfully added ${tokensToAdd} tokens to your account!`);

  // Redirect to dashboard
  window.location.href = '/';
};
```

**Token Purchase UI:**

```jsx
const TokenPurchasePage = () => {
  return (
    <div className="token-purchase-page">
      <h1>Buy Tokens</h1>
      <p>Purchase tokens to use for transcription, translation, and voice synthesis services.</p>

      <div className="token-packages">
        {TOKEN_PACKAGES.map(pkg => (
          <div key={pkg.id} className="package-card">
            <h3>{pkg.label}</h3>
            <div className="package-tokens">{pkg.tokens.toLocaleString()} Tokens</div>
            <div className="package-price">R {pkg.price}</div>
            {pkg.discount && (
              <div className="package-discount">Save {pkg.discount}</div>
            )}
            <div className="package-rate">R {(pkg.price / pkg.tokens).toFixed(2)} per token</div>
            <button onClick={() => initiateTokenPurchase(pkg.id)}>
              Purchase
            </button>
          </div>
        ))}
      </div>

      <div className="payment-info">
        <h3>Secure Payment</h3>
        <p>All payments are processed securely through PayFast, South Africa's leading payment gateway.</p>
      </div>
    </div>
  );
};
```

---

## TESTING & VALIDATION

### Test Checklist

**Before deployment, verify:**

1. **Upload & Processing**
   - [ ] Upload MP3, WAV, M4A files successfully
   - [ ] File size validation works (reject >32MB)
   - [ ] Duration validation works (warn if >2 hours)
   - [ ] Processing shows real-time progress
   - [ ] API errors are caught and displayed clearly

2. **Transcription**
   - [ ] Gemini API returns structured output
   - [ ] Timestamps in [HH:MM:SS] format
   - [ ] Speaker identification works
   - [ ] Non-verbal notations included
   - [ ] JSON parsing handles malformed responses

3. **Translation**
   - [ ] All 11 SA languages selectable
   - [ ] Translation preserves timestamps and speakers
   - [ ] Bilingual document has two columns
   - [ ] Column widths adjust for language (Afrikaans +15%, IsiZulu +30%)
   - [ ] Translator certification statement present

4. **Voice Synthesis**
   - [ ] Standard and WaveNet voices available
   - [ ] Male/female voice selection per speaker
   - [ ] Audio segments concatenated correctly
   - [ ] MP3 download works
   - [ ] Audio quality acceptable

5. **Document Generation**
   - [ ] Professional template: Single spacing, Times New Roman 11pt
   - [ ] High Court template: Double spacing, line numbers every 10
   - [ ] Bilingual template: Two-column table synchronized
   - [ ] Download as .docx works
   - [ ] Document opens in Microsoft Word without errors

6. **Token System**
   - [ ] Token balance displays correctly
   - [ ] Cost calculation accurate
   - [ ] Token deduction happens after successful generation
   - [ ] Insufficient tokens warning shows
   - [ ] Token purchase flow works (PayFast)

7. **IndexedDB Storage**
   - [ ] Transcriptions saved to IndexedDB
   - [ ] History dashboard loads correctly
   - [ ] Search and filters work
   - [ ] Download from history works
   - [ ] Delete from history works
   - [ ] Export/import history works
   - [ ] Auto-delete after 30 days executes

8. **POPIA Compliance**
   - [ ] First-time modal displays
   - [ ] Upload warning visible
   - [ ] Settings allow auto-delete configuration
   - [ ] Download warning present
   - [ ] NO server-side storage confirmed

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

1. **Environment Variables**
   ```
   VITE_GOOGLE_AI_API_KEY=your_actual_gemini_key
   VITE_PAYFAST_MERCHANT_ID=31995055
   VITE_PAYFAST_MERCHANT_KEY=g3kamzqwU6dc0
   VITE_PAYFAST_PASSPHRASE=Viable_Core_Business_007
   VITE_APP_NAME=VCB Transcription Service
   ```

2. **Build & Test**
   ```bash
   npm run build
   npm run preview
   # Test all features in production mode
   ```

3. **Performance Optimization**
   - [ ] Lazy load routes
   - [ ] Compress document blobs before IndexedDB storage
   - [ ] Implement service worker for offline support
   - [ ] Cache static assets

4. **Error Monitoring**
   - [ ] Console errors reviewed
   - [ ] Error boundary catches all errors
   - [ ] Toast notifications for all user-facing errors

### Deployment Steps

1. **Deploy to Vercel/Netlify**
   ```bash
   vercel --prod
   # OR
   netlify deploy --prod
   ```

2. **Configure Domain**
   - Set custom domain (e.g., transcribe.vcb-ai.online)
   - Enable HTTPS (automatic)
   - Set environment variables in hosting dashboard

3. **Post-Deployment Verification**
   - [ ] Test upload on production URL
   - [ ] Verify Gemini API calls work
   - [ ] Check IndexedDB operations
   - [ ] Test token purchase (sandbox mode first)
   - [ ] Validate document downloads
   - [ ] Check mobile responsiveness
   - [ ] Verify POPIA warning displays

---

## CRITICAL REMINDERS

### For Claude Code:

1. **POPIA FIRST**: Never store user data server-side. Everything in IndexedDB only.

2. **Cleaner Theme**: Black, Dark Grey, Mid Grey, Light Grey, White. Quicksand font. 80% whitespace.

3. **High Court Compliance**: Double-spacing (2.0), line numbers every 10, 1-inch margins, Times New Roman 11pt.

4. **Token Deduction**: Only deduct tokens AFTER successful generation, not before.

5. **Error Handling**: Retry API calls 3 times with exponential backoff. Clear error messages.

6. **Voice Synthesis**: Map unique voices to each speaker (max 6). Allow male/female assignment.

7. **Translation**: Adjust column widths based on language. Afrikaans +15%, IsiZulu/IsiXhosa +30%, Mandarin -30%.

8. **Testing**: Test with real 30-minute audio file in multiple languages.

9. **Performance**: Use web workers for document generation. Compress blobs before storage.

10. **Simplified UX**: User uploads → Selects options → Gets instant download. That's it.

---

## REFERENCE DOCUMENTS

- **Instructions.md**: Original implementation spec
- **instant-service-architecture.md**: System architecture and user flow
- **unified-transcription-template.md**: Document templates for all formats
- **google-api-integration.md**: Gemini API technical details
- **pricing-analysis-complete.md**: Cost calculations and token pricing
- **payfast-dev.md**: Payment gateway credentials
- **supabase.md**: Database credentials (currently unused due to POPIA)

---

**END OF COMPLETE IMPLEMENTATION INSTRUCTIONS**

**Status**: Ready for immediate implementation
**Priority**: Complete Features 1-6 in order
**Testing**: Mandatory before deployment
**Compliance**: POPIA, Rule 8, Rule 59

**Contact**: tommy@vcb-ai.online for any clarifications

---

*This document consolidates all requirements into a single, actionable guide for Claude Code to implement the complete VCB Transcription Service.*
