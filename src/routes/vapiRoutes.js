const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/vapiController');
const verifyVapiSignature = require('../middleware/webhookAuth');

// Primary Vapi Webhook Endpoint with Signature Verification
router.post('/webhook', verifyVapiSignature, handleWebhook);
router.post('/vapi/webhook', verifyVapiSignature, handleWebhook);
router.post('/', verifyVapiSignature, handleWebhook);

module.exports = router;
