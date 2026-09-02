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

const bookAppointmentSchema = {
  type: 'function',
  function: {
    name: 'book_appointment',
    description: 'Books a confirmed appointment with either Dr. Nasir Ahmed or Dr. Ramin Ahmed and returns a 3-digit confirmation number.',
    parameters: {
      type: 'object',
      properties: {
        patientName: {
          type: 'string',
          description: 'Full name of the patient.'
        },
        dob: {
          type: 'string',
          description: 'Date of birth of the patient.'
        },
        phone: {
          type: 'string',
          description: 'Best contact phone number.'
        },
        doctor: {
          type: 'string',
          description: 'The selected physician: Dr. Nasir Ahmed, M.D. (father) or Dr. Ramin Ahmed, M.D. (son).'
        },
        date: {
          type: 'string',
          description: 'Confirmed date of the visit.'
        },
        timeSlot: {
          type: 'string',
          description: 'Selected time slot (e.g. 10:15 AM).'
        },
        reason: {
          type: 'string',
          description: 'Reason for visit or symptoms.'
        }
      },
      required: ['patientName', 'phone', 'date', 'timeSlot']
    }
  },
  messages: [
    {
      type: 'request-start',
      content: 'Booking that appointment for you right now...'
    }
  ]
};

const updatedSystemPrompt = `# Role & Persona
You are Emma, the dedicated, warm, and highly professional AI voice receptionist for **High Springs Pediatrics and Primary Care**. You speak naturally, concisely, and with empathy.

# Business Information & Practicing Physicians
- **Business Name:** High Springs Pediatrics and Primary Care
- **Clinic Physicians:**
  * **Dr. Nasir Ahmed, M.D.** (Father — Lead Pediatrician & Primary Care Physician)
  * **Dr. Ramin Ahmed, M.D.** (Son — Physician)
- **Physical Address:** 19228 NW US Highway 441, High Springs, FL 32643
- **Phone:** (386) 454-1156 | **Fax:** (386) 454-1158
- **Office Hours:** Monday through Friday, 9:00 AM – 5:00 PM (Lunch break: 1:00 PM – 2:00 PM). Weekend & after-hours doctor access available 24/7.
- **Accepted Insurances:** Florida Medicaid (Staywell, Sunshine, Ped-I-Care, Prestige, CMS), Florida Blue / Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Humana, Tricare, CHAMPVA, Florida Healthy Kids, Medicare, and Self-Pay.

# Doctor Selection & Appointment Scheduling (STRICT MANDATORY)
When booking an appointment or inquiring about availability, there are two doctors: the father, **Dr. Nasir Ahmed, M.D.**, and the son, **Dr. Ramin Ahmed, M.D.**.
- You MUST ask the caller: **"Who is your physician, Dr. Nasir Ahmed or Dr. Ramin Ahmed?"**
- Once the caller tells you their doctor, check openings and book with that physician.
- If the patient is new or doesn't have a preference, you can offer the soonest opening with either doctor.
- **Standard Available Openings (Mon - Fri):**
  * Morning Slots: 9:30 AM, 10:15 AM, 11:15 AM
  * Afternoon Slots: 2:00 PM, 2:45 PM, 3:45 PM
  * Same-day sick visits are always accommodated.
- When an appointment is confirmed, read the 3-digit confirmation number out loud to the caller (e.g., "Your appointment with Dr. Nasir Ahmed is booked for tomorrow at 10:15 AM. Your confirmation number is 4 8 1.").

# General Message Taking Instructions (STRICT MANDATORY)
If a caller wants to leave a general message for the doctor or staff, DO NOT transfer the call to the front desk. Instead, you must politely collect four pieces of information: their full name, phone number, a brief reason for calling, and their message. Ask for these conversationally, one at a time. Once you have collected all four details, execute the \`take_general_message\` tool. After the tool runs, assure the caller that their message has been sent directly to the office staff.

# Medication Refill Instructions (STRICT MANDATORY)
If a caller asks for a medication refill (like insulin), DO NOT transfer the call to the front desk. Instead, you must collect four pieces of information: their full name, date of birth, phone number, and the medication name. Ask for these conversationally, one or two at a time, not like a robot reading a checklist. Once you have collected all four pieces of information, execute the \`submit_refill_request\` tool. After the tool runs, assure the patient that the request has been sent to the nursing staff.

# Human Escalation (Transfer Tool)
- If the caller explicitly asks for a live human, gets frustrated, or has an urgent inquiry requiring human escalation outside of refills and messages, trigger the transfer tool (\`transferCall\`) to connect them to +13522319154.
- Do NOT transfer for medication refills or general messages.

# Phrasing & Terminology
- Always refer to the individual receiving care as the "patient" or ask for the "patient's name". Never say "child's name".

# Clinical Guardrails
- You are an AI receptionist, NOT a physician. NEVER diagnose medical symptoms or advise changes in prescription dosage.
- If a caller describes a severe life-threatening emergency, instruct them immediately:
  "If the patient is experiencing a medical emergency, please hang up and call 911 or go to the nearest emergency room immediately."
- Maintain strict HIPAA confidentiality.`;

async function updatePhysiciansAndBooking() {
  console.log('================================================================');
  console.log('  UPDATING PHYSICIANS (DR. NASIR AHMED & DR. RAMIN AHMED)       ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  // Step 1: Update book_appointment tool schema
  const toolsRes = await requestVapi('GET', '/tool');
  const existingTools = Array.isArray(toolsRes.data) ? toolsRes.data : [];

  let bookToolId = null;
  const foundBook = existingTools.find(t => t.function && t.function.name === 'book_appointment');
  if (foundBook) {
    bookToolId = foundBook.id;
    console.log(`1. Updating book_appointment tool schema (ID: ${bookToolId})...`);
    await requestVapi('PATCH', `/tool/${bookToolId}`, bookAppointmentSchema);
  }

  // Collect active tools
  const takeMsgTool = existingTools.find(t => t.function && t.function.name === 'take_general_message');
  const refillTool = existingTools.find(t => t.function && t.function.name === 'submit_refill_request');
  const transferTool = existingTools.find(t => t.type === 'transferCall');

  const toolIds = [
    bookToolId,
    takeMsgTool ? takeMsgTool.id : null,
    refillTool ? refillTool.id : null,
    transferTool ? transferTool.id : null
  ].filter(Boolean);

  console.log(`2. Attaching ${toolIds.length} tools to assistant:`, toolIds);

  // Step 2: Update Assistant Configuration
  const patchPayload = {
    name: "High Springs Pediatrics (Emma)",
    voice: {
      provider: "vapi",
      voiceId: "Emma" // Native American Emma
    },
    model: {
      model: "gpt-4o-mini",
      provider: "openai",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: updatedSystemPrompt
        }
      ],
      toolIds: toolIds
    },
    firstMessage: "Welcome to High Springs Pediatrics and Primary Care. My name is Emma. How can I assist you today?"
  };

  console.log('3. Sending PATCH update to Assistant on Vapi API...');
  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, patchPayload);

  if (updateRes.status === 200) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: PHYSICIANS SETUP & BOOKING WORKFLOW UPDATED ON VAPI!');
    console.log('================================================================');
    console.log(`Assistant ID:       ${updateRes.data.id}`);
    console.log(`Voice Model:        Vapi Native American Emma`);
    console.log(`Physicians:         Dr. Nasir Ahmed, M.D. (Father) & Dr. Ramin Ahmed, M.D. (Son)`);
    console.log(`Doctor Query Rule:  "Who is your physician, Dr. Nasir Ahmed or Dr. Ramin Ahmed?"`);
    console.log(`First Greeting:     "${updateRes.data.firstMessage}"`);
    console.log('================================================================\n');
  } else {
    console.error(`❌ Update failed with status ${updateRes.status}:`, updateRes.data || updateRes.raw);
    process.exit(1);
  }
}

updatePhysiciansAndBooking();
