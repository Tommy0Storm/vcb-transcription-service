const { QBusinessClient, ChatCommand } = require('@aws-sdk/client-qbusiness');
const jwt = require('jsonwebtoken');
const https = require('https');
const jwkToPem = require('jwk-to-pem');

const qClient = new QBusinessClient({ region: 'af-south-1' });

const JWKS_TTL_MS = 5 * 60 * 1000; // 5 minutes
let jwksCache = { keys: null, fetchedAt: 0 };

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

const buildCorsHeaders = (requestOrigin) => {
    const origin = resolveCorsOrigin(requestOrigin);
    const headers = {
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
    if (!jwksUrl) {
        throw new Error('Supabase JWKS URL not configured');
    }

    return new Promise((resolve, reject) => {
        https
            .get(jwksUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch JWKS: ${res.statusCode}`));
                    res.resume();
                    return;
                }

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed.keys || []);
                    } catch (parseError) {
                        reject(new Error('Unable to parse JWKS response'));
                    }
                });
            })
            .on('error', (err) => {
                reject(new Error(`JWKS request failed: ${err.message}`));
            });
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

const getSigningKey = async (kid) => {
    const keys = await getJwksKeys();
    const jwk = keys.find((key) => key.kid === kid);

    if (!jwk) {
        // Refresh cache in case key rotated
        jwksCache = { keys: null, fetchedAt: 0 };
        const refreshedKeys = await getJwksKeys();
        const refreshedJwk = refreshedKeys.find((key) => key.kid === kid);
        if (!refreshedJwk) {
            throw new Error('Signing key not found');
        }
        return jwkToPem(refreshedJwk);
    }

    return jwkToPem(jwk);
};

const verifySupabaseJWT = async (token) => {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) {
        throw new Error('Token missing key id');
    }

    const publicKey = await getSigningKey(decoded.header.kid);

    const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
    });

    if (!payload?.sub) {
        throw new Error('Token payload missing subject');
    }

    return payload;
};

exports.handler = async (event) => {
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    const headers = buildCorsHeaders(requestOrigin);

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

        const token = authHeader.substring(7);
        const payload = await verifySupabaseJWT(token);
        
        const body = JSON.parse(event.body || '{}');
        const { message, conversationId } = body;
        
        // Input validation
        if (!message || typeof message !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required' })
            };
        }
        
        if (message.length > 4000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message too long' })
            };
        }
        
        const params = {
            applicationId: process.env.Q_APPLICATION_ID,
            userId: payload.sub,
            userMessage: { messageBody: message.trim() }
        };

        if (conversationId && typeof conversationId === 'string') {
            params.conversationId = conversationId;
        }

        const command = new ChatCommand(params);
        const response = await qClient.send(command);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: response.systemMessage,
                conversationId: response.conversationId,
                sourceAttributions: response.sourceAttributions
            })
        };

    } catch (error) {
        console.error('Q Proxy Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};