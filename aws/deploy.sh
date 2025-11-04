#!/bin/bash

# Deploy Amazon Q Business Infrastructure
echo "Deploying Amazon Q Business Infrastructure..."

# Set region
REGION="af-south-1"
SUPABASE_JWKS_URL=${SUPABASE_JWKS_URL:-"https://kzjjkorirrrcqlhcdyqg.supabase.co/auth/v1/.well-known/jwks.json"}

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/q-infrastructure.yaml \
  --stack-name vcb-q-business \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION \
  --parameter-overrides CorsOrigin="http://localhost:5173" SupabaseJwksUrl="$SUPABASE_JWKS_URL"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name vcb-q-business \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "API Endpoint: $API_ENDPOINT"

# Package and deploy Lambda
cd lambda/q-proxy
npm install
zip -r ../../q-proxy.zip .
cd ../..

aws lambda update-function-code \
  --function-name vcb-q-proxy \
  --zip-file fileb://q-proxy.zip \
  --region $REGION

echo "Deployment complete!"
echo "Update your .env.local with: VITE_Q_PROXY_URL=$API_ENDPOINT"