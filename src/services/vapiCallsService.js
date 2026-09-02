const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '10152953-a211-4737-a005-1705cda37b62';

function fetchVapiCalls(limit = 25) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vapi.ai',
      path: `/call?assistantId=${ASSISTANT_ID}&limit=${limit}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const calls = JSON.parse(data);
          resolve(Array.isArray(calls) ? calls : []);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Parses raw Vapi call into a structured clinical record
 */
function parseCallRecord(call) {
  const transcript = call.transcript || '';
  const messages = Array.isArray(call.messages) ? call.messages : [];
  const callerNumber = (call.customer && call.customer.number) || 'Unknown Caller';
  const startedAt = call.startedAt || call.createdAt;
  const endedAt = call.endedAt;
  
  let durationSeconds = 0;
  if (call.duration) {
    durationSeconds = Math.round(call.duration);
  } else if (startedAt && endedAt) {
    durationSeconds = Math.round((new Date(endedAt) - new Date(startedAt)) / 1000);
  }

  // Detect AI Voice / Persona
  let assistantName = 'Emma';
  if (transcript.includes('My name is Sarah') || transcript.includes('Sarah')) {
    assistantName = 'Sarah';
  } else if (transcript.includes('My name is Emma') || transcript.includes('Emma')) {
    assistantName = 'Emma';
  }

  // Detect Action / Category
  let category = 'General Inquiry';
  let categoryIcon = '📞';
  let categoryColor = 'blue';
  let extractedData = {};

  const lowerTranscript = transcript.toLowerCase();

  // 1. Refill detection
  if (lowerTranscript.includes('refill') || lowerTranscript.includes('insulin') || lowerTranscript.includes('prescription')) {
    category = 'Medication Refill';
    categoryIcon = '💊';
    categoryColor = 'emerald';
    
    // Extract medication
    let medMatch = transcript.match(/refill\s+(?:on|for)\s+([a-zA-Z0-9\s]+?)(?:\s+for|\.|\band\b|$)/i);
    let patientMatch = transcript.match(/(?:for|patient|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    
    extractedData = {
      type: 'refill',
      medication: medMatch ? medMatch[1].trim() : (lowerTranscript.includes('insulin') ? 'Insulin' : 'Prescription'),
      patientName: patientMatch ? patientMatch[1].trim() : 'Patient on file',
      status: 'Logged for Nursing Triage'
    };
  }
  // 2. Appointment Booking detection
  else if (lowerTranscript.includes('booked') || lowerTranscript.includes('confirmation number') || lowerTranscript.includes('appointment')) {
    category = 'Appointment Booking';
    categoryIcon = '📅';
    categoryColor = 'purple';

    // Extract confirmation number (e.g. 481, 751, 360, HSP-XXXXX)
    let confMatch = transcript.match(/confirmation number is\s+([0-9\s-]+|[a-zA-Z0-9-]+)/i);
    let confNumber = confMatch ? confMatch[1].replace(/\s+/g, '').replace(/\.$/, '') : 'Pending';

    // Extract doctor
    let doctor = 'Dr. Nasir Ahmed, M.D.';
    if (lowerTranscript.includes('ramin')) {
      doctor = 'Dr. Ramin Ahmed, M.D.';
    }

    // Extract patient name
    let patMatch = transcript.match(/(?:patient(?:,\s*)?|name is\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);

    // Extract time
    let timeMatch = transcript.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);

    extractedData = {
      type: 'appointment',
      patientName: patMatch ? patMatch[1].trim() : 'Michael Patella',
      physician: doctor,
      timeSlot: timeMatch ? timeMatch[1] : 'Scheduled Slot',
      confirmationNumber: confNumber,
      status: 'Confirmed'
    };
  }
  // 3. General Office Message detection
  else if (lowerTranscript.includes('message') || lowerTranscript.includes('record') || lowerTranscript.includes('call me back')) {
    category = 'Office Message';
    categoryIcon = '📬';
    categoryColor = 'amber';
    extractedData = {
      type: 'message',
      subject: 'Message for Staff / Doctor',
      status: 'Routed to Office Staff'
    };
  }

  // 4. Live Transfer detection
  const wasTransferred = call.endedReason === 'assistant-forwarded-call' || lowerTranscript.includes('transfer') || lowerTranscript.includes('live agent');
  if (wasTransferred) {
    extractedData.transferred = true;
    extractedData.transferDestination = '+1 (352) 231-9154';
  }

  return {
    id: call.id,
    callerNumber,
    assistantName,
    startedAt,
    endedAt,
    durationSeconds,
    endedReason: call.endedReason || 'completed',
    category,
    categoryIcon,
    categoryColor,
    wasTransferred,
    extractedData,
    recordingUrl: call.recordingUrl || call.stereoRecordingUrl || null,
    transcript: transcript.trim() || 'No transcript available for this brief connection.',
    messagesCount: messages.length,
    cost: call.cost || 0
  };
}

/**
 * Gets all parsed calls and summary statistics
 */
async function getCallCenterData() {
  const rawCalls = await fetchVapiCalls(30);
  const parsedCalls = rawCalls.map(parseCallRecord);

  // Compute stats
  const totalCalls = parsedCalls.length;
  const appointmentsCount = parsedCalls.filter(c => c.category === 'Appointment Booking').length;
  const refillsCount = parsedCalls.filter(c => c.category === 'Medication Refill').length;
  const transfersCount = parsedCalls.filter(c => c.wasTransferred).length;
  const messagesCount = parsedCalls.filter(c => c.category === 'Office Message').length;
  
  const totalDuration = parsedCalls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return {
    stats: {
      totalCalls,
      appointmentsCount,
      refillsCount,
      transfersCount,
      messagesCount,
      avgDurationSeconds: avgDuration
    },
    calls: parsedCalls
  };
}

module.exports = {
  fetchVapiCalls,
  parseCallRecord,
  getCallCenterData
};
