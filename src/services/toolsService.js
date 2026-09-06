const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createCalendarEvent } = require('./googleCalendarService');

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSms(to, body) {
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[Twilio] SMS skipped: configuration missing.');
    return;
  }
  try {
    await client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
  } catch (err) {
    console.error('[Twilio Error]:', err.message);
  }
}

/**
 * 1. check_availability
 */
function handleCheckAvailability(args = {}) {
  const dateInput = args.date || args.requestedTime || 'tomorrow';
  const visitType = args.appointmentType || args.visitType || args.reason || 'General Pediatric Consultation';

  let provider = args.provider || args.doctor || args.physician || 'Dr. Nasir Ahmed, M.D.';
  if (provider.toLowerCase().includes('ramin')) {
    provider = 'Dr. Ramin Ahmed, M.D.';
  } else if (provider.toLowerCase().includes('nasir')) {
    provider = 'Dr. Nasir Ahmed, M.D.';
  }

  const mockSlots = ['9:30 AM', '10:15 AM', '11:15 AM', '2:00 PM', '2:45 PM', '3:45 PM'];

  return {
    status: 'success',
    available: true,
    date: dateInput,
    provider,
    visitType,
    availableSlots: mockSlots,
    message: `${provider} has open slots for a ${visitType} on ${dateInput}: ${mockSlots.join(', ')}.`
  };
}

/**
 * 2. book_appointment
 */
async function handleBookAppointment(args = {}) {
  const childName = args.patientName || args.childName || `${args.firstName || 'Child'} ${args.lastName || 'Patient'}`.trim();
  const parentName = args.parentName || args.guardianName || 'Parent/Guardian';
  const phone = args.phone || args.contactNumber || 'Not provided';
  const date = args.date || args.requestedTime || 'Requested Date';
  const timeSlot = args.timeSlot || args.time || '10:00 AM';
  const reason = args.reason || args.appointmentType || 'Routine Pediatric Visit';
  const dob = args.dob || args.birthDate || 'Not specified';
  const doctorPick = `${args.doctor || args.provider || args.physician || ''}`.toLowerCase();
  const provider = doctorPick.includes('ramin')
    ? 'Dr. Ramin Ahmed, M.D.'
    : 'Dr. Nasir Ahmed, M.D.';

  const confirmationNumber = Math.floor(100 + Math.random() * 900).toString();

  const bookingRecord = await prisma.appointment.create({
    data: {
      confirmationNumber,
      patientName: childName,
      parentName,
      phone,
      dob,
      provider,
      date,
      timeSlot,
      reason,
      status: 'CONFIRMED'
    }
  });

  createCalendarEvent(bookingRecord).catch(err => console.error('[Calendar Sync Error]:', err.message));

  // SMS Notification
  if (phone && phone !== 'Not provided') {
    sendSms(phone, `High Springs Pediatrics: Your appointment for ${childName} is confirmed for ${date} at ${timeSlot}. Conf: ${confirmationNumber}`);
  }

  const confDigits = confirmationNumber.split('').join(' ');
  return {
    status: 'confirmed',
    confirmationNumber,
    provider,
    patientName: childName,
    date,
    timeSlot,
    // Full read-back for the assistant to speak verbatim.
    message: `You're all set. I have ${childName} booked to see ${provider} on ${date} at ${timeSlot} for a ${reason}. Your confirmation number is ${confDigits}. Is there anything else I can help you with?`
  };
}

/**
 * 3. submit_refill_request
 */
async function handleRefillRequest(args = {}) {
  const patientName = args.patientName || 'Patient';
  const dob = args.dob || 'Not specified';
  const phone = args.phone || 'Not provided';
  const medication = args.medication || 'Prescription Medication';
  const dosage = args.dosage || 'Standard Prescription';
  const pharmacyName = args.pharmacyName || 'Pharmacy on file';
  const refillId = `REF-${Math.floor(10000 + Math.random() * 90000)}`;

  await prisma.refillRequest.create({
    data: {
      refillId,
      patientName,
      dob,
      phone,
      medication,
      dosage,
      pharmacyName,
      status: 'TRIAGE_DASHBOARD_LOGGED'
    }
  });

  return {
    status: 'success',
    refillId,
    patientName,
    medication,
    message: `Refill request for ${medication} successfully logged and sent to the clinical staff's dashboard.`
  };
}

/**
 * 4. take_general_message
 */
async function handleTakeGeneralMessage(args = {}) {
  const callerName = args.callerName || 'Caller';
  const phoneNumber = args.phoneNumber || 'Not provided';
  const reasonForCall = args.reasonForCall || 'General Inquiry';
  const messageBody = args.messageBody || 'No message';
  const messageId = `MSG-${Math.floor(10000 + Math.random() * 90000)}`;

  await prisma.generalMessage.create({
    data: {
      messageId,
      callerName,
      phoneNumber,
      reasonForCall,
      messageBody,
      status: 'ROUTED_TO_OFFICE_STAFF'
    }
  });

  return {
    status: 'success',
    messageId,
    callerName,
    reasonForCall,
    message: `Message from ${callerName} regarding ${reasonForCall} has been securely logged and routed to the office staff.`
  };
}

module.exports = {
  handleCheckAvailability,
  handleBookAppointment,
  handleRefillRequest,
  handleTakeGeneralMessage
};
