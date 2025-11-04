# Secure Gemini Proxy Setup

## Overview
Secure Lambda proxy in af-south-1 that keeps your Gemini API key server-side while maintaining SA data residency.

## Setup Steps

### 1. Update Secrets Manager
```bash
aws secretsmanager update-secret --secret-id vcb-gemini-config --secret-string "{\"apiKey\":\"YOUR-GEMINI-API-KEY\"}" --region af-south-1
```

### 2. Deploy Infrastructure
```bash
cd aws && deploy.bat
```

### 3. Update Environment
Add to `.env.local`:
```
VITE_GEMINI_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
```

### 4. Use Local AI Assistant
```jsx
import LocalAIAssistant from './local-ai-assistant';

// In your app:
<LocalAIAssistant />
```

## Security Features
- ✅ JWT verification with Supabase
- ✅ API key stored in Secrets Manager
- ✅ 4000 character input limit
- ✅ CORS protection
- ✅ SA data residency compliant

## Cost
- Lambda: ~$0.0001 per request
- Secrets Manager: $0.40/month
- API Gateway: $0.0035 per 10K requests
- Gemini API: Same as direct usage

## Benefits
- API key never exposed to browser
- Secure authentication required
- Runs only in af-south-1
- POPIA compliant
- Minimal infrastructure cost