# Q Business Setup Instructions

## Step 1: Create Q Business Application

1. Go to AWS Console → Amazon Q Business (af-south-1)
2. Create application:
   - Name: `vcb-transcription-assistant`
   - Type: Business
   - Enable API access: ✅

3. Note your Application ID (starts with `q-app-`)

## Step 2: Add Data Source (Choose One)

### Option A: S3 Bucket
- Create S3 bucket: `vcb-transcription-docs`
- Upload: FAQs, user guides, transcription tips
- Add as data source in Q Business

### Option B: Web Crawler
- Add your website URL
- Configure crawl depth: 2-3 levels
- Include documentation pages

## Step 3: Configure Access

1. Under "Access" → Connect IAM Identity Center
2. Create group: `vcb-admin-users`
3. Add only your admin account
4. Enable API access for group

## Step 4: Update Secrets Manager

Replace `REPLACE_WITH_Q_APP_ID` with your actual Application ID:

```bash
aws secretsmanager update-secret \
  --secret-id vcb-q-business-config \
  --secret-string '{"applicationId":"q-app-YOUR-ACTUAL-ID","encryptionKeyAlias":"alias/aws/secretsmanager"}' \
  --region af-south-1
```

## Step 5: Deploy Infrastructure

```bash
cd aws
chmod +x deploy.sh
./deploy.sh
```

## Step 6: Update Environment

Copy the API URL from deploy output to `.env.local`:
```
VITE_Q_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
```

## Step 7: Test

```bash
npm run dev
```

Log in and test Q Assistant widget.

## Important Notes

- Q Business bills per seat (~$20/month per user)
- Keep to admin account only initially
- Monitor usage in AWS Cost Explorer
- Add more users only when needed