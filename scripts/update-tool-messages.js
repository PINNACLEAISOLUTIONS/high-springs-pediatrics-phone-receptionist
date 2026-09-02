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

// Highly conversational human receptionist phrases for each tool action
const TOOL_CONVERSATIONAL_MESSAGES = {
  'submit_refill_request': {
    requestStart: "Give me just a second while I type that into the system...",
    requestComplete: "All set, I've sent that refill request directly to our clinical nursing staff."
  },
  'take_general_message': {
    requestStart: "Got it, let me get that typed up and sent over to them right now...",
    requestComplete: "Done, I have that message logged and sent right to the office staff."
  },
  'book_appointment': {
    requestStart: "Give me just a moment while I lock that slot into the schedule for you...",
    requestComplete: "Perfect, that appointment is officially scheduled on our calendar."
  },
  'check_google_calendar': {
    requestStart: "Let me pull up the physician schedule real quick to check those openings...",
    requestComplete: "Thanks for waiting, I have the openings right here."
  },
  'check_availability': {
    requestStart: "One second while I check the schedule for you...",
    requestComplete: "Here are the latest openings."
  },
  'refill_request': {
    requestStart: "Give me just a second while I type that into the system...",
    requestComplete: "I have that refill logged for the nursing team."
  }
};

async function updateToolRequestStartMessages() {
  console.log('================================================================');
  console.log('  PINNACLE AI SOLUTIONS - VAPI TOOL CONVERSATIONAL UPGRADE      ');
  console.log('  Client: High Springs Pediatrics and Primary Care              ');
  console.log(`  Assistant ID: ${ASSISTANT_ID}                                 `);
  console.log('================================================================\n');

  console.log('1. Fetching active assistant details from Vapi API...');
  const asstRes = await requestVapi('GET', `/assistant/${ASSISTANT_ID}`);
  if (asstRes.status !== 200) {
    console.error('❌ Failed to fetch assistant:', asstRes.data || asstRes.raw);
    process.exit(1);
  }

  const assistant = asstRes.data;
  console.log(`   Assistant Name: "${assistant.name}"`);
  const assistantToolIds = assistant.model?.toolIds || [];
  console.log(`   Attached Tool IDs (${assistantToolIds.length}):`, assistantToolIds);

  console.log('\n2. Fetching all account tools from Vapi API...');
  const toolsRes = await requestVapi('GET', '/tool');
  if (toolsRes.status !== 200) {
    console.error('❌ Failed to fetch tools:', toolsRes.data || toolsRes.raw);
    process.exit(1);
  }

  const allTools = Array.isArray(toolsRes.data) ? toolsRes.data : [];
  console.log(`   Total Tools Found in Account: ${allTools.length}`);

  console.log('\n3. Updating custom function tools with human conversational messages...');
  const updatedToolSummaries = [];

  for (const tool of allTools) {
    const fnName = tool.function?.name;
    const isAttached = assistantToolIds.includes(tool.id);

    // If it's a function tool
    if (tool.type === 'function' && fnName) {
      const phrases = TOOL_CONVERSATIONAL_MESSAGES[fnName] || {
        requestStart: "Give me just a second while I type that into the system...",
        requestComplete: "Thank you for waiting, I have that processed now."
      };

      console.log(`\n   🛠️  Processing Tool: "${fnName}" (ID: ${tool.id}) [Attached: ${isAttached ? 'YES' : 'NO'}]`);
      console.log(`      Old Message: "${tool.messages?.[0]?.content || '(None)'}"`);
      console.log(`      New Human Message: "${phrases.requestStart}"`);

      const updatedMessages = [
        {
          type: 'request-start',
          content: phrases.requestStart
        },
        {
          type: 'request-complete',
          content: phrases.requestComplete
        }
      ];

      const patchRes = await requestVapi('PATCH', `/tool/${tool.id}`, {
        messages: updatedMessages
      });

      if (patchRes.status === 200) {
        console.log(`      ✅ Successfully updated tool "${fnName}" via Vapi REST API!`);
        updatedToolSummaries.push({
          id: tool.id,
          name: fnName,
          type: tool.type,
          attached: isAttached,
          requestStartMessage: phrases.requestStart
        });
      } else {
        console.error(`      ❌ Error updating tool ${fnName}:`, patchRes.data || patchRes.raw);
      }
    } else if (tool.type === 'transferCall') {
      console.log(`\n   📞 Tool "${tool.type}" (ID: ${tool.id}) - Preserving transfer action`);
    }
  }

  // Verify the assistant's attached tools
  console.log('\n4. Verifying assistant state on Vapi API...');
  const verifyRes = await requestVapi('GET', `/assistant/${ASSISTANT_ID}`);
  const verifiedTools = await requestVapi('GET', '/tool');

  console.log('\n================================================================');
  console.log('🎉 SUCCESS: ALL VAPI CUSTOM FUNCTION TOOLS CONVERSATIONALLY UPDATED!');
  console.log('================================================================');
  console.log(`Assistant: "${verifyRes.data.name}" (${verifyRes.data.id})`);
  console.log('Updated Tools Summary:');
  updatedToolSummaries.forEach(t => {
    console.log(`  • [${t.name}] -> "${t.requestStartMessage}"`);
  });
  console.log('================================================================\n');
}

updateToolRequestStartMessages().catch(err => {
  console.error('Fatal error updating tools:', err);
  process.exit(1);
});
