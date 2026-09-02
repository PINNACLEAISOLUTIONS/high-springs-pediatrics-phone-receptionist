/**
 * HIGH SPRINGS PEDIATRICS - TOOL IMPLEMENTATIONS
 * Handles Vapi Tool Calls: check_availability, book_appointment, refill_request
 */

const { createCalendarEvent } = require('./googleCalendarService');

// In-memory stores for demonstration
const appointmentsStore = [];
const refillRequestsStore = [];

/**
 * 1. check_availability
 * Returns open consultation slots for pediatric patients
 */
function handleCheckAvailability(args = {}) {
  const dateInput = args.date || args.requestedTime || 'tomorrow';
  const visitType = args.appointmentType || args.visitType || args.reason || 'General Pediatric Consultation';
  const provider = args.provider || args.doctor || 'Dr. Nasir Ahmed, M.D.';

  console.log(`[High Springs Pediatrics] Checking availability for ${visitType} on ${dateInput}...`);

  // Mocked realistic pediatric clinic openings
  const mockSlots = [
    '9:30 AM',
    '11:15 AM',
    '2:00 PM',
    '3:45 PM'
  ];

  const slotsList = mockSlots.join(', ');

  const result = {
    status: 'success',
    available: true,
    date: dateInput,
    provider,
    visitType,
    availableSlots: mockSlots,
    message: `We have several open slots for a ${visitType} on ${dateInput}: ${slotsList}. Which time works best for your child?`
  };

  return result;
}

/**
 * 2. book_appointment
 * Confirms pediatric appointment and issues a unique confirmation number
 */
function handleBookAppointment(args = {}) {
  const childName = args.patientName || args.childName || `${args.firstName || 'Child'} ${args.lastName || 'Patient'}`.trim();
  const parentName = args.parentName || args.guardianName || 'Parent/Guardian';
  const phone = args.phone || args.contactNumber || 'Not provided';
  const date = args.date || args.requestedTime || 'Requested Date';
  const timeSlot = args.timeSlot || args.time || '10:00 AM';
  const reason = args.reason || args.appointmentType || 'Routine Pediatric Visit';
  const dob = args.dob || args.birthDate || 'Not specified';

  // Generate random 3-digit confirmation number (100 - 999)
  const confirmationNumber = Math.floor(100 + Math.random() * 900);

  const bookingRecord = {
    confirmationNumber: String(confirmationNumber),
    patientName: childName,
    parentName,
    phone,
    dob,
    date,
    timeSlot,
    reason,
    status: 'CONFIRMED',
    bookedAt: new Date().toISOString()
  };

  appointmentsStore.unshift(bookingRecord);

  // Trigger Google Calendar insertion asynchronously
  createCalendarEvent(bookingRecord).catch(err => {
    console.error('[Google Calendar Sync Warning]:', err.message);
  });

  console.log('\n==============================================================');
  console.log(`[HIGH SPRINGS PEDIATRICS] 📅 APPOINTMENT BOOKED`);
  console.log(`Confirmation Number: ${confirmationNumber}`);
  console.log('==============================================================');
  console.log(`Patient Name:     ${childName} (DOB: ${dob})`);
  console.log(`Parent Contact:   ${parentName} (${phone})`);
  console.log(`Scheduled Time:   ${date} at ${timeSlot}`);
  console.log(`Reason for Visit: ${reason}`);
  console.log('==============================================================\n');

  const result = {
    status: 'confirmed',
    confirmationNumber: String(confirmationNumber),
    message: `Appointment booked successfully. Confirmation number: ${confirmationNumber}`
  };

  return result;
}

/**
 * 3. submit_refill_request / refill_request
 * Logs patient medication refill request and routes to triage dashboard
 */
function handleRefillRequest(args = {}) {
  const patientName = args.patientName || args.childName || `${args.firstName || 'Patient'} ${args.lastName || ''}`.trim();
  const dob = args.dob || args.birthDate || 'Not specified';
  const phone = args.phone || args.parentPhone || args.contactNumber || 'Not provided';
  const medication = args.medication || args.medicationName || args.drug || 'Prescription Medication';
  const dosage = args.dosage || args.strength || 'Standard Prescription';
  const pharmacyName = args.pharmacyName || args.pharmacy || 'Preferred Pharmacy on file';

  const refillId = `REF-${Math.floor(10000 + Math.random() * 90000)}`;

  const refillRecord = {
    refillId,
    patientName,
    dob,
    phone,
    medication,
    dosage,
    pharmacyName,
    status: 'TRIAGE_DASHBOARD_LOGGED',
    receivedAt: new Date().toISOString()
  };

  refillRequestsStore.unshift(refillRecord);

  // High-visibility clinical dashboard console output
  console.log('\n==============================================================');
  console.log(`[HIGH SPRINGS PEDIATRICS] 💊 MEDICATION REFILL SUBMITTED (${refillId})`);
  console.log('==============================================================');
  console.log(`Patient Name:     ${patientName}`);
  console.log(`Date of Birth:    ${dob}`);
  console.log(`Contact Phone:    ${phone}`);
  console.log(`Medication:       ${medication}`);
  console.log(`Triage Status:    LOGGED TO CLINICAL STAFF DASHBOARD`);
  console.log(`Timestamp:        ${new Date().toLocaleString()}`);
  console.log('==============================================================\n');

  const result = {
    status: 'success',
    refillId,
    patientName,
    medication,
    message: `Refill request for ${medication} successfully logged and sent to the clinical staff's dashboard.`
  };

  return result;
}

const messagesStore = [];

/**
 * 4. take_general_message
 * Securely logs and routes general messages from callers to office staff
 */
function handleTakeGeneralMessage(args = {}) {
  const callerName = args.callerName || args.name || args.fullName || 'Caller';
  const phoneNumber = args.phoneNumber || args.phone || args.contactNumber || 'Not provided';
  const reasonForCall = args.reasonForCall || args.reason || args.subject || 'General Inquiry';
  const messageBody = args.messageBody || args.message || args.notes || 'No message content provided';

  const messageId = `MSG-${Math.floor(10000 + Math.random() * 90000)}`;

  const messageRecord = {
    messageId,
    callerName,
    phoneNumber,
    reasonForCall,
    messageBody,
    status: 'ROUTED_TO_OFFICE_STAFF',
    receivedAt: new Date().toISOString()
  };

  messagesStore.unshift(messageRecord);

  // High-visibility office staff dashboard console output
  console.log('\n==============================================================');
  console.log(`[HIGH SPRINGS PEDIATRICS] 📬 GENERAL OFFICE MESSAGE (${messageId})`);
  console.log('==============================================================');
  console.log(`Caller Name:      ${callerName}`);
  console.log(`Phone Number:     ${phoneNumber}`);
  console.log(`Reason for Call:  ${reasonForCall}`);
  console.log(`Message Body:     ${messageBody}`);
  console.log(`Status:           ROUTED TO OFFICE STAFF`);
  console.log(`Received At:      ${new Date().toLocaleString()}`);
  console.log('==============================================================\n');

  const result = {
    status: 'success',
    messageId,
    callerName,
    reasonForCall,
    message: `Message from ${callerName} regarding ${reasonForCall} has been securely logged and routed to the office staff.`
  };

  return result;
}

module.exports = {
  handleCheckAvailability,
  handleBookAppointment,
  handleRefillRequest,
  handleTakeGeneralMessage,
  appointmentsStore,
  refillRequestsStore,
  messagesStore
};
