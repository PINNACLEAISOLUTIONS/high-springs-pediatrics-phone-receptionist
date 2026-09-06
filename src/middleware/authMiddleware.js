const crypto = require('crypto');

/**
 * HTTP Basic Auth for the clinical portal and its data APIs.
 *
 * Exempt: /api/health and the Vapi webhook routes (/api/vapi/*), which carry
 * their own auth (see webhookAuth.js).
 *
 * If DASHBOARD_USER / DASHBOARD_PASS are not both set the server responds 500
 * (fail closed) rather than serving patient data unprotected.
 */
function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch (_) {
    return null;
  }
  const i = decoded.indexOf(':');
  if (i === -1) return null;
  return { name: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const authMiddleware = (req, res, next) => {
  if (req.path === '/api/health' || req.path.startsWith('/api/vapi')) {
    return next();
  }

  const username = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASS;

  if (!username || !password) {
    console.error('[Auth] DASHBOARD_USER / DASHBOARD_PASS not set — refusing to serve.');
    return res.status(500).send('Server misconfiguration: dashboard credentials not set');
  }

  const creds = parseBasicAuth(req.headers.authorization);
  if (creds && safeEqual(creds.name, username) && safeEqual(creds.pass, password)) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="High Springs Pediatrics Clinical Portal"');
  return res.status(401).send('Authentication required');
};

module.exports = authMiddleware;
