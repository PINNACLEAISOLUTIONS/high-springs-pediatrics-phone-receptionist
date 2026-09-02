const {
  handleCheckAvailability,
  handleBookAppointment,
  handleRefillRequest,
  handleTakeGeneralMessage
} = require('../services/toolsService');

/**
 * Dispatcher for High Springs Pediatrics function calls
 */
function routeToolCall(functionName, args = {}) {
  const normalizedName = (functionName || '').trim();

  switch (normalizedName) {
    case 'check_google_calendar':
    case 'checkGoogleCalendar':
    case 'check_availability':
    case 'checkAvailability':
    case 'check_slots':
      return handleCheckAvailability(args);

    case 'book_appointment':
    case 'bookAppointment':
    case 'create_booking':
      return handleBookAppointment(args);

    case 'submit_refill_request':
    case 'submitRefillRequest':
    case 'refill_request':
    case 'refillRequest':
    case 'request_medication_refill':
      return handleRefillRequest(args);

    case 'take_general_message':
    case 'takeGeneralMessage':
    case 'send_message':
    case 'log_message':
      return handleTakeGeneralMessage(args);

    default:
      console.warn(`[Vapi Webhook] Unknown function requested: "${normalizedName}". Returning acknowledgment.`);
      return {
        status: 'acknowledged',
        function: normalizedName,
        message: `Action ${normalizedName} received successfully.`
      };
  }
}

/**
 * Main Webhook Handler: POST /api/vapi/webhook
 */
async function handleWebhook(req, res) {
  try {
    const rawPayload = req.body || {};
    const message = rawPayload.message || rawPayload;
    const messageType = message.type || 'unknown';
    const callData = message.call || rawPayload.call || {};

    console.log(`\n[Vapi Webhook] 🔔 Received message: "${messageType}" (Call ID: ${callData.id || 'N/A'})`);

    // 1. Handle Vapi Tool Calls (Modern standard format)
    if (messageType === 'tool-calls' || message.toolCalls) {
      const toolCalls = message.toolCalls || [];
      const results = [];

      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id || `call_${Date.now()}`;
        const functionName = toolCall.function ? toolCall.function.name : toolCall.name;

        let args = {};
        if (toolCall.function && toolCall.function.arguments) {
          args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments || '{}')
            : toolCall.function.arguments;
        } else if (toolCall.arguments) {
          args = typeof toolCall.arguments === 'string'
            ? JSON.parse(toolCall.arguments || '{}')
            : toolCall.arguments;
        }

        console.log(`[Tool Call] Executing "${functionName}" (ID: ${toolCallId})`);

        // Execute tool logic
        const toolExecutionResult = routeToolCall(functionName, args);

        // Vapi expects result to be a string or JSON string
        const resultString = typeof toolExecutionResult === 'string'
          ? toolExecutionResult
          : (toolExecutionResult.message || JSON.stringify(toolExecutionResult));

        results.push({
          toolCallId,
          result: resultString
        });
      }

      const responsePayload = { results };
      console.log(`[Vapi Webhook] ✅ Dispatched ${results.length} tool result(s) back to Vapi.`);
      return res.status(200).json(responsePayload);
    }

    // 2. Handle Single Legacy function-call format
    if (messageType === 'function-call' || message.functionCall) {
      const fn = message.functionCall || message;
      const fnName = fn.name;
      const args = typeof fn.parameters === 'string'
        ? JSON.parse(fn.parameters || '{}')
        : (fn.parameters || {});

      console.log(`[Legacy Function Call] Executing "${fnName}"`);
      const resultData = routeToolCall(fnName, args);
      const resultString = typeof resultData === 'string'
        ? resultData
        : (resultData.message || JSON.stringify(resultData));

      return res.status(200).json({ result: resultString });
    }

    // 3. Handle Status Updates, Transcripts, and End of Call Reports
    if (['status-update', 'transcript', 'end-of-call-report'].includes(messageType)) {
      console.log(`[Vapi Telemetry] Call Status: ${message.status || messageType}`);
      return res.status(200).json({ received: true, type: messageType });
    }

    // 4. Default Fallback
    return res.status(200).json({
      status: 'success',
      receivedType: messageType,
      message: 'High Springs Pediatrics Vapi Webhook Acknowledged'
    });

  } catch (error) {
    console.error('[Vapi Webhook Error]:', error);
    return res.status(500).json({
      error: 'Internal Webhook Server Error',
      message: error.message
    });
  }
}

module.exports = {
  handleWebhook,
  routeToolCall
};
