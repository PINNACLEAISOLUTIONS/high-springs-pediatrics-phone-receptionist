const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '10152953-a211-4737-a005-1705cda37b62';

const newUrl = process.argv[2];

if (!newUrl) {
  console.log('Usage: node scripts/update-server-url.js https://your-ngrok-url.ngrok-free.app/api/vapi/webhook');
  process.exit(1);
}

const postData = JSON.stringify({
  serverUrl: newUrl
});

const options = {
  hostname: 'api.vapi.ai',
  path: `/assistant/${ASSISTANT_ID}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Server URL successfully updated on Vapi Assistant (${ASSISTANT_ID}) to:`);
    console.log(`👉 ${newUrl}`);
  });
});

req.on('error', (e) => console.error('Error updating Server URL:', e));
req.write(postData);
req.end();
