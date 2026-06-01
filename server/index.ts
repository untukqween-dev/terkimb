import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import cors from 'cors';

// Import routes (adjust paths based on your actual structure)
// import { terminalRoutes } from './routes/terminal';
// import { codespacesRoutes } from './routes/codespaces';
// import { authMiddleware } from './middleware/auth';
// import { wsHandler } from './middleware/ws-handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// CORS - terima request dari frontend Vercel
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check - WAJIB ada untuk Railway/Render healthcheck
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'padterm-backend',
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'PadTerm Backend API',
    version: '0.1.0',
    endpoints: ['/health', '/api/terminal', '/api/codespaces']
  });
});

// API Routes - uncomment setelah kamu pindahin file routes
// app.use('/api/terminal', authMiddleware, terminalRoutes());
// app.use('/api/codespaces', authMiddleware, codespacesRoutes());

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server untuk terminal
// HATI-HATI: Railway/Render support WebSocket tapi bisa disconnect jika idle
// Pertimbangkan reconnect logic di frontend
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // TODO: Implement wsHandler logic here
    ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server - BIND ke 0.0.0.0 untuk Railway/Render
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\u2705 PadTerm Backend running on port ${PORT}`);
  console.log(`\u2705 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`\u2705 WebSocket ready at ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  wss.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

export default server;