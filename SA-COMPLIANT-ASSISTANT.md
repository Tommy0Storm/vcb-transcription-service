# SA Data Residency Compliant AI Assistant

## Problem
- Amazon Q Business not available in af-south-1
- Cannot move data outside South Africa
- Cannot expose API keys in browser

## Solution
Secure Gemini Proxy in af-south-1:
- ✅ API key stored in AWS Secrets Manager
- ✅ JWT verification with Supabase
- ✅ Lambda proxy in af-south-1
- ✅ Same UI as Q Assistant
- ✅ POPIA compliant

## Usage

Already integrated in main app:
```jsx
// Already imported in vcb-transcription-service.jsx:
import LocalAIAssistant from './local-ai-assistant';

// Already rendered:
<LocalAIAssistant />
```

## Features
- Transcription service help
- Translation guidance  
- Document formatting tips
- High Court compliance info
- Token usage questions

## Data Flow
1. User types question (authenticated via Supabase)
2. Secure call to af-south-1 Lambda proxy
3. Lambda validates JWT and fetches API key from Secrets Manager
4. Lambda calls Gemini API and returns response
5. Response displayed locally
6. No conversation data stored

## Cost
- Lambda: ~$0.0001 per request
- Secrets Manager: $0.40/month
- API Gateway: $0.0035 per 10K requests
- Gemini API: Same cost as transcription service

## Environment Variables
Both required in `.env.local`:
```
VITE_Q_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
VITE_GEMINI_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
```

## Compliance
- ✅ API key never exposed to browser
- ✅ All infrastructure in af-south-1
- ✅ JWT authentication required
- ✅ No conversation storage
- ✅ POPIA compliant