# CLAUDE CODE IMPLEMENTATION INSTRUCTIONS

**VCB Instant Transcription Service - Development Specification**

**Reference:** Professional Profile Operating Spec paragraphs 1.3, 5.1-5.3, 7.1-7.3

---

## PROJECT OVERVIEW

Build a browser-based transcription application that provides instant, court-grade transcription services using Google's Generative AI API. The application must comply with POPIA by storing NO user data server-side, using only IndexedDB for local client-side storage.

**Design System:** Cleaner Theme (ref: 5.1-5.3)
- Colors: Black, Dark Grey, Mid Grey, Light Grey, White
- Typography: Quicksand 300 (body), Quicksand 500 (headings), Quicksand Bold (main headings - all caps)
- 80%+ whitespace, high-contrast black text, light-grey borders, no shadows
- Logo on dark background: https://i.postimg.cc/xdJqP9br/logo-transparent-Black-Back.png

---

## CORE FUNCTIONAL REQUIREMENTS

### 1. USER UPLOAD & PROCESSING WORKFLOW

**1.1 Upload Interface**

```
COMPONENT: FileUploadZone
LOCATION: Main landing page
REQUIREMENTS:
- Drag-and-drop zone (light grey border: #E0E0E0, 2px solid)
- Supported formats: MP3, WAV, M4A, FLAC, Opus, MP4, MOV, AVI
- Max file size: 500 MB
- Max duration: 2 hours
- Display file name, size, duration on upload
- Progress indicator during upload (black bar on light grey background)
- Clear error messages for unsupported formats/sizes

VALIDATION:
âœ" Check file format against allowed list
âœ" Verify file size < 500MB
âœ" Extract duration metadata (reject if > 2 hours)
âœ" Provide immediate feedback on validation failure

REFERENCE: instant-service-architecture.md, PART 2, Step 1
```

**1.2 Real-Time Processing Display**

```
COMPONENT: ProcessingStatus
REQUIREMENTS:
- Show processing stages:
  1. "Uploading audio file..."
  2. "Validating file format..."
  3. "Sending to Google Gemini API..."
  4. "Transcribing audio..." (with estimated time)
  5. "Generating professional document..."
  6. "Preparing download..."

- Progress bar (0-100%) with percentage display
- Estimated time remaining (update in real-time)
- Actual processing time tracker
- Visual indicators for each completed stage (checkmark icon)

TIMING EXPECTATIONS:
- API call: 15-30 seconds actual
- UI shows: 45-120 seconds (builds user confidence)
- Display both "Estimated" and "Actual" timers

REFERENCE: instant-service-architecture.md, PART 4.1
```

### 2. TRANSCRIPTION OUTPUT & DOCUMENT GENERATION

**2.1 Google Gemini API Integration**

```
API ENDPOINT: gemini-2.5-flash
METHOD: Audio transcription with structured output

REQUEST CONFIGURATION:
{
  model: "gemini-2.5-flash",
  temperature: 0.1 (for court) / 0.2 (for professional),
  top_p: 0.95,
  top_k: 40 (court) / 64 (professional),
  max_output_tokens: 16384
}

PROMPT STRUCTURE (Court-Grade):
"Generate a High Court certified transcription:
1. Verbatim transcription (preserve all words, stutters, hesitations)
2. Speaker identification: COUNSEL FOR PLAINTIFF, WITNESS, THE COURT
3. Timestamps [HH:MM:SS] at every speaker change
4. Mark hesitations: [PAUSE - X seconds], [VOCAL FILLER: um/uh]
5. Non-verbal: [CROSSTALK], [INAUDIBLE], [CLEARS THROAT]
6. Use [sic] for exact quote preservation
7. Format for double-spacing compliance
8. Every sentence on new line where possible
Return as plain text ready for Word document formatting."

PROMPT STRUCTURE (Professional):
"Generate a professional transcription with these requirements:
1. Identify each speaker (label as SPEAKER 1, SPEAKER 2, etc.)
2. Add timestamps in format [HH:MM:SS] at each speaker change
3. Include non-verbal elements: [PAUSE - X seconds], [LAUGHTER], [CLEARS THROAT]
4. Format: [HH:MM:SS] SPEAKER N: transcribed text
5. Use single spacing between lines
6. For any unclear audio, mark as [INAUDIBLE]
Return plain text format."

ERROR HANDLING:
âœ" Retry on API failure (max 3 attempts with exponential backoff)
âœ" Display clear error message if API quota exceeded
âœ" Fallback message if transcription quality < 70% confidence
âœ" Log errors to browser console (no server logging per POPIA)

REFERENCE: google-api-integration.md, PART 1 & PART 6
```

**2.2 Document Generation - Professional Format**

```
TEMPLATE: Template A (Professional Transcription Only)
OUTPUT FORMAT: DOCX (Microsoft Word)

STRUCTURE:
âœ" Header Section (all caps, Quicksand Bold):
   - Document title
   - Creation date (YYYY-MM-DD format)
   - Recording date
   - Duration (HH:MM:SS)
   - Source language
   - Recording type
   - Participants list (Speaker 1, Speaker 2, etc.)

âœ" Body Section:
   - Timestamps: [HH:MM:SS] format
   - Speaker labels: **SPEAKER NAME:** (bold)
   - Single-spacing (1.0 line height)
   - Times New Roman, 11pt
   - 1 inch margins all sides

âœ" Footer Section:
   - "END OF TRANSCRIPTION"
   - Document status: [DRAFT / FINAL]
   - Total pages
   - Watermark: "Professional Transcription - Not Court Certified"

GENERATION PROCESS:
1. Parse API response using GoogleAPITranscriptTransformer class
2. Standardize timestamps to [HH:MM:SS]
3. Normalize speaker labels
4. Apply professional template formatting
5. Generate .docx file using docx.js library
6. Store temporarily in IndexedDB
7. Provide download link

REFERENCE: unified-transcription-template.md, PART 4, OPTION A
```

**2.3 Document Generation - High Court Format**

```
TEMPLATE: Template C (High Court Certified)
OUTPUT FORMAT: DOCX (Microsoft Word) - Rule 8 & 59 Compliant

STRUCTURE:
âœ" Header Section:
   - "HIGH COURT RECORD OF PROCEEDINGS" (all caps, centered)
   - "CERTIFIED TRANSCRIPTION" (all caps, centered)
   - Case number: [YYYY]/[Number]
   - Case name: [Plaintiff v Defendant]
   - Division: [Division Name and Location]
   - Date of hearing
   - Judge name
   - Proceeding type (Trial/Hearing/Deposition)

âœ" Body Section - CRITICAL REQUIREMENTS:
   - Double-spacing (2.0 line height) THROUGHOUT
   - Times New Roman, 11pt
   - 1 inch (2.54cm) margins - STRICT
   - Line numbering: Every 10th line (10, 20, 30, etc.) on left margin
   - Witness names in page headers (if evidence page)
   - Speaker format: "WITNESS: [NAME IN CAPITALS]"
   - All timestamps [HH:MM:SS]
   - Non-verbal notations: [PAUSE], [INAUDIBLE], [CROSSTALK]

âœ" Footer Section:
   - "END OF TRANSCRIPTION"
   - Transcriber certification statement
   - Document status: FINAL
   - Compliance checklist confirmation

VALIDATION CHECKS:
âœ" Verify double-spacing applied to ALL paragraphs
âœ" Confirm line numbers at every 10th line
âœ" Check margins are exactly 1 inch
âœ" Ensure no photocopy/scan artifacts (original digital only)
âœ" Verify page numbers consecutive
âœ" Confirm witness headers present if applicable

REFERENCE: unified-transcription-template.md, PART 4, OPTION C
```

### 3. TRANSLATION FUNCTIONALITY

**3.1 Language Selection Interface**

```
COMPONENT: LanguageSelector
LANGUAGES SUPPORTED:

Official SA Languages (11):
1. English (en-US)
2. Afrikaans (af-ZA)
3. IsiZulu (zu-ZA)
4. IsiXhosa (xh-ZA)
5. Sesotho (st-ZA)
6. Xitsonga (ts-ZA)
7. siSwati (ss-ZA)
8. Tshivenda (ve-ZA)
9. Ndebele (nr-ZA)
10. Sepedi (nso-ZA)
11. Setswana (tn-ZA)

Foreign Languages (Common):
- Mandarin Chinese (zh-CN)
- French (fr-FR)
- Spanish (es-ES)
- Portuguese (pt-PT)
- German (de-DE)
- Arabic (ar-SA)

UI REQUIREMENTS:
- Dropdown with flags/language names
- Auto-detect source language option
- Show estimated cost per language (see section 7)
- Warning: "Translation adds R[X] to total cost"
- Preview translation quality setting (Standard/Premium)

REFERENCE: unified-transcription-template.md, PART 8
```

**3.2 Bilingual Document Generation**

```
TEMPLATE: Template B (Professional + Translation) or Template D (High Court + Translation)
OUTPUT FORMAT: DOCX with two-column table layout

GOOGLE API TRANSLATION CALL:
{
  model: "gemini-2.5-flash",
  prompt: "Translate the following English transcript into professional [TARGET_LANGUAGE]. 
           Maintain speaker names, timestamps, and [NOTATION] unchanged. 
           Preserve structure: [HH:MM:SS] SPEAKER: translated text.
           Use formal register for court context.
           Use professional legal terminology where applicable.",
  temperature: 0.1,
  max_output_tokens: 8192
}

DOCUMENT STRUCTURE:
âœ" Two-column table (50% width each column)
âœ" Left column: Source language
âœ" Right column: Target language
âœ" Synchronized timestamps (same [HH:MM:SS] in both columns)
âœ" Synchronized speaker labels (same speaker names)
âœ" Single-spacing for Professional (Template B)
âœ" Double-spacing for High Court (Template D)
âœ" Equal column widths with light grey vertical separator
âœ" Times New Roman, 11pt in both columns

SPECIAL HANDLING:
- Afrikaans: +10-15% column width (longer words)
- IsiZulu/IsiXhosa: +20-30% column width (click consonants, longer phrases)
- Mandarin: -20-30% column width (more compact)
- Arabic: RTL support required in right column
- Font support: Arial Unicode MS for all SA languages

FOOTER ADDITIONS:
âœ" Translator certification statement
âœ" "I, [Translator Name - AI], certify faithful translation..."
âœ" Language pair noted
âœ" Translation date
âœ" NOTE: "AI-generated translation - human certification recommended for legal use"

REFERENCE: unified-transcription-template.md, PART 4, OPTION B & D
```

### 4. VOICE SYNTHESIS (TEXT-TO-SPEECH)

**4.1 Voice Synthesis Options**

```
API: Google Cloud Text-to-Speech API
CONFIGURATIONS:

STANDARD VOICES:
- Cost: $4.00 per 1M characters (R0.10 per audio minute)
- Quality: Basic neural voice
- Languages: All 11 SA official + foreign languages
- Gender selection: Male / Female

WAVENET VOICES (PREMIUM):
- Cost: $16.00 per 1M characters (R0.40 per audio minute)
- Quality: High-fidelity neural voice
- Languages: English, Afrikaans, major foreign languages
- Gender selection: Male / Female
- Emotion: Natural intonation

USER INTERFACE:
âœ" Toggle: "Add Voice Narration Download"
âœ" Radio buttons: Standard Voice / Premium Voice (WaveNet)
âœ" Speaker voice assignment:
   - Detect speaker count from transcript
   - Assign unique voice to each speaker (up to 6 speakers)
   - Male/Female selection per speaker
   - Voice preview button (5-second sample)
âœ" Cost display: "+R[X] for voice synthesis" (calculate dynamically)
âœ" Download format: MP3, 128kbps

REFERENCE: pricing-analysis-complete.md, PART 1.3 & PART 4
```

**4.2 Multi-Speaker Voice Generation**

```
PROCESS:
1. Parse transcript to identify unique speakers
2. Count total speakers (max 6 supported for unique voices)
3. User assigns gender per speaker:
   SPEAKER 1: [Male â–¼]
   SPEAKER 2: [Female â–¼]
   SPEAKER 3: [Male â–¼]
   ...

4. Map to Google TTS voices:
   English Male 1: en-US-Wavenet-D
   English Female 1: en-US-Wavenet-F
   English Male 2: en-US-Wavenet-A
   English Female 2: en-US-Wavenet-C
   (Repeat pattern for more speakers)

5. Generate audio segments per speaker
6. Concatenate segments with timestamps maintained
7. Add brief silence (0.5s) between speaker changes
8. Export as single MP3 file
9. Embed metadata: Speaker names, timestamps

PLAYBACK FEATURES:
âœ" Progress bar with timestamp markers
âœ" Click timestamp to jump to that speaker
âœ" Speed control: 0.75x, 1.0x, 1.25x, 1.5x
âœ" Download button for offline playback

ERROR HANDLING:
âœ" Fallback to standard voice if WaveNet unavailable for language
âœ" Limit speakers to 6 (warn if more detected)
âœ" Provide single-gender voice if specific voice unavailable

REFERENCE: instant-service-architecture.md, PART 2.1, Step 3
```

### 5. LOCAL STORAGE (IndexedDB) - POPIA COMPLIANCE

**5.1 IndexedDB Schema**

```
DATABASE NAME: "VCBTranscriptionApp"
VERSION: 1

OBJECT STORES:

1. "transcriptions"
   - Key: transcriptionId (auto-increment)
   - Indexes:
     * uploadDate (date, unique)
     * fileName (string)
     * duration (number)
   - Fields:
     {
       transcriptionId: number,
       fileName: string,
       fileSize: number,
       duration: string (HH:MM:SS),
       uploadDate: Date,
       sourceLanguage: string,
       targetLanguage: string | null,
       transcriptText: string,
       translationText: string | null,
       templateType: "PROFESSIONAL" | "HIGH_COURT",
       documentBlob: Blob (Word document),
       audioBlob: Blob | null (voice synthesis MP3),
       tokensCost: number,
       status: "COMPLETED" | "PROCESSING" | "FAILED"
     }

2. "userTokens"
   - Key: userId (always "local-user" for client-only)
   - Fields:
     {
       userId: "local-user",
       totalTokens: number,
       tokensUsed: number,
       tokensRemaining: number,
       lastUpdated: Date,
       transactionHistory: Array<{
         date: Date,
         type: "PURCHASE" | "USAGE",
         amount: number,
         description: string
       }>
     }

3. "settings"
   - Key: settingKey (string)
   - Fields:
     {
       settingKey: string,
       settingValue: any,
       lastModified: Date
     }

OPERATIONS:
âœ" Create database on first app load
âœ" Store completed transcriptions immediately after generation
âœ" Retrieve transcription history for display
âœ" Update token balance after each operation
âœ" Delete transcriptions older than 30 days (configurable)
âœ" Export/Import functionality for user backup

REFERENCE: instant-service-architecture.md, PART 8
```

**5.2 History Dashboard Interface**

```
COMPONENT: TranscriptionHistory
LOCATION: /history route

DISPLAY FORMAT:
âœ" Table with columns:
   - Date (YYYY-MM-DD HH:MM)
   - File Name
   - Duration
   - Language(s)
   - Type (Professional / High Court)
   - Status (Completed / Failed)
   - Actions (Download Word, Download Audio, Delete)

âœ" Filters:
   - Date range picker
   - Language filter
   - Type filter (Professional / High Court / Translation)
   - Search by file name

âœ" Sort options:
   - Most recent first (default)
   - Alphabetical by file name
   - Duration (longest/shortest)

âœ" Bulk actions:
   - Select multiple
   - Download all as ZIP
   - Delete selected
   - Export metadata as CSV

STORAGE LIMITS:
- Warn user when IndexedDB approaching 80% capacity
- Auto-delete oldest files when >90% capacity (with user permission)
- Provide "Clear All History" option with confirmation

REFERENCE: instant-service-architecture.md, PART 2.1
```

**5.3 POPIA Compliance Warnings**

```
WARNINGS DISPLAYED:

1. ON FIRST APP LOAD:
   Modal popup (dark grey background, white text):
   
   "DATA PRIVACY NOTICE
   
   Your transcriptions are stored LOCALLY on your device only.
   We do NOT store, transmit, or access your audio files or transcriptions.
   
   âœ" All data remains on YOUR device
   âœ" Files automatically deleted after 30 days
   âœ" You can export/backup your history at any time
   
   This app is fully compliant with POPIA (Protection of Personal Information Act).
   
   [I Understand] button"

2. ON EVERY UPLOAD:
   Small notice above upload button:
   "Your files are processed locally and NOT stored on our servers."

3. IN SETTINGS:
   Toggle options:
   âœ" Auto-delete files after 30 days (recommended)
   âœ" Keep files indefinitely (requires manual cleanup)
   âœ" Export history before deletion

4. BEFORE DOWNLOAD:
   Note below download button:
   "This is your only copy. Save this file securely."

LEGAL FOOTER:
On every page:
"VCB AI complies with POPIA. We do not store your data. 
 See our Privacy Policy for details."

REFERENCE: instant-service-architecture.md, PART 1.2 & Professional Profile 2.2
```

### 6. USER INTERFACE & NAVIGATION

**6.1 Main Application Structure**

```
ROUTES:

/ (Home/Upload)
  - File upload zone
  - Quick start guide
  - Pricing calculator preview
  - Token balance display (top-right corner)

/processing
  - Real-time processing status
  - Progress indicators
  - Estimated time remaining
  - Cannot navigate away while processing (warn user)

/results
  - Download options display
  - Preview first 500 words of transcript
  - Voice synthesis selection
  - Translation options
  - Cost summary breakdown
  - "Save to History" button

/history
  - Past transcriptions table
  - Filters and search
  - Download/Delete actions
  - Token usage analytics

/tokens
  - Current balance display
  - Purchase tokens interface
  - Usage history table
  - Cost breakdown per service type
  - Markup analysis (for admin view only)

/settings
  - Language preferences
  - Auto-delete settings
  - Export/Import data
  - Default template selection
  - Voice preferences

NAVIGATION BAR (Top):
[Logo] | Upload | History | Tokens | Settings | [Token Balance: X remaining]

REFERENCE: instant-service-architecture.md, PART 2
```

**6.2 Responsive Design Requirements**

```
BREAKPOINTS:
- Desktop: > 1024px (full layout)
- Tablet: 768px - 1024px (adjusted columns)
- Mobile: < 768px (single column, stacked)

MOBILE OPTIMIZATIONS:
âœ" Upload: Full-width drag zone
âœ" Processing: Vertical status indicators
âœ" Results: Stacked download buttons
âœ" History: Card view instead of table
âœ" Navigation: Hamburger menu

TOUCH TARGETS:
- Minimum 44x44px for buttons
- Increased padding for mobile inputs
- Swipe gestures for history navigation

FONT SCALING:
- Desktop: Quicksand 300 (16px body), 500 (20px headings), Bold (24px main)
- Mobile: Quicksand 300 (14px body), 500 (18px headings), Bold (20px main)

REFERENCE: Professional Profile 5.1-5.3
```

### 7. TOKEN-BASED PRICING SYSTEM

**7.1 Cost Calculation Engine**

```
API COSTS (from pricing-analysis-complete.md):

TRANSCRIPTION (Gemini):
- Input tokens: R 0.000012 per token
- Output tokens: R 0.000007 per token
- Average: 1 audio minute = 300 input tokens + 350 output tokens
- Cost per minute: R 0.17

TRANSLATION (Gemini):
- Input tokens: R 0.000012 per token  
- Output tokens: R 0.000010 per token
- Average: 1 minute transcript = 2,000 input + 2,000 output tokens
- Cost per minute: R 0.17 (approximately same as transcription)

VOICE SYNTHESIS (Google TTS):
- Standard: R 0.10 per audio minute
- WaveNet: R 0.40 per audio minute

MARKUP SCENARIOS:

OPTION 1: 30% Margin (Budget)
- Transcription: R 0.17 Ã— 1.30 = R 0.22 per minute
- Translation: R 0.17 Ã— 1.30 = R 0.22 per minute
- Voice (Standard): R 0.10 Ã— 1.30 = R 0.13 per minute
- Voice (WaveNet): R 0.40 Ã— 1.30 = R 0.52 per minute

OPTION 2: 50% Margin (Standard) **RECOMMENDED**
- Transcription: R 0.17 Ã— 1.50 = R 0.26 per minute
- Translation: R 0.17 Ã— 1.50 = R 0.26 per minute
- Voice (Standard): R 0.10 Ã— 1.50 = R 0.15 per minute
- Voice (WaveNet): R 0.40 Ã— 1.50 = R 0.60 per minute

OPTION 3: 100% Margin (Premium)
- Transcription: R 0.17 Ã— 2.00 = R 0.34 per minute
- Translation: R 0.17 Ã— 2.00 = R 0.34 per minute
- Voice (Standard): R 0.10 Ã— 2.00 = R 0.20 per minute
- Voice (WaveNet): R 0.40 Ã— 2.00 = R 0.80 per minute

FORMULA:
UserCost = (APICost Ã— MarginMultiplier) Ã— DurationMinutes

REFERENCE: pricing-analysis-complete.md, PART 6 & PART 7
```

**7.2 Token Purchase & Management**

```
TOKEN PACKAGES:

Starter:    1,000 tokens  = R 100   (R 0.10 per token)
Basic:      5,000 tokens  = R 450   (R 0.09 per token, 10% discount)
Pro:       10,000 tokens  = R 800   (R 0.08 per token, 20% discount)
Enterprise: 50,000 tokens = R 3,500 (R 0.07 per token, 30% discount)

TOKEN CONVERSION:
1 token = 1 minute of transcription service
OR
1 token = 1 minute of translation service  
OR
1 token = 1 minute of voice synthesis (weighted by type)

Example: 47-minute audio + translation + voice (standard)
- Transcription: 47 tokens
- Translation: 47 tokens
- Voice: 47 tokens
- TOTAL: 141 tokens consumed

USER INTERFACE:
âœ" Display token balance prominently (top-right corner)
âœ" Real-time cost calculator on upload page:
   "Estimated cost: X tokens (R Y.YY)"
âœ" Warning when balance < estimated cost
âœ" Redirect to purchase page if insufficient tokens
âœ" Purchase confirmation email (optional user input)

PAYMENT INTEGRATION:
- PayFast (South African payment gateway)
- Stripe (International)
- Generate unique order ID per purchase
- Store transaction in IndexedDB (local only)
- No server-side payment storage (POPIA compliance)

REFERENCE: instant-service-architecture.md, PART 6.1 & pricing-analysis-complete.md, PART 3.3
```

**7.3 Admin Cost Analysis Dashboard**

```
COMPONENT: AdminCostDashboard (Password protected)
LOCATION: /admin/costs

DISPLAY METRICS:

1. COST BREAKDOWN TABLE:
   | Service Type | API Cost | User Price (30%) | User Price (50%) | User Price (100%) | Margin |
   |--------------|----------|------------------|------------------|-------------------|--------|
   | Transcription| R 0.17   | R 0.22          | R 0.26           | R 0.34            | R 0.09-0.17 |
   | Translation  | R 0.17   | R 0.22          | R 0.26           | R 0.34            | R 0.09-0.17 |
   | Voice (Std)  | R 0.10   | R 0.13          | R 0.15           | R 0.20            | R 0.03-0.10 |
   | Voice (Wave) | R 0.40   | R 0.52          | R 0.60           | R 0.80            | R 0.12-0.40 |

2. USAGE STATISTICS:
   - Total tokens purchased (all users)
   - Total tokens consumed
   - Average tokens per transaction
   - Most common service combinations
   - Peak usage times

3. REVENUE ANALYSIS:
   - Total revenue (R)
   - Total API costs (R)
   - Gross profit (R)
   - Profit margin (%)
   - Break-even point (tokens)

4. COMPETITIVE POSITIONING:
   - Your price vs Competitor A (First Corp Sec: R 20-28/min)
   - Your price vs Competitor B (Transcribe Africa: R 15-40/min)
   - Your price vs SA Government (R 100/page ≈ R 250/min)
   - Savings percentage displayed

EXPORT OPTIONS:
âœ" Export to CSV
âœ" Generate PDF report
âœ" Monthly summary email

REFERENCE: pricing-analysis-complete.md, PART 7
```

### 8. QUALITY ASSURANCE & VALIDATION

**8.1 Document Validation Checklist**

```
AUTOMATED CHECKS:

Professional Template (Template A):
âœ" Font: Times New Roman, 11pt
âœ" Line spacing: Single (1.0)
âœ" Margins: 1 inch all sides
âœ" Speaker labels: Bold format applied
âœ" Timestamps: All in [HH:MM:SS] format
âœ" Page numbers: Consecutive
âœ" No orphaned timestamps (timestamp without speaker)
âœ" Watermark present: "Professional Transcription - Not Court Certified"

High Court Template (Template C):
âœ" Font: Times New Roman, 11pt
âœ" Line spacing: Double (2.0) THROUGHOUT
âœ" Margins: Exactly 1 inch (2.54cm) all sides
âœ" Line numbering: Every 10th line (10, 20, 30...)
âœ" Witness headers: Present if evidence page
âœ" Speaker format: Uppercase (WITNESS, COUNSEL FOR PLAINTIFF)
âœ" No photocopy artifacts (original digital)
âœ" Page numbers: Consecutive
âœ" Double-spacing between entries maintained

Bilingual Template (Template B/D):
âœ" Two-column table: Equal width (50% each)
âœ" Timestamps synchronized (same [HH:MM:SS] in both columns)
âœ" Speaker labels aligned vertically
âœ" Font supports all characters (Arial Unicode MS for SA languages)
âœ" Translation quality check (min 85% confidence)
âœ" Translator certification statement present
âœ" Column widths adjusted for language (Afrikaans +15%, IsiZulu +30%, etc.)

MANUAL REVIEW PROMPTS:
After generation, show user:
"Please review your document checklist:
 âœ" All speaker names correct?
 âœ" Timestamps accurate?
 âœ" Non-verbal notations appropriate?
 âœ" Translation (if applicable) reads naturally?
 
 [Confirm & Download] or [Re-generate with corrections]"

REFERENCE: unified-transcription-template.md, PART 7
```

**8.2 Error Handling & User Feedback**

```
ERROR SCENARIOS:

1. API Failure (Google Gemini/TTS unavailable):
   - Display: "Service temporarily unavailable. Retry in 30 seconds."
   - Action: Auto-retry 3 times with exponential backoff (5s, 15s, 45s)
   - Fallback: Store audio in IndexedDB with "PENDING" status for later processing

2. Insufficient Tokens:
   - Display: "Insufficient tokens. You need X more tokens (R Y.YY)."
   - Action: Redirect to /tokens purchase page
   - Option: "Save this job and purchase tokens later"

3. Unsupported File Format:
   - Display: "File format not supported. Please upload MP3, WAV, M4A, FLAC, Opus, MP4, MOV, or AVI."
   - Action: Clear upload zone, allow re-upload

4. File Too Large (>500MB):
   - Display: "File exceeds 500MB limit. Please split or compress your file."
   - Action: Provide link to compression guide

5. Duration Too Long (>2 hours):
   - Display: "Recording exceeds 2-hour limit. Please split into shorter segments."
   - Action: Suggest timestamps for manual splitting

6. Transcription Quality Low (<70% confidence):
   - Display: "Audio quality appears low. Transcription may contain errors."
   - Action: Offer options:
     âœ" Continue anyway (with disclaimer)
     âœ" Upload higher quality audio
     âœ" Cancel and refund tokens

7. Translation Unavailable for Language:
   - Display: "Translation to [Language] temporarily unavailable."
   - Action: Offer alternative languages or transcription-only

8. IndexedDB Storage Full:
   - Display: "Local storage full. Please delete old transcriptions or export history."
   - Action: Open /history with pre-selected oldest files for deletion

LOGGING:
- All errors logged to browser console only (no server-side logging)
- User-facing error messages are clear, actionable, and non-technical
- Provide "Report Issue" button that copies error details to clipboard for support

REFERENCE: google-api-integration.md, PART 7
```

### 9. TESTING & DEPLOYMENT CHECKLIST

**9.1 Pre-Deployment Testing**

```
FUNCTIONAL TESTS:

âœ" Upload & Validation:
   - Upload valid file (MP3, 30min, <100MB)
   - Upload invalid format (TXT file) → Error message
   - Upload oversized file (>500MB) → Error message
   - Upload >2 hour file → Error message

âœ" Transcription:
   - Verify API call to Gemini
   - Check timestamp format [HH:MM:SS]
   - Verify speaker identification
   - Confirm non-verbal notations [PAUSE], [INAUDIBLE]

âœ" Document Generation:
   - Generate Professional template → Verify format
   - Generate High Court template → Verify double-spacing + line numbers
   - Generate Bilingual template → Verify two-column layout

âœ" Translation:
   - Translate to Afrikaans → Check column width adjustment
   - Translate to IsiZulu → Check font rendering (click consonants)
   - Translate to Mandarin → Check character display

âœ" Voice Synthesis:
   - Generate standard voice MP3
   - Generate WaveNet voice MP3
   - Verify speaker differentiation (male/female voices)
   - Check audio quality and synchronization

âœ" IndexedDB Storage:
   - Store transcription in IndexedDB
   - Retrieve from history
   - Delete transcription
   - Export history as backup
   - Import history from backup

âœ" Token System:
   - Purchase tokens (mock payment)
   - Consume tokens on transcription
   - Display updated balance
   - Warn on insufficient tokens
   - Block service if zero balance

âœ" POPIA Compliance:
   - Verify NO server-side data storage
   - Confirm privacy warning displays on first load
   - Check auto-delete after 30 days (if enabled)
   - Test export functionality

REFERENCE: unified-transcription-template.md, PART 7 & instant-service-architecture.md, PART 8
```

**9.2 Performance Benchmarks**

```
TARGET PERFORMANCE:

Upload Speed:
- 100MB file → <10 seconds upload time (on 10Mbps connection)

Processing Time:
- 30-minute audio → 15-30 seconds API response
- UI shows 45-60 seconds estimated (builds confidence)

Document Generation:
- Professional template → <2 seconds
- High Court template → <3 seconds (line numbering adds overhead)
- Bilingual template → <5 seconds (translation + two-column layout)

Voice Synthesis:
- Standard voice, 30min → <20 seconds generation
- WaveNet voice, 30min → <40 seconds generation

IndexedDB Operations:
- Store 50MB document → <1 second
- Retrieve document → <0.5 seconds
- Query history (100 records) → <1 second

Page Load Times:
- Initial app load → <2 seconds (including assets)
- Navigation between routes → <0.5 seconds
- History page with 100 records → <3 seconds

OPTIMIZATION:
âœ" Lazy load components (React.lazy for routes)
âœ" Compress document blobs before storing in IndexedDB
âœ" Implement virtual scrolling for history table (if >100 records)
âœ" Cache static assets (logo, fonts) with service worker
âœ" Use web workers for heavy processing (document generation, blob compression)

REFERENCE: instant-service-architecture.md, PART 3.2
```

---

## TECHNOLOGY STACK

```
FRONTEND:
- React 18+ (with Hooks)
- TypeScript (strict mode)
- React Router v6 (client-side routing)
- Tailwind CSS (with custom Cleaner Theme config)
- docx.js (Word document generation)
- IndexedDB (via idb library wrapper)

STATE MANAGEMENT:
- React Context API + useReducer (global state)
- React Query (API calls & caching)

API INTEGRATION:
- Google Generative AI API (Gemini 2.5 Flash)
- Google Cloud Text-to-Speech API
- Axios (HTTP client with interceptors)

BUILD TOOLS:
- Vite (bundler)
- ESLint + Prettier (code quality)
- Vitest (unit testing)
- Playwright (E2E testing)

DEPLOYMENT:
- Vercel / Netlify (static hosting)
- CloudFlare CDN (asset delivery)
- Google Cloud Storage (temporary file staging)

REFERENCE: Professional Profile 7.1-7.3, instant-service-architecture.md PART 3.2
```

---

## CONFIGURATION FILES

**9.3 Environment Variables (.env)**

```
# Google API Keys
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_TTS_API_KEY=your_tts_api_key_here

# Payment Gateway
VITE_PAYFAST_MERCHANT_ID=your_payfast_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_payfast_merchant_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key

# App Configuration
VITE_APP_NAME=VCB Transcription Service
VITE_APP_VERSION=1.0.0
VITE_MAX_FILE_SIZE_MB=500
VITE_MAX_DURATION_MINUTES=120
VITE_AUTO_DELETE_DAYS=30

# Pricing Configuration (50% Margin)
VITE_TRANSCRIPTION_COST_PER_MIN=0.26
VITE_TRANSLATION_COST_PER_MIN=0.26
VITE_VOICE_STANDARD_COST_PER_MIN=0.15
VITE_VOICE_WAVENET_COST_PER_MIN=0.60

# Feature Flags
VITE_ENABLE_VOICE_SYNTHESIS=true
VITE_ENABLE_TRANSLATION=true
VITE_ENABLE_HIGH_COURT=true
VITE_ENABLE_ADMIN_DASHBOARD=false

REFERENCE: Professional Profile 7.1, instant-service-architecture.md PART 3.3
```

**9.4 Tailwind Configuration (Cleaner Theme)**

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'vcb-black': '#000000',
        'vcb-dark-grey': '#333333',
        'vcb-mid-grey': '#808080',
        'vcb-light-grey': '#E0E0E0',
        'vcb-white': '#FFFFFF',
      },
      fontFamily: {
        quicksand: ['Quicksand', 'sans-serif'],
      },
      fontWeight: {
        light: 300,
        medium: 500,
        bold: 700,
      },
      spacing: {
        // 80% whitespace enforcement
        section: '4rem',
        component: '2rem',
        element: '1rem',
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      borderColor: {
        DEFAULT: '#E0E0E0',
      },
    },
  },
  plugins: [],
};

// REFERENCE: Professional Profile 5.1-5.3
```

---

## DEPLOYMENT STEPS

```
STEP 1: Pre-Deployment Checklist
âœ" All functional tests passing (9.1)
âœ" Performance benchmarks met (9.2)
âœ" Environment variables configured (.env)
âœ" API keys validated (Google Gemini + TTS)
âœ" Payment gateway integrated (PayFast/Stripe)
âœ" POPIA compliance verified
âœ" Logo and assets optimized
âœ" Cleaner Theme applied consistently

STEP 2: Build Production Bundle
$ npm run build
âœ" Verify bundle size < 2MB (excluding assets)
âœ" Check no console errors/warnings
âœ" Validate source maps generated

STEP 3: Deploy to Vercel/Netlify
$ vercel --prod
OR
$ netlify deploy --prod
âœ" Configure custom domain (e.g., transcribe.vcb-ai.online)
âœ" Enable HTTPS (automatic with Vercel/Netlify)
âœ" Set environment variables in hosting dashboard

STEP 4: CloudFlare CDN Configuration
âœ" Point domain DNS to CloudFlare
âœ" Enable caching for static assets (images, fonts)
âœ" Set cache TTL: 1 hour for HTML, 1 week for assets
âœ" Enable Brotli compression

STEP 5: Post-Deployment Verification
âœ" Test upload on production URL
âœ" Verify API calls work (Gemini + TTS)
âœ" Check IndexedDB operations
âœ" Test token purchase flow (use test payment gateway)
âœ" Validate document downloads (DOCX + MP3)
âœ" Check mobile responsiveness
âœ" Verify POPIA warning displays

STEP 6: Monitoring Setup
âœ" Enable Vercel/Netlify analytics
âœ" Set up error tracking (Sentry - optional, client-side only)
âœ" Monitor API usage (Google Cloud Console)
âœ" Track token sales and consumption
âœ" Set up uptime monitoring (UptimeRobot)

REFERENCE: instant-service-architecture.md PART 8.4
```

---

## CRITICAL REMINDERS FOR CLAUDE CODE

**1. POPIA COMPLIANCE (MOST IMPORTANT)**
- NEVER store user data server-side
- ALL storage must be in browser IndexedDB only
- Display privacy warnings prominently
- Auto-delete files after 30 days (configurable)
- No cookies, no tracking, no analytics that identify users

**2. CLEANER THEME (DESIGN SYSTEM)**
- Colors: Black, Dark Grey, Mid Grey, Light Grey, White ONLY
- Typography: Quicksand 300/500/Bold
- 80%+ whitespace, no shadows, no gradients
- Logo ALWAYS on dark background
- High contrast black text on white backgrounds

**3. COURT COMPLIANCE**
- High Court templates MUST have double-spacing (2.0) throughout
- Line numbers MUST be every 10th line on left margin
- Margins MUST be exactly 1 inch (2.54cm) all sides
- Times New Roman, 11pt ONLY
- No photocopy/scan artifacts (original digital only)

**4. DOCUMENT GENERATION**
- Use docx.js library (NOT server-side generation)
- Apply correct template based on user selection
- Validate formatting before providing download
- Include watermark for non-certified documents

**5. API ERROR HANDLING**
- Retry failed API calls 3 times (exponential backoff)
- Provide clear, actionable error messages
- Never expose API keys in client-side code (use env variables)
- Log errors to browser console only (no server logging)

**6. TOKEN SYSTEM**
- Deduct tokens AFTER successful generation (not before)
- Display real-time cost estimates before processing
- Block service if insufficient tokens
- Store token balance in IndexedDB (user-specific)

**7. VOICE SYNTHESIS**
- Map unique voices to each speaker (max 6 speakers)
- Allow user to assign male/female per speaker
- Generate single concatenated MP3 file
- Embed timestamps as metadata in MP3

**8. TRANSLATION**
- Adjust column widths based on target language
  - Afrikaans: +10-15%
  - IsiZulu/IsiXhosa: +20-30%
  - Mandarin: -20-30%
- Use Arial Unicode MS for SA languages
- Synchronize timestamps in both columns
- Add AI disclaimer in footer

**9. TESTING**
- Test with 30-minute sample audio (various languages)
- Verify all templates generate correctly
- Check IndexedDB operations
- Test token deduction
- Validate POPIA compliance

**10. PERFORMANCE**
- Lazy load routes (React.lazy)
- Use web workers for document generation
- Compress blobs before IndexedDB storage
- Implement virtual scrolling for history (if >100 records)
- Cache static assets with service worker

---

## CONTACT & REFERENCES

**Project Lead:** Tommy Ferreira
**Email:** tommy@vcb-ai.online
**Company:** VCB (Viable Core Business)
**Website:** https://vcb-ai.online

**Documentation References:**
- instant-service-architecture.md (Full system architecture)
- pricing-analysis-complete.md (Cost calculations and markup scenarios)
- google-api-integration.md (API integration technical details)
- unified-transcription-template.md (Document templates and formatting rules)
- Professional Profile Operating Spec (Design system and standards)

**Compliance Standards:**
- POPIA (Protection of Personal Information Act) - South Africa
- Supreme Court Rule 8 (High Court transcription formatting)
- Supreme Court Rule 59 (Sworn translator certification)
- SATI (South African Translators' Institute) Professional Standards

---

## VERSION CONTROL

**Document Version:** 1.0
**Last Updated:** November 2, 2025
**Target Completion:** [Insert deadline]
**Status:** READY FOR IMPLEMENTATION

---

**END OF SPECIFICATION DOCUMENT**

This specification provides comprehensive instructions for implementing the VCB Instant Transcription Service. All requirements are traceable to source documents and professional profile specifications (ref: paragraph 1.3). Proceed with implementation following enterprise-grade standards (ref: paragraph 1.3, 7.2).