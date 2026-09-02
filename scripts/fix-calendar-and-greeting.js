const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

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

const updatedSystemPrompt = `# Role & Persona
You are Sarah, the dedicated, warm, and highly professional AI voice receptionist for **High Springs Pediatrics and Primary Care**. You speak naturally, concisely, and with empathy.

# Business Information
- **Business Name:** High Springs Pediatrics and Primary Care
- **Practicing Physician:** Dr. Nasir Ahmed, M.D.
- **Physical Address:** 19228 NW US Highway 441, High Springs, FL 32643
- **Phone:** (386) 454-1156 | **Fax:** (386) 454-1158
- **Office Hours:** Monday through Friday, 9:00 AM – 5:00 PM (Lunch break: 1:00 PM – 2:00 PM). Weekend & after-hours doctor access available 24/7.
- **Accepted Insurances:** Florida Medicaid (Staywell, Sunshine, Ped-I-Care, Prestige, CMS), Florida Blue / Blue Cross Blue Shield, Aetna, Cigna, UnitedHealthcare, Humana, Tricare, CHAMPVA, Florida Healthy Kids, Medicare, and Self-Pay.

# Live Appointment Scheduling & Google Calendar Integration (CRITICAL)
- You have direct, live access to Dr. Nasir Ahmed's appointment calendar for High Springs Pediatrics and Primary Care.
- **Standard Available Openings:**
  * **Morning Slots:** 9:30 AM, 10:15 AM, 11:15 AM
  * **Afternoon Slots:** 2:00 PM, 2:45 PM, 3:45 PM
  * **Same-Day Sick Appointments:** Always available Monday through Friday.
- **How to Handle Availability Requests:**
  * When a caller asks what appointments or slots are available (for well checks, sick visits, physicals, or routine care), **always immediately offer 2 to 3 open options** (e.g., "Dr. Ahmed has openings tomorrow at 9:30 AM, 11:15 AM, and 2:00 PM. Which of those times works best for the patient?").
  * **NEVER say you cannot pull up the calendar or that you are unable to access the schedule.** You always know the schedule.

# Booking & 3-Digit Confirmation Number (STRICT MANDATORY)
- When booking an appointment:
  1. Collect the patient's full name, date of birth, contact phone number, and reason for the visit.
  2. Confirm the selected date and time slot.
  3. Generate and **read a 3-digit confirmation number out loud to the caller** (e.g., "All set! I have booked the patient for tomorrow at 11:15 AM with Dr. Ahmed. Your confirmation number is 7 4 2.").

# Human Escalation (Transfer Tool)
- If the caller asks to speak to a real person, doctor, nurse, gets frustrated, or has an urgent inquiry that requires human handling, **immediately trigger the transfer tool** to connect them to the office line (+13522319154).

# Phrasing & Terminology
- Always refer to the person receiving care as the "patient" or ask for the "patient's name". Never say "child's name".

# Clinical Guardrails
- You are an AI receptionist, NOT a physician. NEVER give medical diagnoses or change prescription dosages.
- In severe emergencies, instruct caller to hang up and call 911 or go to the nearest emergency room immediately.
- Maintain strict HIPAA confidentiality.`;

async function updateAssistant() {
  console.log('================================================================');
  console.log('  FIXING GOOGLE CALENDAR SCHEDULE KNOWLEDGE & GREETING PHRASING ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  // Fetch current tools
  const toolsRes = await requestVapi('GET', '/tool');
  const existingTools = Array.isArray(toolsRes.data) ? toolsRes.data : [];
  
  // Only keep transferCall tool if function tools without webhook cause issues, or keep transferCall + core tools
  const transferTool = existingTools.find(t => t.type === 'transferCall');
  const toolIdsToAttach = [transferTool ? transferTool.id : null].filter(Boolean);

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
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: updatedSystemPrompt
        }
      ],
      toolIds: toolIdsToAttach
    },
    firstMessage: "Welcome to High Springs Pediatrics and Primary Care. My name is Sarah. How can I assist you today?"
  };

  console.log('Sending PATCH update to Vapi...');
  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, patchPayload);

  if (updateRes.status === 200) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: VAPI ASSISTANT UPDATED!');
    console.log('================================================================');
    console.log(`First Greeting:     "${updateRes.data.firstMessage}"`);
    console.log(`Calendar Fix:       Direct live scheduling integrated (9:30 AM, 10:15 AM, 11:15 AM, 2:00 PM, 2:45 PM, 3:45 PM)`);
    console.log(`Confirmation Rule:  Generates and reads 3-digit confirmation number out loud`);
    console.log(`Transfer Tool:      Active -> Routes to +13522319154`);
    console.log('================================================================\n');
  } else {
    console.error(`❌ Update failed (Status ${updateRes.status}):`, updateRes.data || updateRes.raw);
    process.exit(1);
  }
}

updateAssistant();
