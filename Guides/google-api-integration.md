# GOOGLE GENERATIVE API TRANSCRIPTION INTEGRATION TEMPLATE
## Direct API Output to Professional & High Court Formats

---

# TABLE OF CONTENTS

1. Google Generative API Response Structure
2. API Output Parsing Guidelines
3. Field Mapping Reference
4. Template Adaptation for API Output
5. Data Transformation Scripts
6. JSON Request Examples
7. Complete Integration Workflow
8. Validation Checklist for API Integration

---

# PART 1: GOOGLE GENERATIVE API RESPONSE STRUCTURE

## Gemini API Audio Transcription Output Format

When using Google's Generative AI (Gemini) API for audio transcription, the API returns the transcribed content as plain text in the `response.text` field. The API does NOT automatically return structured speaker identification, timestamps, or metadata—these must be requested or processed through additional prompts.

### Basic API Response Structure

```json
{
  "response": {
    "text": "Generated transcript of the speech.",
    "candidates": [
      {
        "content": {
          "parts": [
            {
              "text": "Transcript content here"
            }
          ],
          "role": "model"
        }
      }
    ]
  }
}
```

### Key Characteristics of Gemini Transcription Output

**What the API Provides:**
- ✓ Full transcript text as continuous plain text
- ✓ Confidence scoring (optional, with appropriate prompt)
- ✓ Basic formatting if requested in prompt
- ✓ Support for all 11 official SA languages plus foreign languages

**What the API Does NOT Provide Automatically:**
- ✗ Speaker identification/diarization (requires specific configuration)
- ✗ Timestamps (unless explicitly requested in prompt)
- ✗ Paragraph breaks in correct positions
- ✗ Non-verbal notation markers
- ✗ Metadata headers
- ✗ Line numbering for High Court compliance

---

## API Request for Structured Transcription Output

### Python Example - Basic Transcription

```python
from google import genai

client = genai.Client()

# Upload audio file
myfile = client.files.upload(file='path/to/audio.mp3')

# Request transcript with desired format
prompt = '''Generate a detailed transcript of the speech with:
1. Speaker identification (label speakers as SPEAKER 1, SPEAKER 2, etc.)
2. Timestamps at every speaker change (format: [HH:MM:SS])
3. Non-verbal notations: [PAUSE], [INAUDIBLE], [LAUGHTER], etc.
4. Return as plain text, one speaker per line
5. Format: [HH:MM:SS] SPEAKER NAME: Text content here'''

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=[prompt, myfile]
)

# Extract transcript
transcript = response.text
print(transcript)
```

### Python Example - JSON Structured Output

```python
from google import genai
from pydantic import BaseModel
from typing import List

# Define structured output schema
class SpeakerSegment(BaseModel):
    timestamp: str  # Format: [HH:MM:SS]
    speaker_id: str  # Speaker 1, Speaker 2, etc.
    text: str
    confidence: float  # 0.0-1.0
    non_verbal: List[str]  # [PAUSE], [INAUDIBLE], etc.

class TranscriptionOutput(BaseModel):
    segments: List[SpeakerSegment]
    total_duration: str
    language: str
    accuracy: float

client = genai.Client()

myfile = client.files.upload(file='path/to/audio.mp3')

prompt = '''Transcribe the following audio with structured output:
- Identify each speaker (label as Speaker 1, Speaker 2, etc.)
- Provide timestamp for each speaker change
- Include confidence score for each segment
- Note any non-verbal elements
Return as JSON matching the schema provided.'''

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=[prompt, myfile],
    config={
        'response_mime_type': 'application/json',
        'response_schema': TranscriptionOutput
    }
)

# Parse JSON response
import json
transcript_data = json.loads(response.text)
```

### JavaScript Example - API Integration

```javascript
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const ai = new GoogleGenAI({});

async function transcribeAudio(audioFilePath) {
  // Upload audio file
  const myfile = await ai.files.upload({
    file: audioFilePath,
    config: { mimeType: "audio/mpeg" }
  });

  // Generate transcription with structured format
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      `Generate a transcript with timestamps [HH:MM:SS] and speaker labels. 
       Format each speaker change as: [HH:MM:SS] SPEAKER NAME: text content`
    ])
  });

  return result.text;
}
```

---

## Google Cloud Speech-to-Text API vs Gemini API

### Important Distinction

**Google Cloud Speech-to-Text API:**
- Returns structured data with `transcript`, `confidence`, `timings`, `words`
- Provides word-level timing information
- Limited to speech-only (no speaker diarization by default)
- Requires separate speaker diarization configuration
- Returns data in specific API response format

**Google Generative AI (Gemini) API:**
- Returns text-based transcription in natural language format
- Can include speaker identification if requested in prompt
- Can include timestamps if requested in prompt
- More flexible for custom formatting
- Returns plain text or JSON (if structured output configured)
- Better for natural-language-based processing

**For this template, we focus on Gemini API**, which is more flexible for generating properly formatted transcripts compatible with professional and court templates.

---

# PART 2: API OUTPUT PARSING GUIDELINES

## Step 1: Extract Raw Transcript from API Response

### From Gemini Text Response

```python
# Raw API response contains response.text field
response_text = response.text

# Extract just the transcript portion if there's metadata
transcript = response_text.strip()

# Save to variable for processing
raw_transcript = transcript
```

### From Gemini JSON Response

```python
import json

# Parse JSON response
transcript_json = json.loads(response.text)

# Extract segments and rebuild formatted transcript
formatted_lines = []
for segment in transcript_json['segments']:
    timestamp = segment['timestamp']  # Already formatted [HH:MM:SS]
    speaker = segment['speaker_id']
    text = segment['text']
    
    formatted_line = f"{timestamp}\n\n**{speaker.upper()}:**\n{text}\n"
    formatted_lines.append(formatted_line)

raw_transcript = "\n".join(formatted_lines)
```

---

## Step 2: Identify and Parse Timestamps

### Timestamp Pattern Recognition

```python
import re

# Pattern to identify timestamps in format [HH:MM:SS]
timestamp_pattern = r'\[(\d{2}):(\d{2}):(\d{2})\]'

# Find all timestamps in transcript
timestamps = re.findall(timestamp_pattern, raw_transcript)

# Validate timestamp format
def validate_timestamp(timestamp_str):
    """Validate [HH:MM:SS] format"""
    pattern = r'^\[\d{2}:\d{2}:\d{2}\]$'
    return re.match(pattern, timestamp_str) is not None

# Find any malformed timestamps and fix them
def standardize_timestamps(text):
    # Fix timestamps that might be [H:MM:SS] → [0H:MM:SS]
    text = re.sub(r'\[(\d):(\d{2}):(\d{2})\]', r'[0\1:\2:\3]', text)
    # Fix timestamps that might be [HH:M:SS] → [HH:0M:SS]
    text = re.sub(r'\[(\d{2}):(\d):(\d{2})\]', r'[\1:0\2:\3]', text)
    # Fix timestamps that might be [HH:MM:S] → [HH:MM:0S]
    text = re.sub(r'\[(\d{2}):(\d{2}):(\d)\]', r'[\1:\2:0\3]', text)
    return text

corrected_transcript = standardize_timestamps(raw_transcript)
```

---

## Step 3: Parse and Normalize Speaker Identifications

### Speaker Pattern Recognition

```python
# Pattern to identify speaker labels (various formats from API)
speaker_patterns = [
    r'SPEAKER\s+(\d+)',      # SPEAKER 1, SPEAKER 2
    r'SPEAKER_(\d+)',        # SPEAKER_1
    r'SPEAKER\.(\d+)',       # SPEAKER.1
    r'(\w+)(?:\s+speaking)?:', # NAME:
    r'Participant\s+(\d+)',  # Participant 1
]

def identify_speaker(line):
    """Extract speaker identifier from line"""
    for pattern in speaker_patterns:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            return match.group(0).upper()
    return None

# Normalize all speaker labels to consistent format
def normalize_speakers(text):
    """Convert all speaker formats to: **SPEAKER NAME:**"""
    
    # Map found speakers to standardized format
    speaker_map = {}
    speaker_count = 1
    
    lines = text.split('\n')
    normalized_lines = []
    
    for line in lines:
        speaker = identify_speaker(line)
        if speaker:
            if speaker not in speaker_map:
                speaker_map[speaker] = f"SPEAKER {speaker_count}"
                speaker_count += 1
            
            # Remove old speaker label and add normalized one
            content = re.sub(
                r'.*?:\s*',  # Remove original speaker label and colon
                '',
                line
            )
            normalized_line = f"**{speaker_map[speaker]}:**\n{content}"
            normalized_lines.append(normalized_line)
        else:
            normalized_lines.append(line)
    
    return "\n".join(normalized_lines), speaker_map
```

---

## Step 4: Detect and Standardize Non-Verbal Notations

### Non-Verbal Element Detection

```python
# Map API output variations to standard notations
non_verbal_mappings = {
    # Pause variations
    r'\[pause[\s\-_]*(?:for\s+)?(\d+)s(?:\s+)?(?:seconds)?\]': r'[PAUSE - \1 seconds]',
    r'\{pause[\s\-_]*(\d+)s\}': r'[PAUSE - \1 seconds]',
    r'\<pause[\s\-_]*(\d+)s\>': r'[PAUSE - \1 seconds]',
    r'pause[\s\-_]*(\d+)s': r'[PAUSE - \1 seconds]',
    
    # Inaudible variations
    r'\[inaudible\]': '[INAUDIBLE]',
    r'\{inaudible\}': '[INAUDIBLE]',
    r'\<inaudible\>': '[INAUDIBLE]',
    r'\[unintelligible\]': '[INAUDIBLE]',
    
    # Laughter variations
    r'\[laugh(?:ter)?\]': '[LAUGHTER]',
    r'\{laugh(?:ter)?\}': '[LAUGHTER]',
    r'\<laugh(?:ter)?\>': '[LAUGHTER]',
    
    # Silence
    r'\[silence\]': '[PAUSE - 3 seconds]',
    r'\[silence[\s\-_]*(\d+)s\]': r'[PAUSE - \1 seconds]',
    
    # Background noise
    r'\[(?:background\s+)?noise[\s\-_]*:\s*(.+?)\]': r'[BACKGROUND NOISE: \1]',
    r'\{(?:background\s+)?noise[\s\-_]*:\s*(.+?)\}': r'[BACKGROUND NOISE: \1]',
    
    # Other sounds
    r'\[cough(?:s)?\]': '[COUGHS]',
    r'\[clea(?:r|rs)\s+throat\]': '[CLEARS THROAT]',
    r'\[clears[\s\-_]*throat\]': '[CLEARS THROAT]',
    r'\[sigh(?:s)?\]': '[SIGHS]',
}

def standardize_notations(text):
    """Convert all non-verbal notations to standard format"""
    standardized = text
    
    for pattern, replacement in non_verbal_mappings.items():
        standardized = re.sub(pattern, replacement, standardized, flags=re.IGNORECASE)
    
    return standardized
```

---

## Step 5: Clean Up Formatting

```python
def clean_transcript_formatting(text):
    """Remove extra spaces, fix line breaks, ensure proper formatting"""
    
    # Remove excessive blank lines (keep max 2 consecutive)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Fix spacing around speaker labels
    text = re.sub(r'\n+(\*\*.*?\*\*:)', r'\n\n\1', text)
    
    # Fix spacing around timestamps
    text = re.sub(r'\n+(\[\d{2}:\d{2}:\d{2}\])', r'\n\n\1', text)
    
    # Ensure single space after periods
    text = re.sub(r'\.\s{2,}', '. ', text)
    
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split('\n')]
    
    # Rejoin with proper spacing
    text = '\n'.join(lines)
    
    return text
```

---

# PART 3: FIELD MAPPING REFERENCE

## API Response → Template Fields

| Template Field | API Source | Default if Missing | Processing Required |
|---|---|---|---|
| **Document Title** | Manual input | "Untitled Transcription" | User-provided |
| **Recording Date** | API metadata | Current date | Extract from file metadata or user input |
| **Recording Duration** | API metadata | Calculate from transcript | Use total_duration field if provided |
| **Source Language** | API configuration | en-US | From language_code parameter |
| **Speaker Names** | Transcript content | SPEAKER 1, SPEAKER 2 | Parse from transcript or manual mapping |
| **Timestamps** | Transcript content | Generate from word timings | Parse [HH:MM:SS] format |
| **Transcript Text** | response.text | [field name].candidates[0].content.parts[0].text | Extract and clean |
| **Confidence Scores** | Optional in response | N/A | Extract if provided in response |

---

## Speaker Identification Mapping

### Auto-Generated Speaker Mapping

```python
def create_speaker_mapping(transcript_text):
    """Generate speaker ID to label mapping"""
    
    speakers_found = set()
    speaker_mapping = {}
    
    # Extract unique speakers from transcript
    lines = transcript_text.split('\n')
    for line in lines:
        speaker = identify_speaker(line)
        if speaker and speaker not in speakers_found:
            speakers_found.add(speaker)
    
    # Create mapping
    for i, speaker in enumerate(sorted(speakers_found), 1):
        speaker_mapping[speaker] = f"SPEAKER {i}"
    
    return speaker_mapping

# Use mapping throughout document
speaker_mapping = create_speaker_mapping(raw_transcript)
```

---

# PART 4: TEMPLATE ADAPTATION FOR API OUTPUT

## Step-by-Step Integration Process

### Stage 1: Initialize Template with API Data

```python
from datetime import datetime

# Extract API response data
api_transcript = response.text
api_model = "gemini-2.5-flash"
api_timestamp = datetime.now()

# Initialize template dictionary
template_data = {
    'document_title': 'API Transcription - [Specify Name]',
    'creation_date': api_timestamp.strftime('%Y-%m-%d'),
    'recording_date': '[YYYY-MM-DD]',  # To be filled
    'duration': '[HH:MM:SS]',  # To be filled
    'source_language': 'English',  # Update based on API config
    'transcriber_method': 'Google Generative AI API (Gemini)',
    'api_model_used': api_model,
    'transcription_type': 'Verbatim',
    'raw_transcript': api_transcript,
}
```

### Stage 2: Process and Clean Transcript

```python
# Apply all cleaning and standardization functions
processed_transcript = api_transcript

# Step 1: Standardize timestamps
processed_transcript = standardize_timestamps(processed_transcript)

# Step 2: Normalize speakers
processed_transcript, speaker_mapping = normalize_speakers(processed_transcript)

# Step 3: Standardize notations
processed_transcript = standardize_notations(processed_transcript)

# Step 4: Clean formatting
processed_transcript = clean_transcript_formatting(processed_transcript)

# Store processed data
template_data['processed_transcript'] = processed_transcript
template_data['speaker_mapping'] = speaker_mapping
```

### Stage 3: Prepare for Template Insertion

```python
# Parse into structured segments for template insertion
segments = parse_transcript_into_segments(processed_transcript)

template_data['segments'] = segments
# Each segment contains: timestamp, speaker, text, notations

# Additional processing for High Court format
if template_type == 'HIGH_COURT':
    template_data['line_numbers'] = generate_line_numbers(segments)
    template_data['page_breaks'] = calculate_page_breaks(segments)
    template_data['witness_headers'] = extract_witness_headers(segments)
```

---

## Complete Data Flow Diagram

```
Google Generative API
        ↓
  response.text
        ↓
Raw Transcript String
        ↓
Standardize Timestamps [HH:MM:SS]
        ↓
Normalize Speakers (SPEAKER 1, SPEAKER 2)
        ↓
Standardize Non-Verbal Notations
        ↓
Clean Formatting
        ↓
Parse into Segments
        ↓
Generate Metadata
        ↓
Select Template (A/B/C/D)
        ↓
Apply Template Formatting
        ↓
Final Document (DOCX/PDF)
```

---

# PART 5: DATA TRANSFORMATION SCRIPTS

## Python Script - Complete API to Template Conversion

```python
import re
import json
from datetime import datetime
from typing import Dict, List, Tuple

class GoogleAPITranscriptTransformer:
    """Transform Google Generative API output to professional templates"""
    
    def __init__(self, api_response_text: str, template_type: str = 'PROFESSIONAL'):
        self.raw_text = api_response_text
        self.template_type = template_type  # PROFESSIONAL, HIGH_COURT, BILINGUAL
        self.processed_text = ""
        self.speaker_mapping = {}
        self.segments = []
    
    def standardize_timestamps(self) -> str:
        """Ensure all timestamps follow [HH:MM:SS] format"""
        text = self.raw_text
        
        # Fix malformed timestamps
        text = re.sub(r'\[(\d):(\d{2}):(\d{2})\]', r'[0\1:\2:\3]', text)
        text = re.sub(r'\[(\d{2}):(\d):(\d{2})\]', r'[\1:0\2:\3]', text)
        text = re.sub(r'\[(\d{2}):(\d{2}):(\d)\]', r'[\1:\2:0\3]', text)
        
        return text
    
    def normalize_speakers(self) -> Tuple[str, Dict]:
        """Normalize speaker identifications"""
        text = self.standardize_timestamps()
        
        speaker_patterns = [
            r'(?:SPEAKER|Speaker)\s+(\d+)',
            r'(?:SPEAKER|Speaker)_(\d+)',
            r'(?:SPEAKER|Speaker)\.(\d+)',
            r'(?:PARTICIPANT|Participant)\s+(\d+)',
        ]
        
        speakers_found = {}
        speaker_count = 1
        lines = text.split('\n')
        normalized_lines = []
        
        for line in lines:
            original_speaker = None
            for pattern in speaker_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    original_speaker = re.search(pattern, line, re.IGNORECASE).group(0)
                    break
            
            if original_speaker:
                if original_speaker not in speakers_found:
                    speakers_found[original_speaker] = f"SPEAKER {speaker_count}"
                    speaker_count += 1
                
                # Extract content and rebuild line
                content = re.sub(r'.*?:\s*', '', line).strip()
                new_line = f"**{speakers_found[original_speaker]}:**\n{content}"
                normalized_lines.append(new_line)
            else:
                normalized_lines.append(line)
        
        self.speaker_mapping = speakers_found
        return "\n".join(normalized_lines), speakers_found
    
    def standardize_notations(self, text: str) -> str:
        """Convert non-verbal notations to standard format"""
        
        replacements = {
            r'\[pause[\s\-_]*(\d+)s(?:\s+)?(?:seconds)?\]': r'[PAUSE - \1 seconds]',
            r'\[(?:in)?audible\]': '[INAUDIBLE]',
            r'\[laugh(?:ter)?\]': '[LAUGHTER]',
            r'\[silence[\s\-_]*(\d+)s\]': r'[PAUSE - \1 seconds]',
            r'\[cough(?:s)?\]': '[COUGHS]',
            r'\[clea(?:r|rs)\s+throat\]': '[CLEARS THROAT]',
            r'\[sigh(?:s)?\]': '[SIGHS]',
        }
        
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
    
    def clean_formatting(self, text: str) -> str:
        """Clean up text formatting"""
        
        # Remove excessive blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Fix spacing around speaker labels
        text = re.sub(r'\n+(\*\*.*?\*\*:)', r'\n\n\1', text)
        
        # Fix spacing around timestamps
        text = re.sub(r'\n+(\[\d{2}:\d{2}:\d{2}\])', r'\n\n\1', text)
        
        # Clean up lines
        lines = [line.rstrip() for line in text.split('\n')]
        
        return '\n'.join(lines)
    
    def parse_into_segments(self, text: str) -> List[Dict]:
        """Parse text into structured segments"""
        
        segments = []
        timestamp_pattern = r'\[(\d{2}):(\d{2}):(\d{2})\]'
        speaker_pattern = r'\*\*(.+?)\*\*:'
        
        current_segment = None
        lines = text.split('\n')
        
        for line in lines:
            # Check for timestamp
            timestamp_match = re.match(timestamp_pattern, line)
            if timestamp_match:
                if current_segment:
                    segments.append(current_segment)
                current_segment = {
                    'timestamp': timestamp_match.group(0),
                    'speaker': '',
                    'text': '',
                    'notations': []
                }
            
            # Check for speaker label
            speaker_match = re.search(speaker_pattern, line)
            if speaker_match and current_segment:
                current_segment['speaker'] = speaker_match.group(1)
                # Extract text after speaker label
                text_start = line.find(speaker_match.group(0)) + len(speaker_match.group(0))
                current_segment['text'] = line[text_start:].strip()
            elif current_segment and line.strip():
                # Continuation of speaker text or notation
                if line.strip().startswith('['):
                    current_segment['notations'].append(line.strip())
                else:
                    current_segment['text'] += ' ' + line.strip()
        
        if current_segment:
            segments.append(current_segment)
        
        return segments
    
    def transform(self) -> Dict:
        """Execute complete transformation"""
        
        # Stage 1: Standardize timestamps
        text = self.standardize_timestamps()
        
        # Stage 2: Normalize speakers
        text, speakers = self.normalize_speakers()
        
        # Stage 3: Standardize notations
        text = self.standardize_notations(text)
        
        # Stage 4: Clean formatting
        text = self.clean_formatting(text)
        
        # Stage 5: Parse into segments
        segments = self.parse_into_segments(text)
        
        # Store results
        self.processed_text = text
        self.segments = segments
        
        return {
            'processed_text': self.processed_text,
            'speaker_mapping': self.speaker_mapping,
            'segments': self.segments,
            'template_type': self.template_type,
            'segment_count': len(segments),
            'unique_speakers': len(set(s['speaker'] for s in segments))
        }


# Usage Example
if __name__ == '__main__':
    # Get API response (from Google Generative API)
    # api_response_text = response.text
    
    api_response_text = """[00:00:15]
SPEAKER 1: Good morning, thank you for joining us today.
[00:00:25]
SPEAKER 2: Thank you for having me.
[00:00:35]
SPEAKER 1: [pause - 2 seconds] Let's begin by discussing the project."""
    
    # Transform
    transformer = GoogleAPITranscriptTransformer(
        api_response_text, 
        template_type='PROFESSIONAL'
    )
    
    result = transformer.transform()
    
    print("Transformed Transcript:")
    print(result['processed_text'])
    print("\nSegments:", result['segment_count'])
    print("Speakers:", result['unique_speakers'])
```

---

# PART 6: JSON REQUEST EXAMPLES FOR DIFFERENT SCENARIOS

## Scenario 1: Professional Transcription (Non-Court)

### Request Structure

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "file_data": {
            "mime_type": "audio/mpeg",
            "file_uri": "gs://generative-ai-api/path/to/audio.mp3"
          }
        },
        {
          "text": "Generate a professional transcription with these requirements:\n1. Identify each speaker (label as SPEAKER 1, SPEAKER 2, etc.)\n2. Add timestamps in format [HH:MM:SS] at each speaker change\n3. Include non-verbal elements: [PAUSE - X seconds], [LAUGHTER], [CLEARS THROAT]\n4. Format: [HH:MM:SS] SPEAKER N: transcribed text\n5. Use single spacing between lines\n6. For any unclear audio, mark as [INAUDIBLE]\nReturn plain text format."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 64,
    "maxOutputTokens": 8192
  }
}
```

---

## Scenario 2: High Court Transcription (Court-Required Format)

### Request Structure

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "file_data": {
            "mime_type": "audio/mpeg",
            "file_uri": "gs://generative-ai-api/path/to/court_recording.mp3"
          }
        },
        {
          "text": "Generate a High Court certified transcription:\n1. Verbatim transcription (preserve all words, stutters, hesitations)\n2. Speaker identification: COUNSEL FOR PLAINTIFF, WITNESS, THE COURT, etc.\n3. Timestamps [HH:MM:SS] at every speaker change\n4. Mark hesitations: [PAUSE - X seconds], [VOCAL FILLER: um/uh]\n5. Non-verbal: [CROSSTALK], [INAUDIBLE], [CLEARS THROAT]\n6. Use [sic] for exact quote preservation\n7. Format for double-spacing compliance\n8. Every sentence on new line where possible\nReturn as plain text ready for Word document formatting."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 16384
  }
}
```

---

## Scenario 3: Bilingual Transcription with Translation

### Request Structure - Phase 1 (Transcription)

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "file_data": {
            "mime_type": "audio/mpeg",
            "file_uri": "gs://generative-ai-api/path/to/english_audio.mp3"
          }
        },
        {
          "text": "Transcribe this English audio:\n1. Speaker identification: SPEAKER 1, SPEAKER 2, etc.\n2. Timestamps [HH:MM:SS] at speaker changes\n3. Non-verbal markers\n4. Format: [HH:MM:SS] SPEAKER N: text\nReturn plain text suitable for side-by-side translation layout."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "topP": 0.95,
    "topK": 64,
    "maxOutputTokens": 8192
  }
}
```

### Request Structure - Phase 2 (Professional Translation)

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Translate the following English transcript into professional Afrikaans (South African spelling). Maintain speaker names, timestamps, and non-verbal notations exactly as provided. Preserve the structure: [HH:MM:SS] SPEAKER: translated text\n\n[ENGLISH TRANSCRIPT INSERTED HERE]\n\nReturn with:\n1. All timestamps unchanged\n2. All speaker labels unchanged\n3. All [NOTATION] unchanged\n4. Only translate the actual spoken content\n5. Use formal 'u' (not 'jy') for court context\n6. Use professional legal terminology"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 8192
  }
}
```

---

## Scenario 4: Multi-Language Support (All 11 SA Languages)

### Request Template - Any SA Language

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "file_data": {
            "mime_type": "audio/mpeg",
            "file_uri": "gs://generative-ai-api/path/to/audio.mp3"
          }
        },
        {
          "text": "Transcribe this audio in [SELECT LANGUAGE]:\n- Language code: [LANGUAGE_CODE]\n- Speaker identification required\n- Timestamps in [HH:MM:SS] format\n- All non-verbal markers\n- Preserve exact wording (verbatim)\nReturn in format: [HH:MM:SS] SPEAKER N: text"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2
  }
}
```

### Language Code Reference

```
en-US      = English
af-ZA      = Afrikaans (South African)
zu-ZA      = IsiZulu
xh-ZA      = IsiXhosa
st-ZA      = Sesotho
ts-ZA      = Xitsonga
ss-ZA      = siSwati
ve-ZA      = Tshivenda
nr-ZA      = Ndebele
nso-ZA     = Sepedi
tn-ZA      = Setswana
```

---

# PART 7: COMPLETE INTEGRATION WORKFLOW

## End-to-End Process: Audio File to Final Document

### Phase 1: Prepare Audio File

```python
# Ensure audio file is in supported format
supported_formats = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/opus', 'audio/amr']

audio_file = 'court_hearing_2025-11-02.mp3'
audio_format = 'audio/mpeg'
audio_duration = '00:47:32'  # Should be under 1 hour for best results
```

### Phase 2: Upload to Google Generative API

```python
from google import genai

client = genai.Client(api_key='YOUR_API_KEY')

# Upload file
file_response = client.files.upload(file=audio_file)
file_uri = file_response.uri

print(f"File uploaded: {file_uri}")
```

### Phase 3: Request Transcription with Formatting

```python
# Select template type
template_type = 'HIGH_COURT'  # or 'PROFESSIONAL', 'BILINGUAL'

# Prepare prompt based on template type
prompts = {
    'PROFESSIONAL': """Generate a professional transcription...
        [Full prompt from PART 6]""",
    
    'HIGH_COURT': """Generate a High Court certified transcription...
        [Full prompt from PART 6]""",
    
    'BILINGUAL': """Transcribe with bilingual formatting...
        [Full prompt from PART 6]"""
}

prompt = prompts[template_type]

# Call API
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=[
        {
            'role': 'user',
            'parts': [
                genai.Part(uri=file_uri, mime_type='audio/mpeg'),
                genai.Part(text=prompt)
            ]
        }
    ],
    generation_config={
        'temperature': 0.1 if 'HIGH_COURT' in template_type else 0.2,
        'top_p': 0.95,
        'top_k': 40 if 'HIGH_COURT' in template_type else 64,
        'max_output_tokens': 16384
    }
)

transcript_text = response.text
```

### Phase 4: Transform API Output

```python
# Use transformer class from PART 5
transformer = GoogleAPITranscriptTransformer(
    transcript_text,
    template_type=template_type
)

transformation_result = transformer.transform()

processed_transcript = transformation_result['processed_text']
segments = transformation_result['segments']
speaker_mapping = transformation_result['speaker_mapping']
```

### Phase 5: Populate Template

```python
# Create template data dictionary
template_data = {
    'document_title': 'Case 2025/1234 - Court Hearing Transcript',
    'creation_date': '2025-11-02',
    'recording_date': '2025-11-02',
    'duration': audio_duration,
    'source_language': 'English',
    'transcriber_method': 'Google Generative AI (Gemini API)',
    'api_model': 'gemini-2.5-flash',
    'template_type': template_type,
    'segments': segments,
    'speaker_mapping': speaker_mapping,
    'processed_transcript': processed_transcript,
}

# Add template-specific fields
if template_type == 'HIGH_COURT':
    template_data['case_number'] = '2025/1234'
    template_data['division'] = 'Gauteng Division, Johannesburg'
    template_data['judge'] = 'Honourable Judge Name'
    template_data['parties'] = ['Plaintiff v Defendant']
    template_data['double_spacing'] = True
    template_data['line_numbers'] = True
```

### Phase 6: Generate Word Document

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Create new Document
doc = Document()

# Add header
header = doc.add_paragraph()
header.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = header.add_run(template_data['document_title'])
run.font.size = Pt(14)
run.font.bold = True

# Add metadata
metadata = doc.add_paragraph()
metadata.add_run(f"Date: {template_data['creation_date']}\n")
metadata.add_run(f"Duration: {template_data['duration']}\n")
metadata.add_run(f"Language: {template_data['source_language']}\n")
metadata.add_run(f"Method: {template_data['transcriber_method']}")
metadata.paragraph_format.space_after = Pt(12)

# Add line separator
doc.add_paragraph('_' * 70)

# Add transcription content with proper formatting
for segment in template_data['segments']:
    # Add timestamp
    ts_para = doc.add_paragraph(segment['timestamp'])
    ts_para.style = 'Normal'
    
    # Add speaker and text
    content_para = doc.add_paragraph()
    speaker_run = content_para.add_run(f"**{segment['speaker']}:** ")
    speaker_run.bold = True
    content_para.add_run(segment['text'])
    
    # Add notations if present
    for notation in segment['notations']:
        notation_para = doc.add_paragraph(notation)
        notation_para.style = 'Normal'
    
    # Add spacing between segments
    doc.add_paragraph()

# Add footer with certification (if High Court)
if template_type == 'HIGH_COURT':
    doc.add_paragraph('_' * 70)
    
    cert_para = doc.add_paragraph("END OF TRANSCRIPTION")
    cert_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph()
    doc.add_paragraph("TRANSCRIBER CERTIFICATION:")
    doc.add_paragraph(f"Transcribed by: Google Generative AI API (Gemini)\n"
                      f"Date: {template_data['creation_date']}\n"
                      f"Document Status: [DRAFT/FINAL]")

# Save document
output_filename = f"{template_data['creation_date']}_Case_{template_data.get('case_number', 'Unknown')}_Transcript.docx"
doc.save(output_filename)

print(f"Document saved: {output_filename}")
```

### Phase 7: Validation and Review

```python
# Run validation checklist
from templates import validation_checklist

validation_results = validation_checklist.validate_high_court_document(
    doc_path=output_filename,
    template_type=template_type
)

if validation_results['passed']:
    print("✓ Document passed all validation checks")
else:
    print("✗ Validation issues found:")
    for issue in validation_results['issues']:
        print(f"  - {issue}")
```

---

# PART 8: VALIDATION CHECKLIST FOR API INTEGRATION

## Pre-API Submission Checklist

- [ ] Audio file format supported (MP3, WAV, FLAC, Opus, AMR)
- [ ] Audio quality is acceptable (clear, not heavily compressed)
- [ ] Audio duration is under 1 hour (optimal for API)
- [ ] File size is reasonable (typically <100MB for audio)
- [ ] API key is valid and has sufficient quota
- [ ] Google Cloud account has Generative AI API enabled

---

## Post-API Response Validation

### Response Structure Validation

- [ ] Response contains `response.text` field
- [ ] Text is non-empty
- [ ] Text contains recognizable content (not error message)
- [ ] No API error indicators in response
- [ ] Response doesn't indicate "unsupported audio format"

### Transcript Content Validation

- [ ] Timestamps present: [HH:MM:SS] format
- [ ] At least one speaker identified
- [ ] Speaker labels consistent (no random changes)
- [ ] Non-verbal markers present where appropriate
- [ ] Text doesn't appear to be corrupted
- [ ] Language matches expected language
- [ ] No unexplained gaps in content
- [ ] Confidence in transcription appears reasonable

### Format Compliance Validation

**For Professional Templates:**
- [ ] Timestamps standardized to [HH:MM:SS]
- [ ] Speaker labels are capitalized and consistent
- [ ] Single-spacing applied (no double-spacing)
- [ ] Metadata fields completed
- [ ] No line numbering (unless requested)

**For High Court Templates:**
- [ ] Double-spacing applied (2.0 line spacing)
- [ ] Every 10th line numbered (10, 20, 30, etc.)
- [ ] Margins are exactly 1 inch (2.54cm)
- [ ] Witness names appear in page headers
- [ ] Font is Times New Roman, 11pt
- [ ] Page numbers present and sequential
- [ ] Double-spacing between speaker entries

**For Bilingual Templates:**
- [ ] Two-column layout created
- [ ] Columns are equal width (50% each)
- [ ] Timestamps synchronized in both columns
- [ ] Speaker labels aligned vertically
- [ ] Translation quality is acceptable
- [ ] Terminology is consistent between columns
- [ ] Translator certification complete

---

## Post-Document Generation Validation

### Document Structure

- [ ] Header section complete with all metadata
- [ ] Body section contains all transcript segments
- [ ] Footer section present with certification
- [ ] Page breaks occur in appropriate places (not mid-sentence)
- [ ] No formatting errors or corruption

### Content Accuracy

- [ ] Transcription matches API output (no text added/removed)
- [ ] All timestamps present and correct
- [ ] All speakers properly identified
- [ ] All notations present and properly formatted
- [ ] No confidential information exposed inappropriately

### Technical Requirements (High Court)

- [ ] Document opens without errors
- [ ] Double-spacing maintained throughout
- [ ] Line numbers visible and correct
- [ ] Margins verified (1 inch all sides)
- [ ] Font consistent (Times New Roman, 11pt)
- [ ] Binding specifications can be met

---

## Final QA Checklist Before File Delivery

- [ ] Document has been proofread (recommend 2x for High Court)
- [ ] Spelling verified in all languages used
- [ ] Grammar checked
- [ ] Technical terminology verified
- [ ] All speaker names verified and spelled correctly
- [ ] All timestamps verified against source audio (sample check)
- [ ] Certification statements complete and accurate
- [ ] Metadata accurate and complete
- [ ] File naming follows convention: `[YYYY-MM-DD]_[Type]_[SourceLang]-[TargetLang]_[Status].docx`
- [ ] File saved and backed up
- [ ] Version control noted (if applicable)

---

**Integration Guide Version:** 1.0
**Last Updated:** November 2, 2025
**Compatible APIs:** Google Generative AI (Gemini), Google Cloud Speech-to-Text
**Template Types Supported:** A, B, C, D (Professional, Professional+Translation, High Court, High Court+Translation)
**Languages Supported:** All 11 Official SA Languages + Foreign Languages
**Output Formats:** DOCX, PDF