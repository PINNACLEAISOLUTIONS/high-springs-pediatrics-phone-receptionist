const crypto = require('crypto');

/**
 * Verifies inbound Vapi webhook requests.
 *
 * Vapi can authenticate its server messages two ways (configure one in the
 * dashboard under Assistant/Phone Number -> Server -> Secret):
 *   1. A plain shared secret sent as the `X-Vapi-Secret` header (simplest).
 *   2. An HMAC-SHA256 signature of the raw JSON body sent as `X-Vapi-Signature`.
 *
 * Behaviour when `VAPI_WEBHOOK_SECRET` is not set:
 *   - production  -> reject (fail closed)
 *   - dev / test  -> allow with a warning (so local runs and `npm test` work)
 */
const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const verifyVapiSignature = (req, res, next) => {
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook Auth] VAPI_WEBHOOK_SECRET is not set — rejecting.');
      return res.status(401).json({ error: 'Webhook secret not configured' });
    }
    console.warn('[Webhook Auth] VAPI_WEBHOOK_SECRET not set — allowing request (non-production).');
    return next();
  }

  // 1. Shared-secret header
  const providedSecret = req.headers['x-vapi-secret'];
  if (providedSecret && timingSafeEqual(providedSecret, webhookSecret)) {
    return next();
  }

  // 2. HMAC-SHA256 signature of the body
  const signature = req.headers['x-vapi-signature'];
  if (signature) {
    const payload = JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    if (timingSafeEqual(signature, expected)) {
      return next();
    }
  }

  console.warn('[Webhook Auth] Missing or invalid Vapi credentials — rejecting.');
  return res.status(401).json({ error: 'Invalid Vapi webhook credentials' });
};

module.exports = verifyVapiSignature;
