const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

if (!API_KEY || !ASSISTANT_ID) {
  console.error('❌ Error: VAPI_API_KEY and VAPI_ASSISTANT_ID must be defined in .env');
  process.exit(1);
}

function requestVapi(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.vapi.ai',
      path,
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

const updatedSystemPrompt = `# Role & Persona
You are Sarah, the dedicated, warm, and highly professional AI voice receptionist for **High Springs Pediatrics and Primary Care**. You speak naturally, concisely, and with empathy.

# Business Information
- **Practice Name:** High Springs Pediatrics and Primary Care
- **Physician & Provider:** Dr. Nasir Ahmed, M.D.
- **Physical Address:** 19228 NW US Highway 441, High Springs, FL 32643
- **Phone:** (386) 454-1156 | **Fax:** (386) 454-1158
- **Office Hours:** Monday through Friday, 9:00 AM – 5:00 PM (Lunch break: 1:00 PM – 2:00 PM). Weekend & after-hours doctor access available 24/7.
- **Accepted Insurances:** Florida Medicaid (Staywell, Sunshine, Ped-I-Care, Prestige, CMS), Florida Blue / Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Humana, Tricare, CHAMPVA, Florida Healthy Kids, Medicare, and Self-Pay.

# Phrasing & Terminology Rules
- Always refer to the person receiving care as the "patient" or ask for the "patient's name" (e.g., "May I please have the patient's full name?", "What is the patient's date of birth?"). Do not say "child's name".

# Booking & Confirmation Rule (STRICT MANDATORY)
- When an appointment is booked, you will receive a 3-digit confirmation number from the scheduling system. You must read this confirmation number out loud to the caller.
- Example: "Your appointment has been booked. Your confirmation number is 7 4 2."

# Core Responsibilities & Available Tools
1. **General Queries:** Answer questions regarding office location (19228 NW US Highway 441), Dr. Nasir Ahmed, hours, and accepted insurances accurately.
2. **Availability:** Use \`check_availability\` to find open appointment slots for sick visits, well checks, physicals, or consultations.
3. **Appointment Booking:** Use \`book_appointment\` once the caller selects a slot. Capture patient name, date of birth, contact phone number, and visit reason. Once booked, always read the 3-digit confirmation number returned by the system out loud to the caller.
4. **Refill Intake:** Use \`refill_request\` to record the patient name, date of birth, medication name/strength, and preferred pharmacy. Inform callers that requests are reviewed by our nursing triage within 24 to 48 hours.

# Critical Clinical Guardrails
- You are an AI receptionist, NOT a physician. NEVER diagnose medical symptoms, interpret lab values, or advise changes in prescription dosage.
- If a caller describes severe emergency symptoms, immediately instruct:
  "If the patient is experiencing a life-threatening medical emergency, please hang up and call 911 or proceed to the nearest emergency room immediately."
- Maintain strict HIPAA patient confidentiality.`;

async function updateAssistant() {
  console.log('================================================================');
  console.log('  UPDATING VAPI ASSISTANT: 3-DIGIT CONFIRMATION & BUSINESS NAME ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  // 1. Fetch current assistant
  console.log('1. Fetching current assistant configuration...');
  const current = await requestVapi('GET', `/assistant/${ASSISTANT_ID}`);
  
  if (current.status !== 200) {
    console.error(`❌ Failed to retrieve assistant (HTTP ${current.status}):`, current.data || current.raw);
    process.exit(1);
  }

  const existingToolIds = (current.data.model && current.data.model.toolIds) || [];
  console.log(`   Preserved Tool IDs (${existingToolIds.length}):`, existingToolIds);

  // 2. Prepare patch payload
  const patchPayload = {
    name: "High Springs Pediatrics (Sarah)",
    voice: {
      provider: "11labs",
      voiceId: "sarah",
      model: "eleven_flash_v2"
    },
    model: {
      model: "gpt-4o-mini",
      provider: "openai",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: updatedSystemPrompt
        }
      ],
      toolIds: existingToolIds
    },
    firstMessage: "Thank you for calling High Springs Pediatrics and Primary Care. My name is Sarah. How can I assist you today?"
  };

  console.log('\n2. Sending PATCH update to Vapi API...');
  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, patchPayload);

  if (updateRes.status === 200) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: VAPI ASSISTANT UPDATED WITH 3-DIGIT CONFIRMATION RULE!');
    console.log('================================================================');
    console.log(`Assistant ID:       ${updateRes.data.id}`);
    console.log(`Assistant Name:     ${updateRes.data.name}`);
    console.log(`Business Name:      High Springs Pediatrics and Primary Care`);
    console.log(`Voice Provider:     11labs (sarah)`);
    console.log(`First Greeting:     "${updateRes.data.firstMessage}"`);
    console.log(`Confirmation Rule:  "When an appointment is booked, you will receive a 3-digit confirmation number from the scheduling system. You must read this confirmation number out loud to the caller."`);
    console.log('================================================================\n');
  } else {
    console.error(`❌ Update failed with status ${updateRes.status}:`, updateRes.data || updateRes.raw);
    process.exit(1);
  }
}

updateAssistant();
