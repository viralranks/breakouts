// stores/stockStore.js
import { createSignal } from 'solid-js';
import { dataService } from '../services/dataService';

// Throttle utility function
const throttle = (func, delay) => {
  let lastCall = 0;
  let timeout;
  
  return (...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  };
};

function createStockStore() {
  const [data, setData] = createSignal({});
  const [loading, setLoading] = createSignal(false);
  const [realtimeUpdates, setRealtimeUpdates] = createSignal({});
  const [currentPrices, setCurrentPrices] = createSignal({});
  const [errors, setErrors] = createSignal({});

  const loadTickers = async (tickers) => {
    setLoading(true);
    const newData = {};
    const newErrors = {};
    
    for (const ticker of tickers) {
      try {
        newData[ticker] = await dataService.fetchTickerData(ticker);
        newErrors[ticker] = null; // Clear any previous error
      } catch (error) {
        console.error(`Error loading ${ticker}:`, error);
        newData[ticker] = { daily: [], intraday: [] };
        newErrors[ticker] = error.message || 'Failed to load data';
      }
    }
    
    setData(newData);
    setErrors(newErrors);
    setLoading(false);
  };

  // Update today's daily candle with real-time trades
  const updateDailyCandle = (symbol, price, size, timestamp) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    setData(prev => {
      const current = { ...prev };
      if (!current[symbol]) return current;
      
      const daily = [...(current[symbol].daily || [])];
      if (daily.length === 0) return current;
      
      const lastCandle = daily[daily.length - 1];
      const lastCandleDate = new Date(lastCandle.x);
      lastCandleDate.setHours(0, 0, 0, 0);
      
      // Check if the last candle is today's candle
      if (lastCandleDate.getTime() === today.getTime()) {
        // Update today's candle
        daily[daily.length - 1] = {
          ...lastCandle,
          h: Math.max(lastCandle.h, price),
          l: Math.min(lastCandle.l, price),
          c: price,
          volume: lastCandle.volume + size
        };
      } else if (timestamp.getTime() >= today.getTime()) {
        // Create today's candle if it doesn't exist
        daily.push({
          x: today,
          o: price,
          h: price,
          l: price,
          c: price,
          volume: size
        });
      }
      
      current[symbol] = {
        ...current[symbol],
        daily
      };
      
      return current;
    });
  };

  // Create throttled version of updateIntradayCandle
  const updateIntradayCandle = throttle((symbol, price, size, timestamp) => {
    // Round down to nearest minute
    const currentBar = new Date(Math.floor(timestamp.getTime() / (60 * 1000)) * (60 * 1000));
    
    setData(prev => {
      const current = { ...prev };
      if (!current[symbol]) return current;
      
      const intraday = [...(current[symbol].intraday || [])];
      if (intraday.length === 0) {
        // Create first candle
        intraday.push({
          x: currentBar,
          o: price,
          h: price,
          l: price,
          c: price,
          volume: size
        });
      } else {
        const lastCandle = intraday[intraday.length - 1];
        const lastCandleTime = new Date(lastCandle.x).getTime();
        
        if (lastCandleTime === currentBar.getTime()) {
          // Update current candle
          intraday[intraday.length - 1] = {
            ...lastCandle,
            h: Math.max(lastCandle.h, price),
            l: Math.min(lastCandle.l, price),
            c: price,
            volume: lastCandle.volume + size
          };
        } else if (currentBar.getTime() > lastCandleTime) {
          // Start a new candle
          intraday.push({
            x: currentBar,
            o: price,
            h: price,
            l: price,
            c: price,
            volume: size
          });
          
          // Keep only last 390 bars (1 trading day of 1-minute bars)
          if (intraday.length > 390) {
            intraday.shift();
          }
        }
      }
      
      current[symbol] = {
        ...current[symbol],
        intraday
      };
      
      return current;
    });
  }, 1000); // Throttle to once per second

  const connectWebSocket = (symbols) => {
    dataService.connectWebSocket(symbols, (update) => {
      // Handle different message types
      if (update.type === 'bar') {
        // Handle bar updates (now 1-minute bars instead of 5-minute)
        setRealtimeUpdates(prev => ({
          ...prev,
          [update.symbol]: update.data
        }));
        
        // Update intraday data with realtime bar
        setData(prev => {
          const current = { ...prev };
          if (current[update.symbol]) {
            const intraday = [...(current[update.symbol].intraday || [])];
            const lastBar = intraday[intraday.length - 1];
            
            if (lastBar) {
              const lastTime = new Date(lastBar.x);
              const updateTime = new Date(update.data.x);
              
              // Same 1-minute window?
              if (lastTime.getMinutes() === updateTime.getMinutes() && 
                  lastTime.getHours() === updateTime.getHours()) {
                intraday[intraday.length - 1] = update.data;
              } else {
                intraday.push(update.data);
                // Keep only last 390 bars (1 trading day of 1-minute bars)
                if (intraday.length > 390) {
                  intraday.shift();
                }
              }
              
              current[update.symbol] = {
                ...current[update.symbol],
                intraday
              };
            }
          }
          return current;
        });
      } else if (update.type === 'trade') {
        // Handle real-time trade updates
        const symbol = update.symbol;
        const price = update.data.price;
        const size = update.data.size;
        const timestamp = new Date(update.data.timestamp);
        
        // Update current price
        setCurrentPrices(prev => ({
          ...prev,
          [symbol]: {
            price,
            timestamp,
            size,
            source: 'trade'
          }
        }));
        
        // Update today's daily candle
        updateDailyCandle(symbol, price, size, timestamp);
        
        // Update current intraday candle (throttled)
        updateIntradayCandle(symbol, price, size, timestamp);
      } else if (update.type === 'quote') {
        // Handle quote updates (bid/ask)
        setCurrentPrices(prev => ({
          ...prev,
          [update.symbol]: {
            ...prev[update.symbol],
            bid: update.data.bidPrice,
            ask: update.data.askPrice,
            bidSize: update.data.bidSize,
            askSize: update.data.askSize,
            source: prev[update.symbol]?.source || 'quote'
          }
        }));
      } else if (update.type === 'price_update') {
        // Handle REST API price updates (fallback mechanism)
        const symbol = update.symbol;
        const price = update.data.price;
        const timestamp = new Date(update.data.timestamp);
        
        // Update current price
        setCurrentPrices(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            price,
            timestamp,
            source: update.data.source || 'rest'
          }
        }));
        
        // Update candles with REST price
        updateDailyCandle(symbol, price, 0, timestamp);
        updateIntradayCandle(symbol, price, 0, timestamp);
      } else if (update.type === 'snapshot') {
        // Handle initial snapshot data
        if (update.data && Array.isArray(update.data)) {
          update.data.forEach(item => {
            if (item.type === 'bar') {
              setRealtimeUpdates(prev => ({
                ...prev,
                [item.symbol]: item.data
              }));
            } else if (item.type === 'price_update') {
              setCurrentPrices(prev => ({
                ...prev,
                [item.symbol]: {
                  price: item.data.price,
                  timestamp: new Date(item.data.timestamp),
                  source: item.data.source || 'cached'
                }
              }));
            }
          });
        }
      }
    });
  };

  const getStockData = (ticker) => {
    const stockData = data()[ticker] || { daily: [], intraday: [] };
    const realtime = realtimeUpdates()[ticker];
    const currentPrice = currentPrices()[ticker];
    const error = errors()[ticker];
    
    // Calculate metrics
    const latestDaily = stockData.daily[stockData.daily.length - 1];
    const latestIntraday = stockData.intraday[stockData.intraday.length - 1];
    const latest = realtime || latestIntraday || latestDaily;
    
    if (!latest && !currentPrice) {
      return {
        ticker,
        price: 0,
        open: 0,
        change: 0,
        changePercent: 0,
        hasData: false,
        chartData: stockData,
        error
      };
    }
    
    // Use today's open price (from first intraday bar or daily open)
    const todayOpen = stockData.intraday.length > 0
      ? stockData.intraday[0].o // First intraday bar open price (9:30am)
      : latest?.o || 0; // Fallback to latest daily open
    
    // Use real-time price if available, otherwise use latest candle close
    const price = currentPrice?.price || latest?.c || 0;
    const change = price - todayOpen;
    const changePercent = todayOpen !== 0 ? (change / todayOpen) * 100 : 0;
    
    return {
      ticker,
      price,
      open: todayOpen,
      change,
      changePercent,
      hasData: true,
      isLive: !!currentPrice,
      liveSource: currentPrice?.source, // 'trade', 'quote', 'rest', or 'cached'
      lastUpdate: currentPrice?.timestamp || new Date(latest?.x),
      chartData: stockData,
      bid: currentPrice?.bid,
      ask: currentPrice?.ask,
      error
    };
  };

  // Utility function to check if market is open
  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay();
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Convert to ET
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes) ET
    return timeInMinutes >= 570 && timeInMinutes <= 960;
  };

  return {
    data,
    loading,
    realtimeUpdates,
    currentPrices,
    errors,
    loadTickers,
    connectWebSocket,
    getStockData,
    isMarketOpen,
    disconnect: () => dataService.disconnect()
  };
}

// IMPORTANT: This export must be here!
export const stockStore = createStockStore();