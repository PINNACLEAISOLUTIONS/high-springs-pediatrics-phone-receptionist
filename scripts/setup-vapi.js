const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '10152953-a211-4737-a005-1705cda37b62';

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

const toolsToCreate = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Checks available appointment openings for High Springs Pediatrics.',
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
        content: 'Let me check the pediatric schedule for you...'
      }
    ]
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Books a confirmed pediatric appointment and returns a unique confirmation number.',
      parameters: {
        type: 'object',
        properties: {
          childName: {
            type: 'string',
            description: 'Full name of the child or patient.'
          },
          parentName: {
            type: 'string',
            description: 'Full name of the parent or guardian.'
          },
          phone: {
            type: 'string',
            description: 'Best contact phone number.'
          },
          dob: {
            type: 'string',
            description: 'Date of birth of the child.'
          },
          date: {
            type: 'string',
            description: 'Confirmed date of the visit.'
          },
          timeSlot: {
            type: 'string',
            description: 'Selected time slot (e.g. 11:15 AM).'
          },
          reason: {
            type: 'string',
            description: 'Reason for visit or symptoms.'
          }
        },
        required: ['childName', 'phone', 'date', 'timeSlot']
      }
    },
    messages: [
      {
        type: 'request-start',
        content: 'Booking that appointment right now...'
      }
    ]
  },
  {
    type: 'function',
    function: {
      name: 'refill_request',
      description: 'Collects prescription refill details and forwards them to the clinical nursing triage queue.',
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
          medicationName: {
            type: 'string',
            description: 'Name and strength of the medication.'
          },
          dosage: {
            type: 'string',
            description: 'Dosage instructions if known.'
          },
          pharmacyName: {
            type: 'string',
            description: 'Name and location of preferred pharmacy.'
          },
          pharmacyPhone: {
            type: 'string',
            description: 'Phone number of pharmacy.'
          },
          phone: {
            type: 'string',
            description: 'Parent contact phone number.'
          }
        },
        required: ['patientName', 'medicationName']
      }
    },
    messages: [
      {
        type: 'request-start',
        content: 'Submitting the refill request to our nursing team...'
      }
    ]
  }
];

async function runSetup() {
  console.log('=== Vapi Automated Assistant Setup ===');

  // 1. Fetch current assistant details
  console.log('\n1. Fetching current Assistant...');
  const currentAst = await requestVapi('GET', `/assistant/${ASSISTANT_ID}`);
  console.log(`Status: ${currentAst.status}, Assistant: "${currentAst.data.name}"`);

  // 2. Create tools
  console.log('\n2. Creating Tool Schemas on Vapi...');
  const createdToolIds = [];
  for (const tool of toolsToCreate) {
    const res = await requestVapi('POST', '/tool', tool);
    if (res.data && res.data.id) {
      console.log(`✅ Created Tool "${tool.function.name}" -> Tool ID: ${res.data.id}`);
      createdToolIds.push(res.data.id);
    } else {
      console.log(`⚠️ Status ${res.status}:`, res.data || res.raw);
    }
  }

  // 3. Attach tools to assistant
  console.log('\n3. Attaching Tools to Assistant...');
  const updatePayload = {
    model: {
      model: currentAst.data.model ? currentAst.data.model.model : 'gpt-4o-mini',
      provider: 'openai',
      messages: currentAst.data.model.messages,
      toolIds: createdToolIds
    }
  };

  const updateRes = await requestVapi('PATCH', `/assistant/${ASSISTANT_ID}`, updatePayload);
  console.log(`Update Status: ${updateRes.status}`);
  if (updateRes.data && updateRes.data.model) {
    console.log('Attached Tool IDs:', updateRes.data.model.toolIds);
  }

  // 4. Check Phone Numbers
  console.log('\n4. Checking Phone Numbers...');
  const phoneRes = await requestVapi('GET', '/phone-number');
  if (Array.isArray(phoneRes.data)) {
    for (const phone of phoneRes.data) {
      console.log(`📞 Phone Number: ${phone.number} (ID: ${phone.id}, Current Assistant: ${phone.assistantId || 'None'})`);
      
      // Ensure phone number points to this assistant
      if (phone.assistantId !== ASSISTANT_ID) {
        console.log(`   Linking ${phone.number} to Assistant ${ASSISTANT_ID}...`);
        const linkRes = await requestVapi('PATCH', `/phone-number/${phone.id}`, { assistantId: ASSISTANT_ID });
        console.log(`   Linked status: ${linkRes.status}`);
      }
    }
  }

  console.log('\n🎉 Vapi Assistant & Phone Setup Complete!');
}

runSetup();
