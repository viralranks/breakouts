import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Updated CORS configuration to fix the errors
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://breakoutcharts.com',        // Add this
      'https://www.breakoutcharts.com',    // Add this
      'https://breakouts.vercel.app',      // Your Vercel subdomain if you have one
    ];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Alpaca Configuration
const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const ALPACA_DATA_URL = 'https://data.alpaca.markets/v2';
const ALPACA_STREAM_URL = 'wss://stream.data.alpaca.markets/v2/iex';

// ========== DATA HUB ==========
class MarketDataHub {
  constructor() {
    this.alpacaWs = null;
    this.clients = new Set(); // Connected client websockets
    this.subscribedSymbols = new Set(); // Currently subscribed symbols
    this.latestBars = new Map(); // Cache latest bar for each symbol
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    this.initializeAlpacaConnection();
  }

  initializeAlpacaConnection() {
    console.log('Initializing Alpaca WebSocket connection...');
    
    this.alpacaWs = new WebSocket(ALPACA_STREAM_URL);
    
    this.alpacaWs.on('open', () => {
      console.log('Connected to Alpaca WebSocket');
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.alpacaWs.send(JSON.stringify({
        action: 'auth',
        key: ALPACA_API_KEY,
        secret: ALPACA_SECRET_KEY
      }));
    });

    this.alpacaWs.on('message', (data) => {
      const messages = JSON.parse(data);
      
      if (Array.isArray(messages)) {
        for (const message of messages) {
          this.handleAlpacaMessage(message);
        }
      }
    });

    this.alpacaWs.on('error', (error) => {
      console.error('Alpaca WebSocket error:', error);
    });

    this.alpacaWs.on('close', () => {
      console.log('Alpaca WebSocket closed');
      this.handleReconnect();
    });
  }

  handleAlpacaMessage(message) {
    if (message.msg === 'authenticated') {
      console.log('Authenticated with Alpaca');
      // Resubscribe to all symbols after authentication
      if (this.subscribedSymbols.size > 0) {
        this.subscribeToSymbols([...this.subscribedSymbols]);
      }
    } else if (message.T === 'b') { // Bar data
      // Cache the latest bar
      this.latestBars.set(message.S, {
        type: 'bar',
        symbol: message.S,
        data: {
          x: new Date(message.t),
          o: message.o,
          h: message.h,
          l: message.l,
          c: message.c,
          volume: message.v
        }
      });
      
      // Broadcast to all connected clients
      this.broadcast({
        type: 'bar',
        symbol: message.S,
        data: {
          x: new Date(message.t),
          o: message.o,
          h: message.h,
          l: message.l,
          c: message.c,
          volume: message.v
        }
      });
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.initializeAlpacaConnection();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Please check your connection.');
    }
  }

  subscribeToSymbols(symbols) {
    if (!this.alpacaWs || this.alpacaWs.readyState !== WebSocket.OPEN) {
      console.error('Alpaca WebSocket not connected');
      return;
    }

    // Update our subscribed symbols set
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    console.log(`Subscribing to symbols: ${symbols.join(', ')}`);
    
    this.alpacaWs.send(JSON.stringify({
      action: 'subscribe',
      bars: symbols
    }));
  }

  unsubscribeFromSymbols(symbols) {
    if (!this.alpacaWs || this.alpacaWs.readyState !== WebSocket.OPEN) {
      return;
    }

    // Remove from our subscribed symbols set
    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
    
    console.log(`Unsubscribing from symbols: ${symbols.join(', ')}`);
    
    this.alpacaWs.send(JSON.stringify({
      action: 'unsubscribe',
      bars: symbols
    }));
  }

  addClient(ws) {
    this.clients.add(ws);
    console.log(`Client connected. Total clients: ${this.clients.size}`);
    
    // Send latest bars for all subscribed symbols to the new client
    if (this.latestBars.size > 0) {
      ws.send(JSON.stringify({
        type: 'snapshot',
        data: Array.from(this.latestBars.values())
      }));
    }
  }

  removeClient(ws) {
    this.clients.delete(ws);
    console.log(`Client disconnected. Total clients: ${this.clients.size}`);
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    
    // Send to all connected clients
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  updateSubscriptions(clientSymbols) {
    // Collect all unique symbols from all clients
    const allSymbols = new Set();
    
    // In a production environment, you'd track which symbols each client needs
    // For now, we'll subscribe to all symbols any client requests
    clientSymbols.forEach(symbol => allSymbols.add(symbol));
    
    // Find symbols to subscribe and unsubscribe
    const toSubscribe = [...allSymbols].filter(s => !this.subscribedSymbols.has(s));
    const toUnsubscribe = [...this.subscribedSymbols].filter(s => !allSymbols.has(s));
    
    if (toSubscribe.length > 0) {
      this.subscribeToSymbols(toSubscribe);
    }
    
    if (toUnsubscribe.length > 0) {
      this.unsubscribeFromSymbols(toUnsubscribe);
    }
  }
}

// Create single instance of the data hub
const dataHub = new MarketDataHub();

// ========== HTTP ENDPOINTS ==========

// Get market open time (9:30 AM ET)
function getMarketOpen() {
  const now = new Date();
  
  // Get today's date in YYYY-MM-DD format
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Check if we're in DST (roughly March to November)
  const isDST = now.getMonth() >= 2 && now.getMonth() < 10;
  
  // Construct 9:30 AM ET as ISO string with proper offset
  // During EDT (summer): UTC-4, so 9:30 AM ET = 13:30 UTC
  // During EST (winter): UTC-5, so 9:30 AM ET = 14:30 UTC
  const marketOpenISO = `${year}-${month}-${day}T${isDST ? '13:30:00Z' : '14:30:00Z'}`;
  
  // Check if market is already open
  const marketOpenTime = new Date(marketOpenISO);
  
  // If current time is before market open or it's weekend, use previous day
  if (now < marketOpenTime || now.getDay() === 0 || now.getDay() === 6) {
    const prevDay = new Date(marketOpenTime);
    prevDay.setDate(prevDay.getDate() - 1);
    
    // Skip weekends
    while (prevDay.getDay() === 0 || prevDay.getDay() === 6) {
      prevDay.setDate(prevDay.getDate() - 1);
    }
    
    const prevYear = prevDay.getFullYear();
    const prevMonth = String(prevDay.getMonth() + 1).padStart(2, '0');
    const prevDayNum = String(prevDay.getDate()).padStart(2, '0');
    
    return `${prevYear}-${prevMonth}-${prevDayNum}T${isDST ? '13:30:00Z' : '14:30:00Z'}`;
  }
  
  return marketOpenISO;
}

// Daily bars endpoint
app.get('/api/alpaca/:symbol/daily', async (req, res) => {
  try {
    const { symbol } = req.params;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const url = `${ALPACA_DATA_URL}/stocks/${symbol}/bars?` + new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      timeframe: '1Day',
      limit: '1000',
      adjustment: 'raw',
      feed: 'iex'
    });

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const chartData = (data.bars || []).map(bar => ({
      x: new Date(bar.t),
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      volume: bar.v
    }));

    res.json({ data: chartData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Intraday bars endpoint
app.get('/api/alpaca/:symbol/intraday', async (req, res) => {
  try {
    const { symbol } = req.params;
    const startTime = getMarketOpen();
    const endTime = new Date().toISOString();
    
    console.log(`Fetching intraday data for ${symbol} from ${startTime} to ${endTime}`);
    
    const url = `${ALPACA_DATA_URL}/stocks/${symbol}/bars?` + new URLSearchParams({
      start: startTime,
      end: endTime,
      timeframe: '5Min',
      limit: '1000',
      adjustment: 'raw',
      feed: 'iex'
    });

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const chartData = (data.bars || []).map(bar => ({
      x: new Date(bar.t),
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      volume: bar.v
    }));

    res.json({ data: chartData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test Alpaca connection
app.get('/api/test', async (req, res) => {
  try {
    console.log('Testing Alpaca connection...');
    console.log('API Key exists:', !!ALPACA_API_KEY);
    console.log('Secret Key exists:', !!ALPACA_SECRET_KEY);
    
    const testUrl = `${ALPACA_DATA_URL}/stocks/AAPL/bars?` + new URLSearchParams({
      start: '2025-06-02T00:00:00Z',
      end: '2025-06-03T00:00:00Z',
      timeframe: '1Day',
      limit: '10',
      feed: 'iex'
    });

    const response = await fetch(testUrl, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY
      }
    });

    const responseText = await response.text();
    console.log('Alpaca response status:', response.status);
    console.log('Alpaca response:', responseText);

    res.json({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
      apiKeyExists: !!ALPACA_API_KEY,
      secretKeyExists: !!ALPACA_SECRET_KEY
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SERVER SETUP ==========
if (process.env.RAILWAY_ENVIRONMENT) {
  // Production on Railway: HTTP and WebSocket on same port
  const server = createServer(app);
  
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    // Add client to hub
    dataHub.addClient(ws);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'subscribe') {
          // Update hub subscriptions based on client request
          dataHub.updateSubscriptions(data.symbols);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'subscribed',
            symbols: data.symbols
          }));
        }
      } catch (error) {
        console.error('Error processing client message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from hub
      dataHub.removeClient(ws);
    });
    
    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error);
    });
  });
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with integrated WebSocket support`);
    console.log('Market Data Hub initialized with single Alpaca connection');
  });
} else {
  // Development: Separate ports for HTTP and WebSocket
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  const wss = new WebSocketServer({ port: 8081 });
  
  wss.on('connection', (ws) => {
    // Add client to hub
    dataHub.addClient(ws);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'subscribe') {
          // Update hub subscriptions based on client request
          dataHub.updateSubscriptions(data.symbols);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'subscribed',
            symbols: data.symbols
          }));
        }
      } catch (error) {
        console.error('Error processing client message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from hub
      dataHub.removeClient(ws);
    });
    
    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error);
    });
  });
  
  console.log(`WebSocket running on port 8081`);
  console.log('Market Data Hub initialized with single Alpaca connection');
}