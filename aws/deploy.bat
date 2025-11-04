@echo off
echo Deploying Amazon Q Business Infrastructure...

set REGION=af-south-1
set SUPABASE_JWKS_URL=https://kzjjkorirrrcqlhcdyqg.supabase.co/auth/v1/.well-known/jwks.json

echo Deploying CloudFormation stack...
aws cloudformation deploy ^
  --template-file cloudformation/q-infrastructure.yaml ^
  --stack-name vcb-q-business ^
  --capabilities CAPABILITY_NAMED_IAM ^
  --region %REGION% ^
  --parameter-overrides CorsOrigin="http://localhost:5173" SupabaseJwksUrl="%SUPABASE_JWKS_URL%"

echo Getting API endpoint...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name vcb-q-business --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue" --output text') do set API_ENDPOINT=%%i

echo API Endpoint: %API_ENDPOINT%

echo Packaging Q Proxy Lambda...
cd lambda\q-proxy
call npm install
powershell Compress-Archive -Path * -DestinationPath ..\..\q-proxy.zip -Force
cd ..\..

echo Packaging Gemini Proxy Lambda...
cd lambda\gemini-proxy
call npm install
powershell Compress-Archive -Path * -DestinationPath ..\..\gemini-proxy.zip -Force
cd ..\..

echo Updating Lambda functions...
aws lambda update-function-code ^
  --function-name vcb-q-proxy ^
  --zip-file fileb://q-proxy.zip ^
  --region %REGION%

aws lambda update-function-code ^
  --function-name vcb-gemini-proxy ^
  --zip-file fileb://gemini-proxy.zip ^
  --region %REGION%

echo.
echo Deployment complete!
echo Update your .env.local with:
echo VITE_Q_PROXY_URL=%API_ENDPOINT%
echo VITE_GEMINI_PROXY_URL=%API_ENDPOINT%