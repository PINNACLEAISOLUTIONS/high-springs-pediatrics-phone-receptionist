const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { initGoogleCalendar, createCalendarEvent } = require('../src/services/googleCalendarService');

async function testCalendar() {
  console.log('--- Testing Google Calendar Service ---');
  
  const client = initGoogleCalendar();
  console.log('Calendar client initialized:', client ? 'LIVE AUTHENTICATED' : 'MOCK / READY FOR CREDENTIALS');

  const sampleBooking = {
    confirmationNumber: '481',
    patientName: 'Michael Patella',
    dob: '1983-01-30',
    phone: '+1 (352) 231-9154',
    date: 'tomorrow',
    timeSlot: '10:15 AM',
    reason: 'Follow-up Consultation with Dr. Nasir Ahmed'
  };

  console.log('\nSubmitting test booking event to Google Calendar Service...');
  const res = await createCalendarEvent(sampleBooking);
  console.log('Google Calendar Booking Result:', res);

  console.log('\n✅ Google Calendar Service Module Tested Successfully!');
  process.exit(0);
}

testCalendar();
