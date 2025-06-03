// services/dataService.js
class DataService {
    constructor() {
      this.baseUrl = 'http://localhost:3001';
      this.wsUrl = 'ws://localhost:8081';
      this.ws = null;
    }
  
    async fetchDailyData(ticker) {
      const response = await fetch(`${this.baseUrl}/api/alpaca/${ticker}/daily`);
      const result = await response.json();
      return result.data || [];
    }
  
    async fetchIntradayData(ticker) {
      const response = await fetch(`${this.baseUrl}/api/alpaca/${ticker}/intraday`);
      const result = await response.json();
      return result.data || [];
    }
  
    async fetchTickerData(ticker) {
      const [daily, intraday] = await Promise.all([
        this.fetchDailyData(ticker),
        this.fetchIntradayData(ticker)
      ]);
      return { daily, intraday };
    }
  
    connectWebSocket(symbols, onUpdate) {
      if (this.ws) this.ws.close();
      
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbols }));
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'bar') onUpdate(data);
      };
    }
  
    disconnect() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }
  
  export const dataService = new DataService();