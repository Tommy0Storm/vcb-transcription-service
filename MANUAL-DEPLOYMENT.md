# Manual Deployment Instructions

Since AWS CLI is not installed, follow these manual steps:

## Step 1: Install AWS CLI
```bash
# Download and install AWS CLI v2 from:
# https://awscli.amazonaws.com/AWSCLIV2.msi

# Configure with your credentials:
aws configure
```

## Step 2: Create Q Business Application
1. Go to: https://af-south-1.console.aws.amazon.com/amazonq/business/applications
2. Click "Create application"
3. Name: `vcb-transcription-assistant`
4. Type: Business
5. Enable API access: ✅
6. Note your Application ID (starts with `q-app-`)

## Step 3: Update Secrets Manager
Replace `YOUR-APP-ID` with your actual Application ID:
```bash
aws secretsmanager update-secret --secret-id vcb-q-business-config --secret-string "{\"applicationId\":\"q-app-YOUR-APP-ID\",\"encryptionKeyAlias\":\"alias/aws/secretsmanager\"}" --region af-south-1
```

## Step 4: Deploy Infrastructure
```bash
cd aws
deploy.bat
```

## Step 5: Update Environment
Copy the API URL from deployment output to `.env.local`:
```
VITE_Q_PROXY_URL=https://your-api-id.execute-api.af-south-1.amazonaws.com/prod
```

## Step 6: Test
```bash
npm run dev
```

## Alternative: Manual CloudFormation Deployment

1. Go to CloudFormation console: https://af-south-1.console.aws.amazon.com/cloudformation
2. Create stack → Upload template → Select `aws/cloudformation/q-infrastructure.yaml`
3. Set parameters:
   - CorsOrigin: `http://localhost:5173`
   - SupabaseJwksUrl: `https://kzjjkorirrrcqlhcdyqg.supabase.co/auth/v1/.well-known/jwks.json`
4. Create stack
5. Get API endpoint from Outputs tab
6. Manually upload Lambda code via AWS Console