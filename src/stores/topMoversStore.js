// stores/topMoversStore.js
import { createSignal, createEffect } from 'solid-js';

function createTopMoversStore() {
  // Track all stock prices and changes
  const [allStockData, setAllStockData] = createSignal(new Map());
  const [topMoversData, setTopMoversData] = createSignal([]);
  const [isInitializing, setIsInitializing] = createSignal(false);
  const [lastUpdate, setLastUpdate] = createSignal(new Date());
  
  // Configuration
  const TOP_MOVERS_COUNT = 10;
  
  // Get base URL based on environment
  const getBaseUrl = () => {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    return isDevelopment ? 'http://localhost:3001' : '';
  };
  
  // Update top movers whenever stock data changes
  createEffect(() => {
    const stockData = allStockData();
    console.log('Stock data changed, recalculating top movers...');
    
    const allStocks = Array.from(stockData.entries())
      .map(([ticker, data]) => ({
        ticker,
        price: data.price,
        open: data.open,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume || 0
      }))
      .filter(s => s.price > 0 && !isNaN(s.changePercent));
    
    // Only positive movers, sorted by actual changePercent descending
    const gainers = allStocks.filter(s => s.changePercent > 0);
    const sorted = gainers.sort((a, b) => b.changePercent - a.changePercent);
    const top10 = sorted.slice(0, TOP_MOVERS_COUNT);
    
    console.log('New top 10 movers:');
    top10.forEach((s, i) => {
      console.log(`${i + 1}. ${s.ticker}: ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}% (abs: ${Math.abs(s.changePercent).toFixed(2)})`);
    });
    
    setTopMoversData(top10);
  });
  
  // Get just the ticker symbols of top movers
  const getTopMovers = () => {
    return topMoversData().map(s => s.ticker);
  };
  
  // Get top movers with their data
  const getTopMoversData = () => {
    return topMoversData();
  };
  
  // Initialize with all tickers - fetch latest price and intraday open
  const initializeAllTickers = async (tickers, progressCallback) => {
    setIsInitializing(true);
    console.log(`Scanning ${tickers.length} stocks for top movers...`);
    
    const newData = new Map();
    const batchSize = 50;
    const baseUrl = getBaseUrl();
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const progress = Math.round((i / tickers.length) * 100);
      
      if (progressCallback) {
        progressCallback(progress);
      }
      
      // Fetch data for batch in parallel
      const promises = batch.map(async (ticker) => {
        try {
          // Get latest price
          const latestResponse = await fetch(`${baseUrl}/api/alpaca/${ticker}/latest`);
          if (!latestResponse.ok) return null;
          const latestData = await latestResponse.json();
          
          // Get intraday data to find 9:30 AM open
          const intradayResponse = await fetch(`${baseUrl}/api/alpaca/${ticker}/intraday`);
          if (!intradayResponse.ok) return null;
          
          const intradayResult = await intradayResponse.json();
          const intradayData = intradayResult.data || [];
          
          if (intradayData.length === 0) return null;
          
          // First bar's open is the 9:30 AM market open price
          const marketOpen = intradayData[0].o;
          const currentPrice = latestData.price;
          
          // Calculate intraday change
          const change = currentPrice - marketOpen;
          const changePercent = marketOpen !== 0 ? (change / marketOpen) * 100 : 0;
          
          return {
            ticker,
            price: currentPrice,
            open: marketOpen,
            change,
            changePercent,
            volume: latestData.size || 0,
            timestamp: new Date(latestData.timestamp)
          };
        } catch (error) {
          console.error(`Error scanning ${ticker}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      
      // Add successful results to the map
      results.forEach(result => {
        if (result) {
          newData.set(result.ticker, result);
        }
      });
      
      // Update state - this will trigger the effect to recalculate top movers
      setAllStockData(new Map(newData));
      
      // Small delay between batches
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setIsInitializing(false);
    setLastUpdate(new Date());
    
    if (progressCallback) {
      progressCallback(100);
    }
    
    console.log(`Scan complete. Found ${newData.size} stocks with data.`);
    return getTopMovers();
  };
  
  // Rescan all stocks (lighter weight update)
  const rescanAllStocks = async (tickers) => {
    console.log('Rescanning all stocks for updates...');
    const baseUrl = getBaseUrl();
    const batchSize = 100;
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      const promises = batch.map(async (ticker) => {
        try {
          const response = await fetch(`${baseUrl}/api/alpaca/${ticker}/latest`);
          if (!response.ok) return null;
          
          const data = await response.json();
          const existing = allStockData().get(ticker);
          
          if (existing && existing.open) {
            const change = data.price - existing.open;
            const changePercent = existing.open !== 0 ? (change / existing.open) * 100 : 0;
            
            return {
              ticker,
              price: data.price,
              open: existing.open,
              change,
              changePercent,
              volume: data.size || existing.volume || 0,
              timestamp: new Date(data.timestamp)
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      
      // Update state with new prices - this will trigger re-sorting
      setAllStockData(prev => {
        const newMap = new Map(prev);
        results.forEach(result => {
          if (result) {
            newMap.set(result.ticker, result);
          }
        });
        return newMap;
      });
    }
    
    setLastUpdate(new Date());
  };
  
  // Update a single stock's data (e.g., from WebSocket)
  const updateStockData = (ticker, newPrice) => {
    setAllStockData(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(ticker);
      
      if (existing) {
        const change = newPrice - existing.open;
        const changePercent = existing.open !== 0 ? (change / existing.open) * 100 : 0;
        
        newMap.set(ticker, {
          ...existing,
          price: newPrice,
          change,
          changePercent,
          timestamp: new Date()
        });
      }
      
      return newMap;
    });
  };
  
  // Utility methods
  const getAllStocksCount = () => allStockData().size;
  const getLastUpdateTime = () => lastUpdate().toLocaleTimeString();
  const isInTopMovers = (ticker) => getTopMovers().includes(ticker);
  
  return {
    // State
    isInitializing,
    lastUpdate,
    topMoversData,
    
    // Methods
    initializeAllTickers,
    rescanAllStocks,
    updateStockData,
    getTopMovers,
    getTopMoversData,
    getAllStocksCount,
    getLastUpdateTime,
    isInTopMovers
  };
}

export const topMoversStore = createTopMoversStore();