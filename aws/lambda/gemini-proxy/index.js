const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const jwt = require('jsonwebtoken');
const https = require('https');
const jwkToPem = require('jwk-to-pem');

const secretsClient = new SecretsManagerClient({ region: 'af-south-1' });

const JWKS_TTL_MS = 5 * 60 * 1000;
let jwksCache = { keys: null, fetchedAt: 0 };
let geminiKeyCache = { key: null, fetchedAt: 0 };

const parseAllowedOrigins = (raw) => {
    if (!raw) return ['*'];
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

const resolveCorsOrigin = (requestOrigin) => {
    if (allowedOrigins.includes('*')) {
        return requestOrigin || '*';
    }

    if (!requestOrigin) {
        return allowedOrigins[0] || '';
    }

    const normalizedRequestOrigin = requestOrigin.toLowerCase();
    const normalizedAllowed = allowedOrigins.map((origin) => origin.toLowerCase());
    const matchedIndex = normalizedAllowed.indexOf(normalizedRequestOrigin);

    if (matchedIndex !== -1) {
        return allowedOrigins[matchedIndex];
    }

    return allowedOrigins[0] || '';
};

const buildCorsHeaders = (requestOrigin, requestedHeaders) => {
    const origin = resolveCorsOrigin(requestOrigin);
    const headers = {
        'Access-Control-Allow-Headers': requestedHeaders || 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
        'Vary': 'Origin'
    };

    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
};

const fetchJWKS = () => {
    const jwksUrl = process.env.SUPABASE_JWKS_URL;
    return new Promise((resolve, reject) => {
        https.get(jwksUrl, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch JWKS: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).keys || []);
                } catch (e) {
                    reject(new Error('Invalid JWKS response'));
                }
            });
        }).on('error', reject);
    });
};

const getJwksKeys = async () => {
    const now = Date.now();
    if (jwksCache.keys && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
        return jwksCache.keys;
    }
    const keys = await fetchJWKS();
    jwksCache = { keys, fetchedAt: now };
    return keys;
};

const verifySupabaseJWT = async (token) => {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) throw new Error('Token missing key id');
    
    const keys = await getJwksKeys();
    const jwk = keys.find(key => key.kid === decoded.header.kid);
    if (!jwk) throw new Error('Signing key not found');
    
    const publicKey = jwkToPem(jwk);
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    if (!payload?.sub) throw new Error('Invalid token payload');
    
    return payload;
};

const getGeminiKey = async () => {
    const now = Date.now();
    if (geminiKeyCache.key && now - geminiKeyCache.fetchedAt < JWKS_TTL_MS) {
        return geminiKeyCache.key;
    }
    
    const command = new GetSecretValueCommand({ SecretId: 'vcb-gemini-config' });
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString);
    
    geminiKeyCache = { key: secret.apiKey, fetchedAt: now };
    return secret.apiKey;
};

const callGemini = (apiKey, message) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    const data = JSON.stringify({
        contents: [{
            parts: [{
                text: `You are a helpful assistant for VCB Transcription Services. Help users with transcription, translation, and document formatting questions.

Context: This is a transcription service that converts audio to text, translates to 17 languages, generates voice synthesis, and creates High Court compliant documents.

User question: ${message}`
            }]
        }]
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    reject(new Error('Invalid Gemini response'));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

exports.handler = async (event) => {
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    const requestedHeaders = event.headers?.['access-control-request-headers'] || event.headers?.['Access-Control-Request-Headers'] || '';
    const headers = buildCorsHeaders(requestOrigin, requestedHeaders);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Missing authorization' })
            };
        }

        await verifySupabaseJWT(authHeader.substring(7));
        
        const { message } = JSON.parse(event.body || '{}');
        if (!message || typeof message !== 'string' || message.length > 4000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid message' })
            };
        }

        const apiKey = await getGeminiKey();
        const response = await callGemini(apiKey, message.trim());
        
        const aiMessage = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: aiMessage })
        };

    } catch (error) {
        console.error('Gemini Proxy Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};