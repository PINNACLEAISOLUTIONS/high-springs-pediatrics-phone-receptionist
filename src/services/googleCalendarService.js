/**
 * GOOGLE CALENDAR SERVICE FOR HIGH SPRINGS PEDIATRICS
 * Handles Google Calendar authentication (Service Account & OAuth2) and event creation.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let calendarClient = null;
let configuredCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Initializes Google Calendar Auth
 */
function initGoogleCalendar() {
  try {
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
      ? path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
      : path.resolve(process.cwd(), 'service-account.json');

    // Option A: Service Account JSON file
    if (fs.existsSync(serviceAccountPath)) {
      console.log(`[Google Calendar] Initializing with Service Account key file: ${serviceAccountPath}`);
      const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
      });
      calendarClient = google.calendar({ version: 'v3', auth });
      return calendarClient;
    }

    // Option B: Service Account Credentials from .env
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      console.log(`[Google Calendar] Initializing with Service Account email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
      });
      calendarClient = google.calendar({ version: 'v3', auth });
      return calendarClient;
    }

    // Option C: OAuth2 Tokens from .env
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
      console.log('[Google Calendar] Initializing with Google OAuth2 credentials...');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      calendarClient = google.calendar({ version: 'v3', auth: oauth2Client });
      return calendarClient;
    }

    console.warn('[Google Calendar] Notice: No Google Calendar credentials found in .env or service-account.json yet. Appointments will be stored locally in memory and mock-confirmed.');
    return null;
  } catch (error) {
    console.error('[Google Calendar Auth Error]:', error.message);
    return null;
  }
}

/**
 * Creates an event on the Google Calendar
 * @param {Object} booking - Booking details
 */
async function createCalendarEvent(booking) {
  if (!calendarClient) {
    calendarClient = initGoogleCalendar();
  }

  if (!calendarClient) {
    console.log(`[Google Calendar Mock] Simulating calendar booking for ${booking.patientName || booking.childName} (Confirmation: ${booking.confirmationNumber})`);
    return {
      success: true,
      mode: 'mock',
      eventId: `mock_evt_${booking.confirmationNumber}`,
      htmlLink: `https://calendar.google.com/`
    };
  }

  try {
    const patientName = booking.patientName || booking.childName || 'Patient';
    const dob = booking.dob || 'Not specified';
    const phone = booking.phone || 'Not provided';
    const reason = booking.reason || 'Pediatric Consultation';
    const confirmation = booking.confirmationNumber;
    const timeSlot = booking.timeSlot || '10:15 AM';
    const dateStr = booking.date || 'tomorrow';

    // Parse date/time
    let startDateTime = new Date();
    if (dateStr.toLowerCase().includes('tomorrow')) {
      startDateTime.setDate(startDateTime.getDate() + 1);
    }

    // Match hour and minute from timeSlot string (e.g., "10:15 AM")
    const timeMatch = timeSlot.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2] || '0', 10);
      const period = (timeMatch[3] || '').toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      startDateTime.setHours(hours, minutes, 0, 0);
    } else {
      startDateTime.setHours(10, 15, 0, 0);
    }

    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 min duration

    const eventPayload = {
      summary: `🩺 High Springs Pediatrics: ${patientName} - ${reason}`,
      description: `**High Springs Pediatrics and Primary Care — Appointment Details**
--------------------------------------------------
• Patient Name: ${patientName}
• Date of Birth: ${dob}
• Contact Phone: ${phone}
• Reason for Visit: ${reason}
• Confirmation Code: #${confirmation}
• Provider: Dr. Nasir Ahmed, M.D.
• Location: 19228 NW US Highway 441, High Springs, FL 32643
• Clinic Phone: (386) 454-1156
• Booked By: Sarah (Voice AI Receptionist)`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      attendees: phone.includes('@') ? [{ email: phone }] : []
    };

    const targetCalId = process.env.GOOGLE_CALENDAR_ID || configuredCalendarId;
    console.log(`[Google Calendar] Inserting event for ${patientName} on calendar: ${targetCalId}...`);

    const response = await calendarClient.events.insert({
      calendarId: targetCalId,
      resource: eventPayload
    });

    console.log(`[Google Calendar] ✅ Event created successfully! Link: ${response.data.htmlLink}`);
    return {
      success: true,
      mode: 'live',
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    };
  } catch (error) {
    console.error(`[Google Calendar Insert Error]: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initGoogleCalendar,
  createCalendarEvent
};
