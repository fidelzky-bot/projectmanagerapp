const jwt = require('jsonwebtoken');
const axios = require('axios');
const JWT_SECRET = process.env.JWT_SECRET;

let cachedPublicKey = null;

async function getClerkPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  // Clerk JWKS endpoint
  const region = process.env.CLERK_JWT_ISSUER;
  const jwksUrl = `${region}/.well-known/jwks.json`;
  const { data } = await axios.get(jwksUrl);
  // Get the first key (Clerk uses a single key)
  const jwk = data.keys[0];
  // Convert JWK to PEM
  const pubKey = jwkToPem(jwk);
  cachedPublicKey = pubKey;
  return pubKey;
}

// Helper to convert JWK to PEM
function jwkToPem(jwk) {
  // Minimal conversion for Clerk's RSA keys
  const { n, e } = jwk;
  const pub = {
    kty: 'RSA',
    n: n,
    e: e
  };
  const pem = require('jwk-to-pem')(pub);
  return pem;
}

async function clerkAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const publicKey = await getClerkPublicKey();
    const payload = jwt.verify(token, publicKey, {
      issuer: process.env.CLERK_JWT_ISSUER
    });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;