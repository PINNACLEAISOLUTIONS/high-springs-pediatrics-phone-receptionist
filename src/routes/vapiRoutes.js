const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/vapiController');

// Primary Vapi Webhook Endpoint
router.post('/webhook', handleWebhook);
router.post('/vapi/webhook', handleWebhook);
router.post('/', handleWebhook);

module.exports = router;
