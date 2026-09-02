# 🩺 High Springs Pediatrics — Vapi.ai Voice Integration Middleware

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Vapi.ai](https://img.shields.io/badge/Vapi.ai-Voice%20Integration-06b6d4.svg)](https://vapi.ai/)
[![Pinnacle AI Solutions](https://img.shields.io/badge/Engineered%20by-Pinnacle%20AI-indigo.svg)]()

> **Client:** High Springs Pediatrics  
> **Assistant ID:** `10152953-a211-4737-a005-1705cda37b62`  
> **Integrations Partner:** Pinnacle AI Solutions  

This Node.js Express middleware server acts as the dedicated function-calling webhook backend for High Springs Pediatrics' conversational AI voice assistant.

---

## 📋 Features & Handled Tool Calls

The middleware captures Vapi `tool-calls` payloads and executes the following 3 pediatric clinical functions:

| Function Name | Description | Response Output |
| :--- | :--- | :--- |
| `check_availability` | Queries open clinic appointment slots based on requested date and visit type. | Returns open 30-min time slots (`9:30 AM, 11:15 AM, 2:00 PM, 3:45 PM`). |
| `book_appointment` | Reserves a consultation for the child patient and issues a confirmation code. | Returns confirmation number (`HSP-XXXXX`) and visit details. |
| `refill_request` | Receives prescription refill details, logs clinical intake to console, and queues for triage. | Logs structured clinical intake; returns 24-48h nursing triage message. |

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- **Node.js** v18+ installed

### 2. Configure Environment
Create your `.env` file from the template:
```bash
cp .env.template .env
```

### 3. Start the Server
```bash
npm start
```
*Or during active development:*
```bash
npm run dev
```

The server will start listening at `http://localhost:3000` with the webhook ready at `http://localhost:3000/api/vapi/webhook`.

### 4. Run Automated Tool Tests
Verify that all 3 tool calls are functioning properly:
```bash
npm test
```

---

## 🌐 Connecting to Live Vapi Phone Calls with Ngrok

To allow your live Vapi voice assistant to talk to this local server during phone calls, follow these simple steps:

### Step 1: Start your Ngrok Tunnel
Open a new terminal window and run:
```bash
ngrok http 3000
```

Ngrok will provide a public HTTPS forwarding address, for example:
```
Forwarding   https://abc-123-xyz.ngrok-free.app -> http://localhost:3000
```

### Step 2: Configure Server URL in Vapi Dashboard
1. Log in to [Vapi Dashboard](https://dashboard.vapi.ai/).
2. Open your assistant: **High Springs Pediatrics** (`10152953-a211-4737-a005-1705cda37b62`).
3. Scroll down to the **Server URL** input field.
4. Paste your public Ngrok webhook address:
   ```
   https://abc-123-xyz.ngrok-free.app/api/vapi/webhook
   ```
5. Click **Save** in the top right.

### Step 3: Test Live Phone Call
Call your Vapi phone number or click **Test Call** in the Vapi dashboard:
- Ask Amy: *"What time slots do you have open tomorrow for a well-child check?"* -> You will see `check_availability` execute in your server terminal.
- Say: *"Let's book 11:15 AM for my son Tommy."* -> You will see `book_appointment` execute and issue an `HSP-XXXXX` confirmation code.
- Say: *"I need a refill on Tommy's Amoxicillin at CVS."* -> You will see the highlighted **MEDICATION REFILL REQUEST** block printed to your server terminal!

---

## 🛠️ Vapi Tool JSON Schemas

If you need to configure these function tools in the Vapi Tools library, use these exact schemas:

### 1. `check_availability`
```json
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Checks available appointment slots for High Springs Pediatrics.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "Requested appointment date (e.g., '2026-09-04' or 'tomorrow')."
        },
        "appointmentType": {
          "type": "string",
          "description": "Type of visit (e.g., 'Well-Child Check', 'Sick Visit', 'Follow-Up')."
        }
      },
      "required": ["date"]
    }
  }
}
```

### 2. `book_appointment`
```json
{
  "type": "function",
  "function": {
    "name": "book_appointment",
    "description": "Books a confirmed pediatric appointment and returns a confirmation number.",
    "parameters": {
      "type": "object",
      "properties": {
        "childName": {
          "type": "string",
          "description": "Full name of the child/patient."
        },
        "parentName": {
          "type": "string",
          "description": "Full name of the parent or guardian."
        },
        "phone": {
          "type": "string",
          "description": "Best contact phone number."
        },
        "dob": {
          "type": "string",
          "description": "Date of birth of the child."
        },
        "date": {
          "type": "string",
          "description": "Confirmed date of the visit."
        },
        "timeSlot": {
          "type": "string",
          "description": "Selected time slot (e.g., '11:15 AM')."
        },
        "reason": {
          "type": "string",
          "description": "Reason for visit or symptoms."
        }
      },
      "required": ["childName", "phone", "date", "timeSlot"]
    }
  }
}
```

### 3. `refill_request`
```json
{
  "type": "function",
  "function": {
    "name": "refill_request",
    "description": "Collects prescription refill details and forwards to nursing triage.",
    "parameters": {
      "type": "object",
      "properties": {
        "patientName": {
          "type": "string",
          "description": "Full name of the patient."
        },
        "dob": {
          "type": "string",
          "description": "Date of birth of the patient."
        },
        "medicationName": {
          "type": "string",
          "description": "Name and strength of the medication (e.g., 'Amoxicillin 250mg')."
        },
        "dosage": {
          "type": "string",
          "description": "Dosage instructions (e.g., '5mL twice daily')."
        },
        "pharmacyName": {
          "type": "string",
          "description": "Name of pharmacy (e.g., 'CVS on Main St')."
        },
        "pharmacyPhone": {
          "type": "string",
          "description": "Phone number of pharmacy."
        },
        "phone": {
          "type": "string",
          "description": "Parent contact phone number."
        }
      },
      "required": ["patientName", "medicationName"]
    }
  }
}
```

---

## 📁 Directory Architecture

```
high-springs-pediatrics-vapi/
├── .env.template            # Configuration template (PORT, VAPI_API_KEY, VAPI_ASSISTANT_ID)
├── package.json             # Dependencies (express, cors, dotenv)
├── server.js                # Express app entrypoint & middleware
├── src/
│   ├── config/config.js     # Config loader
│   ├── routes/vapiRoutes.js # Route definitions (POST /api/vapi/webhook)
│   ├── controllers/vapiController.js # Vapi payload parser & tool dispatcher
│   └── services/toolsService.js      # Implementations of check_availability, book_appointment, refill_request
├── test/
│   └── test-vapi-tools.js   # Automated integration test suite
└── README.md                # Branded client documentation
```

---

<div align="center">
  <sub>Engineered with ❤️ by <strong>Pinnacle AI Solutions</strong> — Voice AI Integrations Division</sub>
</div>
