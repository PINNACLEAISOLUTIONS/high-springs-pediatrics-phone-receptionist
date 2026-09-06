const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./src/middleware/authMiddleware');
const config = require('./src/config/config');
const vapiRoutes = require('./src/routes/vapiRoutes');
const { getCallCenterData, getSignedRecordingUrl } = require('./src/services/vapiCallsService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Authentication Middleware globally for sensitive routes
app.use(authMiddleware);

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

// 1b. Recording proxy — Vapi's stored recordingUrl is an unsigned R2 URL (HTTP 400).
// Resolve a fresh presigned URL per request and redirect the <audio> element to it.
app.get('/api/recording', async (req, res) => {
  const callId = req.query.callId;
  if (!callId) return res.status(400).json({ error: 'callId query param required' });
  try {
    const url = await getSignedRecordingUrl(callId);
    if (!url) return res.status(404).json({ error: 'No recording for this call' });
    res.redirect(302, url);
  } catch (error) {
    console.error('[Recording API Error]:', error.message);
    res.status(502).json({ error: 'Failed to resolve recording URL', message: error.message });
  }
});

// 2. Clinical Data Endpoints (persisted via Prisma)
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({ orderBy: { bookedAt: 'desc' } });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error('[Appointments API Error]:', error.message);
    res.status(500).json({ error: 'Failed to read appointments', message: error.message });
  }
});

app.get('/api/refills', async (req, res) => {
  try {
    const refills = await prisma.refillRequest.findMany({ orderBy: { receivedAt: 'desc' } });
    res.status(200).json({ refills });
  } catch (error) {
    console.error('[Refills API Error]:', error.message);
    res.status(500).json({ error: 'Failed to read refills', message: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await prisma.generalMessage.findMany({ orderBy: { receivedAt: 'desc' } });
    res.status(200).json({ messages });
  } catch (error) {
    console.error('[Messages API Error]:', error.message);
    res.status(500).json({ error: 'Failed to read messages', message: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    clinic: 'High Springs Pediatrics and Primary Care',
    physicians: ['Dr. Nasir Ahmed, M.D.', 'Dr. Ramin Ahmed, M.D.'],
    voicePersona: 'Riley (Cartesia Sonic-2)',
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
  console.log(`🤖 Voice AI Assistant:       Riley (Cartesia Sonic-2)`);
  console.log('================================================================\n');
});

process.on('SIGINT', () => process.exit(0));
