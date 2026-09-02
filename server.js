const express = require('express');
const cors = require('cors');
const config = require('./src/config/config');
const vapiRoutes = require('./src/routes/vapiRoutes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[HTTP ${req.method}] ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    client: 'High Springs Pediatrics',
    vapiAssistantId: config.vapiAssistantId,
    timestamp: new Date().toISOString()
  });
});

// Mount Webhook Routes
app.use('/api/vapi', vapiRoutes);
app.use('/api', vapiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found', url: req.originalUrl });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server using explicit HTTP Server
const http = require('http');
const server = http.createServer(app);
const PORT = config.port;

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  HIGH SPRINGS PEDIATRICS — VAPI.AI VOICE INTEGRATION SERVER    ');
  console.log('  Engineered by Pinnacle AI Solutions                           ');
  console.log('================================================================');
  console.log(`🚀 Server running on:       http://localhost:${PORT}`);
  console.log(`🔗 Vapi Webhook Endpoint:   http://localhost:${PORT}/api/vapi/webhook`);
  console.log(`🩺 Health Check:            http://localhost:${PORT}/api/health`);
  console.log(`🤖 Target Assistant ID:     ${config.vapiAssistantId}`);
  console.log('================================================================');
  console.log(`💡 For live Vapi voice calls: Run 'ngrok http ${PORT}'`);
  console.log('================================================================\n');
});

// Prevent immediate process exit
process.on('SIGINT', () => process.exit(0));
