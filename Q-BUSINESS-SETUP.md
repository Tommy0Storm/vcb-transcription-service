# AI Assistant Setup Guide

## Current Setup: Secure Gemini Proxy

Since Q Business is not available in af-south-1, we use a secure Gemini proxy that keeps your API key server-side.

## Prerequisites
- AWS CLI configured with af-south-1 region
- Gemini API key
- Node.js 18+

## Step 1: Store Gemini API Key Securely

```bash
aws secretsmanager update-secret --secret-id vcb-gemini-config --secret-string "{\"apiKey\":\"YOUR-GEMINI-API-KEY\"}" --region af-south-1
```

## Step 2: Deploy Infrastructure

```bash
cd aws
chmod +x deploy.sh
./deploy.sh
```

## Step 3: Update Environment

Add both URLs to `.env.local`:
```
VITE_Q_PROXY_URL=https://your-api-gateway-url.execute-api.af-south-1.amazonaws.com/prod
VITE_GEMINI_PROXY_URL=https://your-api-gateway-url.execute-api.af-south-1.amazonaws.com/prod
```

## Step 4: Test AI Assistant

The LocalAIAssistant is already integrated in your main app.

1. Run `npm run dev`
2. Log in with Supabase
3. See AI Assistant widget (bottom-right)
4. Ask: "How do I transcribe audio files?"
5. Verify Gemini-powered response

## Monitoring

- CloudWatch Logs: `/aws/lambda/vcb-gemini-proxy`
- API Gateway metrics in CloudWatch
- Gemini API usage via Google Cloud Console

## Cost Management

- Lambda: ~$0.0001 per request
- Secrets Manager: $0.40/month
- API Gateway: $0.0035 per 10K requests
- Gemini API: Same cost as transcription service

## Security

- AI Assistant only works for authenticated users
- All requests validated via Supabase JWT
- API key never exposed to browser
- 4000 character input limit
- No conversation data stored (POPIA compliant)

## Troubleshooting

### 401 Unauthorized
- Check Supabase session is valid
- Verify JWT token in request headers

### 500 Internal Server Error
- Check CloudWatch logs for Lambda errors
- Verify Gemini API key in Secrets Manager
- Ensure IAM permissions are correct

### No Response from AI
- Check Gemini API key in Secrets Manager
- Verify Lambda has Secrets Manager permissions
- Check CloudWatch logs for API errors

## Next Steps

1. Add response caching for common questions
2. Implement request throttling
3. Set up CloudWatch alarms
4. Monitor Gemini API usage