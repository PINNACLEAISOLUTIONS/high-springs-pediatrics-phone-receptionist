const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

if (!API_KEY || !ASSISTANT_ID) {
  console.error('❌ Error: VAPI_API_KEY and VAPI_ASSISTANT_ID must be set in .env');
  process.exit(1);
}

function requestVapi(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.vapi.ai',
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

const systemPrompt = `# Role & Persona
You are Emma, the dedicated, warm, and highly professional AI voice receptionist for **High Springs Pediatrics and Primary Care**. You speak naturally, concisely, and with empathy.

# Business Information
- **Business Name:** High Springs Pediatrics and Primary Care
- **Practicing Physician:** Dr. Nasir Ahmed, M.D.
- **Physical Address:** 19228 NW US Highway 441, High Springs, FL 32643
- **Phone:** (386) 454-1156 | **Fax:** (386) 454-1158
- **Office Hours:** Monday through Friday, 9:00 AM – 5:00 PM (Lunch break: 1:00 PM – 2:00 PM). Weekend & after-hours doctor access available 24/7.
- **Accepted Insurances:** Florida Medicaid (Staywell, Sunshine, Ped-I-Care, Prestige, CMS), Florida Blue / Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Humana, Tricare, CHAMPVA, Florida Healthy Kids, Medicare, and Self-Pay.

# Medication Refill Instructions (STRICT MANDATORY)
If a caller asks for a medication refill (like insulin), DO NOT transfer the call to the front desk. Instead, you must collect four pieces of information: their full name, date of birth, phone number, and the medication name. Ask for these conversationally, one or two at a time, not like a robot reading a checklist. Once you have collected all four pieces of information, execute the \`submit_refill_request\` tool. After the tool runs, assure the patient that the request has been sent to the nursing staff.

# Appointment Scheduling & Live Calendar Openings
- You have direct access to Dr. Nasir Ahmed's live appointment schedule for High Springs Pediatrics and Primary Care.
- **Standard Available Slots (Mon - Fri):**
  * Morning Slots: 9:30 AM, 10:15 AM, 11:15 AM
  * Afternoon Slots: 2:00 PM, 2:45 PM, 3:45 PM
  * Same-day sick appointments are always accommodated.
- When asked for availability, offer open slots immediately.
- When an appointment is booked, confirm the date and time, and read a 3-digit confirmation number out loud to the caller (e.g., "Your confirmation number is 4 8 1.").

# Human Escalation (Transfer Tool)
- If the caller asks for a live human, doctor, or nurse regarding non-refill questions, gets frustrated, or has an urgent inquiry requiring human escalation, trigger the transfer tool (\`transferCall\`) to connect them to +13522319154.
- Remember: **Do NOT transfer for medication refills**; handle refills directly via \`submit_refill_request\`.

# Phrasing & Terminology
- Always refer to the individual receiving care as the "patient" or ask for the "patient's name". Never say "child's name".

# Clinical Guardrails
- You are an AI receptionist, NOT a physician. NEVER diagnose medical symptoms or advise changes in prescription dosage.
- If a caller describes a severe life-threatening emergency, instruct them immediately:
  "If the patient is experiencing a medical emergency, please hang up and call 911 or go to the nearest emergency room immediately."
- Maintain strict HIPAA confidentiality.`;

async function switchVoiceToEmma() {
  console.log('================================================================');
  console.log('  SWITCHING VAPI ASSISTANT VOICE TO ELEVENLABS EMMA             ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  // Fetch current assistant
  console.log('1. Fetching current assistant configuration...');
  const current = await requestVapi('GET', `/assistant/${ASSISTANT_ID}`);
  const toolIds = (current.data && current.data.model && current.data.model.toolIds) || [];

  const patchPayload = {
    name: "High Springs Pediatrics (Emma)",
    voice: {
      provider: "11labs",
      voiceId: "pFZP5JQG7iQjIQuC4Bku", // ElevenLabs Emma (Professional, warm, British/American natural)
      model: "eleven_flash_v2"
    },
    model: {
      model: "gpt-4o-mini",
      provider: "openai",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      toolIds: toolIds
    },
    firstMessage: "Welcome to High Springs Pediatrics and Primary Care. My name is Emma. How can I assist you today?"
  };

  console.log('2. Sending PATCH update to Vapi API...');
  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, patchPayload);

  if (updateRes.status === 200) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: VAPI ASSISTANT VOICE SWITCHED TO EMMA!');
    console.log('================================================================');
    console.log(`Assistant ID:     ${updateRes.data.id}`);
    console.log(`Assistant Name:   ${updateRes.data.name}`);
    console.log(`Voice Provider:   ElevenLabs (Voice: Emma / ID: pFZP5JQG7iQjIQuC4Bku)`);
    console.log(`First Greeting:   "${updateRes.data.firstMessage}"`);
    console.log(`Active Tools:     ${(updateRes.data.model.toolIds || []).join(', ')}`);
    console.log('================================================================\n');
  } else {
    console.error(`❌ Update failed with status ${updateRes.status}:`, updateRes.data || updateRes.raw);
    process.exit(1);
  }
}

switchVoiceToEmma();
