# Gemini Proxy Deployment Checklist

## ✅ Pre-Deployment

- [ ] AWS CLI installed and configured
- [ ] Gemini API key ready
- [ ] Supabase project configured

## 🚀 Deployment Steps

### 1. Store Gemini API Key
```bash
aws secretsmanager update-secret \
  --secret-id vcb-gemini-config \
  --secret-string "{\"apiKey\":\"YOUR-GEMINI-API-KEY\"}" \
  --region af-south-1
```

### 2. Deploy Infrastructure
```bash
cd aws
deploy.bat  # Windows
# or
./deploy.sh  # Mac/Linux
```

### 3. Update Environment Variables
Copy the API endpoint from deployment output to `.env.local`:
```
VITE_Q_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
VITE_GEMINI_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
```

### 4. Test Locally
```bash
npm run dev
```

1. Log in with Supabase
2. Look for AI Assistant widget (bottom-right)
3. Ask: "How do I transcribe audio files?"
4. Verify response

## 📊 Post-Deployment

### Monitor
- CloudWatch Logs: `/aws/lambda/vcb-gemini-proxy`
- API Gateway metrics
- Gemini API usage

### Set Up Alarms
```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name vcb-gemini-proxy-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=vcb-gemini-proxy \
  --region af-south-1
```

## 💰 Cost Tracking

Expected monthly costs (1000 requests):
- Lambda: $0.10
- Secrets Manager: $0.40
- API Gateway: $0.04
- Gemini API: ~$0.50

**Total: ~$1.04/month**

## 🔒 Security Checklist

- [x] API key stored in Secrets Manager
- [x] JWT verification enabled
- [x] 4000 character input limit
- [x] CORS restricted to localhost
- [x] All infrastructure in af-south-1
- [x] No conversation storage

## 🐛 Troubleshooting

### Assistant not responding
1. Check `.env.local` has `VITE_GEMINI_PROXY_URL`
2. Verify Supabase session is active
3. Check CloudWatch logs for errors

### 401 Unauthorized
1. Verify Supabase JWT is valid
2. Check JWKS URL in Lambda environment

### 500 Internal Server Error
1. Check Gemini API key in Secrets Manager
2. Verify Lambda has Secrets Manager permissions
3. Review CloudWatch logs

## 📈 Optional Enhancements

### Add Response Caching
Cache common questions to reduce API calls

### Implement Throttling
Limit requests per user to control costs

### Add Analytics
Track popular questions and response times