const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const config = require('./src/config/config');
const vapiRoutes = require('./src/routes/vapiRoutes');
const { getCallCenterData } = require('./src/services/vapiCallsService');
const {
  appointmentsStore,
  refillRequestsStore,
  messagesStore
} = require('./src/services/toolsService');

const app = express();
const server = http.createServer(app);

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  if (!req.url.match(/\.(css|js|png|jpg|svg|ico|wav|mp3)$/)) {
    console.log(`[HTTP ${req.method}] ${req.url} - ${new Date().toLocaleTimeString()}`);
  }
  next();
});

// Serve Dashboard Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 1. Live Calls API from Vapi
app.get('/api/calls', async (req, res) => {
  try {
    const data = await getCallCenterData();
    res.status(200).json(data);
  } catch (error) {
    console.error('[Calls API Error]:', error.message);
    res.status(500).json({ error: 'Failed to retrieve calls from Vapi', message: error.message });
  }
});

// 2. Clinical Data Endpoints
app.get('/api/appointments', (req, res) => {
  res.status(200).json({ appointments: appointmentsStore });
});

app.get('/api/refills', (req, res) => {
  res.status(200).json({ refills: refillRequestsStore });
});

app.get('/api/messages', (req, res) => {
  res.status(200).json({ messages: messagesStore });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    clinic: 'High Springs Pediatrics and Primary Care',
    physicians: ['Dr. Nasir Ahmed, M.D.', 'Dr. Ramin Ahmed, M.D.'],
    voicePersona: 'Emma (Vapi Native American V2)',
    vapiAssistantId: config.vapiAssistantId,
    timestamp: new Date().toISOString()
  });
});

// Mount Webhook Routes for Vapi
app.use('/api/vapi', vapiRoutes);
app.use('/api', vapiRoutes);

// Fallback to Dashboard SPA & 404 Handler
app.use((req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint Not Found', url: req.originalUrl });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = config.port || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  HIGH SPRINGS PEDIATRICS & PRIMARY CARE — CLINICAL BACKEND UI  ');
  console.log('  Dr. Nasir Ahmed, M.D. & Dr. Ramin Ahmed, M.D.                 ');
  console.log('  Engineered by Pinnacle AI Solutions                           ');
  console.log('================================================================');
  console.log(`🚀 Clinical Portal Running:  http://localhost:${PORT}`);
  console.log(`📞 Live Call Center API:     http://localhost:${PORT}/api/calls`);
  console.log(`🔗 Vapi Webhook Endpoint:    http://localhost:${PORT}/api/vapi/webhook`);
  console.log(`🤖 Voice AI Assistant:       Emma (Vapi Native American V2)`);
  console.log('================================================================\n');
});

process.on('SIGINT', () => process.exit(0));
