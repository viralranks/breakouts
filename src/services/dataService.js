// services/dataService.js
class DataService {
  constructor() {
    // Detect if we're running locally or in production
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Set URLs based on environment
    this.baseUrl = isDevelopment 
      ? 'http://localhost:3001' 
      : 'https://breakouts-production.up.railway.app';
      
    this.wsUrl = isDevelopment 
      ? 'ws://localhost:8081' 
      : 'wss://breakouts-production.up.railway.app';
      
    this.ws = null;
    
    // Log which environment we're using (helpful for debugging)
    console.log('DataService initialized:', {
      environment: isDevelopment ? 'development' : 'production',
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl
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
      return [];
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
      return [];
    }
  }

  async fetchTickerData(ticker) {
    const [daily, intraday] = await Promise.all([
      this.fetchDailyData(ticker),
      this.fetchIntradayData(ticker)
    ]);
    return { daily, intraday };
  }

  connectWebSocket(symbols, onUpdate) {
    if (this.ws) {
      this.ws.close();
    }

    console.log('Connecting to WebSocket:', this.wsUrl);
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected, subscribing to:', symbols);
      this.ws.send(JSON.stringify({ type: 'subscribe', symbols }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'bar') {
        onUpdate(data);
      } else if (data.type === 'subscribed') {
        console.log('Successfully subscribed to symbols:', data.symbols);
      } else if (data.type === 'snapshot') {
        console.log('Received snapshot data:', data);
        // Handle snapshot data if needed
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Optional: implement reconnection logic here
    };
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.ws.close();
      this.ws = null;
    }
  }
}

export const dataService = new DataService();