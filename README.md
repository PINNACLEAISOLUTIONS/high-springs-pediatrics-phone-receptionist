# 🩺 High Springs Pediatrics — Vapi.ai Voice Integration Middleware

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2d3748.svg)](https://www.prisma.io/)
[![Vapi.ai](https://img.shields.io/badge/Vapi.ai-Voice%20Integration-06b6d4.svg)](https://vapi.ai/)
[![Pinnacle AI Solutions](https://img.shields.io/badge/Engineered%20by-Pinnacle%20AI-indigo.svg)]()

> **Client:** High Springs Pediatrics  
> **Assistant ID:** `10152953-a211-4737-a005-1705cda37b62`  
> **Integrations Partner:** Pinnacle AI Solutions  

This Node.js Express middleware server acts as the dedicated function-calling webhook backend for High Springs Pediatrics' conversational AI voice assistant.

---

## 📋 Features & Handled Tool Calls

The middleware captures Vapi `tool-calls` payloads and executes the following pediatric clinical functions. All records are persisted to the database via Prisma (SQLite in local dev):

| Function Name | Description | Response Output |
| :--- | :--- | :--- |
| `check_availability` | Queries open clinic appointment slots based on requested date and visit type. | Returns open 30-min time slots (`9:30 AM, 11:15 AM, 2:00 PM, 3:45 PM`). |
| `book_appointment` | Reserves a consultation, persists it (`Appointment`), issues a 3-digit confirmation number, and — if Twilio is configured — texts the caller a confirmation. | Returns 3-digit confirmation number and visit details. |
| `refill_request` | Persists a prescription refill request (`RefillRequest`) for nursing triage. | Returns 24-48h nursing triage message. |
| `take_general_message` | Persists a general caller message (`GeneralMessage`) routed to office staff. | Returns confirmation the message was logged. |

### Security

- **Webhook signature verification** — `POST /api/vapi/webhook` is guarded by `src/middleware/webhookAuth.js`, which validates the `x-vapi-signature` HMAC-SHA256 header against `VAPI_WEBHOOK_SECRET`. Requests without a valid signature are rejected with `401`.
- **Dashboard Basic Auth** — the clinical portal and `/api/*` routes are protected by `src/middleware/authMiddleware.js` using `DASHBOARD_USER` / `DASHBOARD_PASS`. `/api/health` and `/api/vapi/*` are exempt. If the credentials are unset the server returns `500` (fail closed).

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- **Node.js** v20+ installed

### 2. Configure Environment
Create your `.env` file from the template and fill in real values:
```bash
cp .env.template .env
```
Required for a working local run: `VAPI_WEBHOOK_SECRET`, `DASHBOARD_USER`, `DASHBOARD_PASS`, `DATABASE_URL` (defaults to `file:./dev.db`).
Optional: `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` (SMS confirmations — skipped if unset), Google Calendar vars.
**Never commit `.env`, `dev.db`, or `service-account.json`** — all are git-ignored.

### 3. Install & Set Up the Database
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates dev.db from prisma/schema.prisma
```

### 4. Start the Server
```bash
npm start
```
*Or during active development:*
```bash
npm run dev
```

The server will start listening at `http://localhost:3000` with the webhook ready at `http://localhost:3000/api/vapi/webhook`.

### 5. Run Automated Tool Tests
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
- Ask Riley: *"What time slots do you have open tomorrow for a well-child check?"* -> You will see `check_availability` execute in your server terminal.
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
├── .env.template            # Configuration template (all env vars, with comments)
├── package.json             # express, @prisma/client, twilio, googleapis, cors, dotenv
├── server.js                # Express app entrypoint, static portal, data + health APIs
├── prisma/
│   └── schema.prisma        # DB models: Appointment, RefillRequest, GeneralMessage, CallLog
├── public/                  # Clinical portal SPA (index.html, style.css, app.js)
├── src/
│   ├── config/config.js               # Config loader
│   ├── middleware/authMiddleware.js    # Basic Auth for the portal + /api data routes
│   ├── middleware/webhookAuth.js       # Vapi webhook secret / signature verification
│   ├── routes/vapiRoutes.js            # POST /api/vapi/webhook
│   ├── controllers/vapiController.js   # Vapi payload parser & async tool dispatcher
│   └── services/
│       ├── toolsService.js             # check_availability, book_appointment, refill_request, take_general_message (Prisma-backed)
│       ├── vapiCallsService.js         # Pulls + classifies live calls from the Vapi REST API
│       └── googleCalendarService.js    # Optional Google Calendar sync
├── experimental/prisma-next/           # Parked Postgres/Prisma-Next experiment — NOT wired in
├── test/
│   └── test-vapi-tools.js   # Automated tool integration tests (npm test)
└── README.md
```

---

<div align="center">
  <sub>Engineered with ❤️ by <strong>Pinnacle AI Solutions</strong> — Voice AI Integrations Division</sub>
</div>
