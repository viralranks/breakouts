// services/dataService.js
class DataService {
  constructor() {
    // Detect if we're running locally or in production
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // In production, when served from the same domain, we can use relative URLs
    // This automatically uses the correct protocol and domain
    if (!isDevelopment) {
      // Use the current origin for production
      this.baseUrl = window.location.origin;
      // WebSocket URL uses wss:// for https:// origins
      this.wsUrl = window.location.origin.replace(/^http/, 'ws');
    } else {
      // Development URLs
      this.baseUrl = 'http://localhost:3001';
      this.wsUrl = 'ws://localhost:8081';
    }
    
    this.ws = null;
    this.reconnectTimeout = null;
    this.reconnectDelay = 5000; // 5 seconds
    this.maxReconnectAttempts = 5;
    this.reconnectAttempts = 0;
    this.subscribedSymbols = [];
    this.onUpdateCallback = null;
    
    // Log which environment we're using (helpful for debugging)
    console.log('DataService initialized:', {
      environment: isDevelopment ? 'development' : 'production',
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl,
      hostname: window.location.hostname,
      origin: window.location.origin
    });
  }

  async fetchDailyData(ticker) {
    try {
      const response = await fetch(`${this.baseUrl}/api/alpaca/${ticker}/daily`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching daily data:', error);
      throw error; // Re-throw to let the store handle it
    }
  }

  async fetchIntradayData(ticker) {
    try {
      const response = await fetch(`${this.baseUrl}/api/alpaca/${ticker}/intraday`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching intraday data:', error);
      throw error; // Re-throw to let the store handle it
    }
  }

  async fetchLatestPrice(ticker) {
    try {
      const response = await fetch(`${this.baseUrl}/api/alpaca/${ticker}/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching latest price:', error);
      return null;
    }
  }

  async fetchTickerData(ticker) {
    try {
      const [daily, intraday, latest] = await Promise.all([
        this.fetchDailyData(ticker),
        this.fetchIntradayData(ticker),
        this.fetchLatestPrice(ticker)
      ]);
      
      // If we got latest price, send it as an initial price update
      if (latest && this.onUpdateCallback) {
        this.onUpdateCallback({
          type: 'price_update',
          symbol: ticker,
          data: {
            price: latest.price,
            timestamp: latest.timestamp,
            source: 'rest'
          }
        });
      }
      
      return { daily, intraday };
    } catch (error) {
      // If any request fails, return what we can
      console.error('Error fetching ticker data:', error);
      throw error;
    }
  }

  connectWebSocket(symbols, onUpdate) {
    // Store the callback and symbols for reconnection
    this.onUpdateCallback = onUpdate;
    this.subscribedSymbols = symbols;
    
    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
    }
    
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this._connect();
  }

  _connect() {
    console.log('Connecting to WebSocket:', this.wsUrl);
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected, subscribing to:', this.subscribedSymbols);
        this.reconnectAttempts = 0; // Reset on successful connection
        
        if (this.subscribedSymbols.length > 0) {
          this.ws.send(JSON.stringify({ 
            type: 'subscribe', 
            symbols: this.subscribedSymbols 
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'bar':
            case 'trade':
            case 'quote':
            case 'price_update':
              // Pass all real-time updates to the callback
              if (this.onUpdateCallback) {
                this.onUpdateCallback(data);
              }
              break;
              
            case 'snapshot':
              // Handle snapshot data
              console.log('Received snapshot data');
              if (this.onUpdateCallback) {
                this.onUpdateCallback(data);
              }
              break;
              
            case 'subscribed':
              console.log('Successfully subscribed to symbols:', data.symbols);
              break;
              
            default:
              console.log('Unknown message type:', data.type, data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.ws = null;
        
        // Attempt to reconnect if not a manual disconnect
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }
    
    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this._connect();
    }, this.reconnectDelay);
  }

  updateSubscription(symbols) {
    this.subscribedSymbols = symbols;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Updating subscription to:', symbols);
      this.ws.send(JSON.stringify({ 
        type: 'subscribe', 
        symbols: symbols 
      }));
    }
  }

  disconnect() {
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close WebSocket
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.ws.close(1000, 'Manual disconnect'); // Normal closure
      this.ws = null;
    }
    
    // Reset state
    this.reconnectAttempts = 0;
    this.onUpdateCallback = null;
    this.subscribedSymbols = [];
  }

  // Get connection status
  getConnectionStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/test`);
      const data = await response.json();
      console.log('Connection test result:', data);
      return data;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();