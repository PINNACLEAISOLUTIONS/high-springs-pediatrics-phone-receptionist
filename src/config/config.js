require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  vapiApiKey: process.env.VAPI_API_KEY || '',
  vapiAssistantId: process.env.VAPI_ASSISTANT_ID || '10152953-a211-4737-a005-1705cda37b62',
  clinicName: process.env.CLINIC_NAME || 'High Springs Pediatrics',
  timezone: process.env.TIMEZONE || 'America/New_York'
};
