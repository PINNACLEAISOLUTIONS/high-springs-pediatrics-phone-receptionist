const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

if (!API_KEY || !ASSISTANT_ID) {
  console.error('❌ Error: VAPI_API_KEY and VAPI_ASSISTANT_ID must be configured in .env');
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

// 1. Tool Definitions
const gcalTool = {
  type: 'function',
  function: {
    name: 'check_google_calendar',
    description: 'Checks live availability on High Springs Pediatrics Google Calendar before confirming any time slot.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Requested appointment date (e.g. tomorrow, 2026-09-04, Monday).'
        },
        appointmentType: {
          type: 'string',
          description: 'Type of visit (e.g. Sick Visit, Well-Child Check, Follow-Up).'
        }
      },
      required: ['date']
    }
  },
  messages: [
    {
      type: 'request-start',
      content: 'Checking live Google Calendar openings for you...'
    }
  ]
};

const transferTool = {
  type: 'transferCall',
  function: {
    name: 'transferCall',
    description: 'Use this tool to transfer the caller to a real person if they ask for a human, get frustrated, or have a complex issue.'
  },
  destinations: [
    {
      type: 'number',
      number: '+13522319154',
      message: 'Connecting you with a staff member at High Springs Pediatrics. Please stay on the line.'
    }
  ],
  messages: [
    {
      type: 'request-start',
      content: 'Please hold while I transfer you to our live team.'
    }
  ]
};

// 2. Comprehensive System Prompt with Strict Directives
const systemPrompt = `# Role & Persona
You are Sarah, the dedicated, warm, and highly professional AI voice receptionist for **High Springs Pediatrics and Primary Care**. You speak naturally, concisely, and with empathy.

# Business Information
- **Business Name:** High Springs Pediatrics and Primary Care
- **Practicing Physician:** Dr. Nasir Ahmed, M.D.
- **Physical Address:** 19228 NW US Highway 441, High Springs, FL 32643
- **Phone:** (386) 454-1156 | **Fax:** (386) 454-1158
- **Office Hours:** Monday through Friday, 9:00 AM – 5:00 PM (Lunch break: 1:00 PM – 2:00 PM). Weekend & after-hours doctor access available 24/7.
- **Accepted Insurances:** Florida Medicaid (Staywell, Sunshine, Ped-I-Care, Prestige, CMS), Florida Blue / Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Humana, Tricare, CHAMPVA, Florida Healthy Kids, Medicare, and Self-Pay.

# Mandatory Operational Directives (STRICT)
1. **Google Calendar Verification:**
   - Always **check the Google Calendar before confirming any time slot** using the \`check_google_calendar\` or \`check_availability\` tool. Never promise or confirm a slot without checking calendar openings.
2. **Booking & 3-Digit Confirmation Number:**
   - When an appointment is booked using \`book_appointment\`, you will receive a 3-digit confirmation number from the scheduling system.
   - **You MUST read this 3-digit confirmation number out loud to the caller.** (e.g. "Your appointment has been booked. Your confirmation number is 7 4 2.")
3. **Immediate Human Transfer:**
   - **Trigger the transfer tool (\`transferCall\`) immediately if the user requests human assistance**, asks to speak with a real person/nurse/doctor, gets frustrated, or has a complex issue. Do not argue or delay.
4. **Patient Terminology:**
   - Always refer to the individual receiving care as the "patient" or ask for the "patient's name". Do not say "child's name".

# Available Tools
- \`check_google_calendar\` / \`check_availability\`: Check live calendar availability for requested dates and appointment types.
- \`book_appointment\`: Book the appointment once patient details (name, DOB, phone, date, time slot) are gathered. Read back the returned 3-digit confirmation number.
- \`transferCall\`: Instantly route the caller to the live staff phone line (+13522319154).
- \`refill_request\`: Collect prescription refill details (patient name, DOB, medication, pharmacy).

# Clinical Guardrails
- You are an AI receptionist, NOT a physician. NEVER provide medical diagnoses or alter prescription dosages.
- If a caller describes a life-threatening medical emergency, immediately instruct them:
  "If the patient is experiencing a medical emergency, please hang up and call 911 or proceed to the nearest emergency room immediately."
- Maintain strict HIPAA confidentiality.`;

async function executeAssistantUpgrade() {
  console.log('================================================================');
  console.log('  UPDATING VAPI ASSISTANT: GOOGLE CALENDAR, TRANSFER, & VOICE   ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  // Step A: Fetch existing tools on Vapi account
  console.log('Step 1: Inspecting and registering required tools on Vapi...');
  const toolsRes = await requestVapi('GET', '/tool');
  const existingTools = Array.isArray(toolsRes.data) ? toolsRes.data : [];
  
  // Find or create Transfer Call tool
  let transferToolId = null;
  const foundTransfer = existingTools.find(t => t.type === 'transferCall' || (t.function && t.function.name === 'transferCall'));
  if (foundTransfer) {
    transferToolId = foundTransfer.id;
    console.log(`✅ Found existing transferCall tool (ID: ${transferToolId}). Updating destination & description...`);
    await requestVapi('PATCH', `/tool/${transferToolId}`, transferTool);
  } else {
    console.log('Creating transferCall tool (+13522319154)...');
    const createRes = await requestVapi('POST', '/tool', transferTool);
    transferToolId = createRes.data.id;
    console.log(`✅ Created transferCall tool (ID: ${transferToolId})`);
  }

  // Find or create Google Calendar tool
  let gcalToolId = null;
  const foundGcal = existingTools.find(t => t.function && (t.function.name === 'check_google_calendar' || t.function.name === 'googleCalendar'));
  if (foundGcal) {
    gcalToolId = foundGcal.id;
    console.log(`✅ Found existing Google Calendar tool (ID: ${gcalToolId}). Updating schema...`);
    await requestVapi('PATCH', `/tool/${gcalToolId}`, gcalTool);
  } else {
    console.log('Creating check_google_calendar tool...');
    const createRes = await requestVapi('POST', '/tool', gcalTool);
    gcalToolId = createRes.data.id;
    console.log(`✅ Created check_google_calendar tool (ID: ${gcalToolId})`);
  }

  // Identify core booking & refill tools
  const bookTool = existingTools.find(t => t.function && t.function.name === 'book_appointment');
  const refillTool = existingTools.find(t => t.function && t.function.name === 'refill_request');
  const checkAvailTool = existingTools.find(t => t.function && t.function.name === 'check_availability');

  const allToolIds = [
    gcalToolId,
    transferToolId,
    bookTool ? bookTool.id : null,
    refillTool ? refillTool.id : null,
    checkAvailTool ? checkAvailTool.id : null
  ].filter(Boolean);

  console.log(`\nStep 2: Attaching ${allToolIds.length} tools to assistant:`, allToolIds);

  // Step B: Update Assistant
  const patchPayload = {
    name: "High Springs Pediatrics (Sarah)",
    voice: {
      provider: "11labs",
      voiceId: "sarah", // ElevenLabs Female Voice
      model: "eleven_flash_v2"
    },
    model: {
      model: "gpt-4o-mini",
      provider: "openai",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      toolIds: allToolIds
    },
    firstMessage: "Thank you for calling High Springs Pediatrics and Primary Care. My name is Sarah. How can I assist you today?"
  };

  console.log('\nStep 3: Sending Assistant update to Vapi REST API...');
  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, patchPayload);

  if (updateRes.status === 200) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: VAPI ASSISTANT MODIFICATIONS ARE LIVE!');
    console.log('================================================================');
    console.log(`Assistant ID:         ${updateRes.data.id}`);
    console.log(`Business Name:        High Springs Pediatrics and Primary Care`);
    console.log(`Voice Provider:       ElevenLabs (sarah - Female)`);
    console.log(`Google Calendar Tool: Attached (ID: ${gcalToolId})`);
    console.log(`Transfer Call Tool:   Attached -> Routes to +13522319154 (ID: ${transferToolId})`);
    console.log(`Booking Confirmation: Configured to read 3-digit confirmation number out loud`);
    console.log(`Human Escalation:     Configured to trigger transfer tool immediately upon request`);
    console.log(`First Greeting:       "${updateRes.data.firstMessage}"`);
    console.log('================================================================\n');
  } else {
    console.error(`❌ Update failed with HTTP status ${updateRes.status}:`, updateRes.data || updateRes.raw);
    process.exit(1);
  }
}

executeAssistantUpgrade();
