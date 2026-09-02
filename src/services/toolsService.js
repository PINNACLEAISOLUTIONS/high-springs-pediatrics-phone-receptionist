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
 * 3. refill_request
 * Logs patient medication refill request and routes to triage queue
 */
function handleRefillRequest(args = {}) {
  const patientName = args.patientName || args.childName || `${args.firstName || 'Patient'} ${args.lastName || ''}`.trim();
  const dob = args.dob || args.birthDate || 'Not specified';
  const medicationName = args.medicationName || args.medication || args.drug || 'Prescription Medication';
  const dosage = args.dosage || args.strength || 'As prescribed on file';
  const pharmacyName = args.pharmacyName || args.pharmacy || 'Preferred Pharmacy on file';
  const pharmacyPhone = args.pharmacyPhone || 'On file';
  const parentPhone = args.phone || args.parentPhone || 'Not provided';

  const refillId = `REF-${Math.floor(10000 + Math.random() * 90000)}`;

  const refillRecord = {
    refillId,
    patientName,
    dob,
    medicationName,
    dosage,
    pharmacyName,
    pharmacyPhone,
    parentPhone,
    status: 'TRIAGE_QUEUE_PENDING',
    receivedAt: new Date().toISOString()
  };

  refillRequestsStore.unshift(refillRecord);

  // High-visibility console log for clinical triage
  console.log('\n==============================================================');
  console.log(`[HIGH SPRINGS PEDIATRICS] 💊 NEW MEDICATION REFILL REQUEST (${refillId})`);
  console.log('==============================================================');
  console.log(`Patient Name:     ${patientName} (DOB: ${dob})`);
  console.log(`Medication:       ${medicationName} (${dosage})`);
  console.log(`Pharmacy:         ${pharmacyName} (${pharmacyPhone})`);
  console.log(`Parent Contact:   ${parentPhone}`);
  console.log(`Status:           Forwarded to Pediatric Triage Queue`);
  console.log(`Received At:      ${new Date().toLocaleString()}`);
  console.log('==============================================================\n');

  const result = {
    status: 'submitted',
    refillId,
    patientName,
    medicationName,
    message: `Thank you. I have submitted the refill request for ${medicationName} for ${patientName}. Our nursing and pediatric triage team will review it and send it to ${pharmacyName} within 24 to 48 business hours.`
  };

  return result;
}

module.exports = {
  handleCheckAvailability,
  handleBookAppointment,
  handleRefillRequest,
  appointmentsStore,
  refillRequestsStore
};
