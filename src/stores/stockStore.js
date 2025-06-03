// stores/stockStore.js
import { createSignal } from 'solid-js';
import { dataService } from '../services/dataService';

function createStockStore() {
  const [data, setData] = createSignal({});
  const [loading, setLoading] = createSignal(false);
  const [realtimeUpdates, setRealtimeUpdates] = createSignal({});
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

  const connectWebSocket = (symbols) => {
    dataService.connectWebSocket(symbols, (update) => {
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
            
            // Same 5-minute window?
            if (Math.floor(lastTime.getMinutes() / 5) === Math.floor(updateTime.getMinutes() / 5)) {
              intraday[intraday.length - 1] = update.data;
            } else {
              intraday.push(update.data);
            }
            
            current[update.symbol] = {
              ...current[update.symbol],
              intraday
            };
          }
        }
        return current;
      });
    });
  };

  const getStockData = (ticker) => {
    const stockData = data()[ticker] || { daily: [], intraday: [] };
    const realtime = realtimeUpdates()[ticker];
    const error = errors()[ticker];
    
    // Calculate metrics
    const latestDaily = stockData.daily[stockData.daily.length - 1];
    const latestIntraday = stockData.intraday[stockData.intraday.length - 1];
    const latest = realtime || latestIntraday || latestDaily;
    
    if (!latest) {
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
      ? stockData.intraday[0].o  // First intraday bar open price (9:30am)
      : latest.o;  // Fallback to latest daily open
      
    const price = latest.c;
    const change = price - todayOpen;
    const changePercent = (change / todayOpen) * 100;
    
    return {
      ticker,
      price,
      open: todayOpen,
      change,
      changePercent,
      hasData: true,
      isLive: !!realtime,
      chartData: stockData,
      error
    };
  };

  return {
    data,
    loading,
    realtimeUpdates,
    errors,
    loadTickers,
    connectWebSocket,
    getStockData,
    disconnect: () => dataService.disconnect()
  };
}

export const stockStore = createStockStore();