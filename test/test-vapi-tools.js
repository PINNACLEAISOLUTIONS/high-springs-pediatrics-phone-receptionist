const http = require('http');
const express = require('express');
const cors = require('cors');
const vapiRoutes = require('../src/routes/vapiRoutes');

const PORT = 3005;

function createTestServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/vapi', vapiRoutes);
  app.use('/api', vapiRoutes);
  return http.createServer(app);
}

function postWebhook(payload, port = PORT) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port,
      path: '/api/vapi/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runValidation() {
  console.log('--- Starting High Springs Pediatrics Vapi Middleware Tests ---\n');

  const testServer = createTestServer();
  await new Promise((resolve) => testServer.listen(PORT, resolve));
  console.log(`[Test Runner] Test server listening on http://localhost:${PORT}`);

  try {
    // 1. Test check_availability
    console.log('\n--- 1. Testing check_availability ---');
    const checkPayload = {
      message: {
        type: 'tool-calls',
        toolCalls: [
          {
            id: 'call_check_avail_001',
            type: 'function',
            function: {
              name: 'check_availability',
              arguments: {
                date: '2026-09-04',
                appointmentType: 'Well-Child Check'
              }
            }
          }
        ],
        call: { id: 'call_test_001', assistantId: '10152953-a211-4737-a005-1705cda37b62' }
      }
    };

    const checkRes = await postWebhook(checkPayload, PORT);
    console.log('HTTP Status:', checkRes.status);
    console.log('Response Body:', JSON.stringify(checkRes.data, null, 2));
    const checkPassed = checkRes.status === 200 && checkRes.data.results && checkRes.data.results.length > 0;
    console.log(`Result: ${checkPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // 2. Test book_appointment
    console.log('\n--- 2. Testing book_appointment ---');
    const bookPayload = {
      message: {
        type: 'tool-calls',
        toolCalls: [
          {
            id: 'call_book_apt_002',
            type: 'function',
            function: {
              name: 'book_appointment',
              arguments: {
                childName: 'Emma Watson',
                parentName: 'Robert Watson',
                phone: '+1 (555) 342-9182',
                dob: '2019-07-14',
                date: 'Friday, Sep 4th',
                timeSlot: '11:15 AM',
                reason: 'Annual Checkup & Immunization Booster'
              }
            }
          }
        ],
        call: { id: 'call_test_002', assistantId: '10152953-a211-4737-a005-1705cda37b62' }
      }
    };

    const bookRes = await postWebhook(bookPayload, PORT);
    console.log('HTTP Status:', bookRes.status);
    console.log('Response Body:', JSON.stringify(bookRes.data, null, 2));
    const bookPassed = bookRes.status === 200 && bookRes.data.results && /Confirmation number: \d{3}/.test(bookRes.data.results[0].result);
    console.log(`Result: ${bookPassed ? '✅ PASSED' : '❌ FAILED'}`);

    // 3. Test refill_request
    console.log('\n--- 3. Testing refill_request ---');
    const refillPayload = {
      message: {
        type: 'tool-calls',
        toolCalls: [
          {
            id: 'call_refill_003',
            type: 'function',
            function: {
              name: 'refill_request',
              arguments: {
                patientName: 'Liam Johnson',
                dob: '2020-03-22',
                medicationName: 'Albuterol Inhaler 90mcg',
                dosage: '2 puffs every 4-6 hours as needed',
                pharmacyName: 'CVS Pharmacy - High Springs Branch',
                pharmacyPhone: '+1 (555) 887-2341',
                phone: '+1 (555) 431-9021'
              }
            }
          }
        ],
        call: { id: 'call_test_003', assistantId: '10152953-a211-4737-a005-1705cda37b62' }
      }
    };

    const refillRes = await postWebhook(refillPayload, PORT);
    console.log('HTTP Status:', refillRes.status);
    console.log('Response Body:', JSON.stringify(refillRes.data, null, 2));
    const refillPassed = refillRes.status === 200 && refillRes.data.results && refillRes.data.results[0].result.includes('refill request');
    console.log(`Result: ${refillPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (checkPassed && bookPassed && refillPassed) {
      console.log('\n==============================================================');
      console.log('🎉 ALL 3 HIGH SPRINGS PEDIATRICS TOOLS VALIDATED SUCCESSFULLY!');
      console.log('==============================================================\n');
    } else {
      console.error('⚠️ One or more tool tests failed.');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error executing validation:', err);
    process.exit(1);
  } finally {
    testServer.close();
  }
}

if (require.main === module) {
  runValidation();
}

module.exports = { runValidation };
