import { createSignal, For, createEffect, onCleanup, onMount, Show } from 'solid-js';
import { stockStore } from './stores/stockStore';
import { topMoversStore } from './stores/topMoversStore';
import { StockCard } from './components/StockCard';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { STOCK_GROUPS } from './config/stockGroups';

const App = () => {
  const [currentPackage, setCurrentPackage] = createSignal('magnificent7');
  const [isScanning, setIsScanning] = createSignal(true);
  const [scanProgress, setScanProgress] = createSignal(0);
  
  // Initialize scanner for category
  const initializeScanner = async (categoryKey) => {
    const group = STOCK_GROUPS[categoryKey];
    if (!group) return;
    
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Initialize the scanner with ALL tickers in the category
      await topMoversStore.initializeAllTickers(group.tickers, (progress) => {
        setScanProgress(progress);
      });
      
      // Get initial top movers
      const topTickers = topMoversStore.getTopMovers();
      
      // Load full data only for top movers
      if (topTickers.length > 0) {
        await stockStore.loadTickers(topTickers);
        stockStore.connectWebSocket(topTickers);
      }
      
      setIsScanning(false);
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setIsScanning(false);
    }
  };
  
  // Watch for changes in top movers and update accordingly
  let updateTimeout;
  createEffect(() => {
    // This will re-run when topMoversStore data changes
    const currentTopTickers = topMoversStore.getTopMovers();
    const loadedTickers = Object.keys(stockStore.data() || {});
    
    // Check if top movers have changed
    const hasNewMovers = currentTopTickers.some(ticker => !loadedTickers.includes(ticker));
    
    if (hasNewMovers && !isScanning()) {
      // Debounce updates to avoid too frequent changes
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(async () => {
        console.log('Top movers changed, updating charts...');
        
        // Disconnect old WebSocket
        stockStore.disconnect();
        
        // Load new top movers
        await stockStore.loadTickers(currentTopTickers);
        stockStore.connectWebSocket(currentTopTickers);
      }, 2000); // Wait 2 seconds before updating to avoid flickering
    }
  });
  
  // Initialize on mount and category change
  createEffect(() => {
    const category = currentPackage();
    initializeScanner(category);
  });
  
  // Periodic rescan of all stocks (every 30 seconds)
  onMount(() => {
    const rescanInterval = setInterval(() => {
      if (!isScanning()) {
        console.log('Rescanning all stocks...');
        const group = STOCK_GROUPS[currentPackage()];
        if (group) {
          topMoversStore.rescanAllStocks(group.tickers);
        }
      }
    }, 30000);
    
    onCleanup(() => {
      clearInterval(rescanInterval);
      clearTimeout(updateTimeout);
      stockStore.disconnect();
    });
  });
  
  // Get top movers data with full stock info
  const topMoversWithData = () => {
    return topMoversStore.getTopMoversData().map(mover => ({
      ...mover,
      fullData: stockStore.getStockData(mover.ticker)
    }));
  };
  
  return (
    <>
      <Header />
      <CategoryTabs
        currentPackage={currentPackage}
        setCurrentPackage={setCurrentPackage}
      />
      
      <Show when={isScanning()}>
        <div class="scanner-overlay">
          <div class="scanner-content">
            <h2>Scanning {STOCK_GROUPS[currentPackage()]?.tickers.length || 0} stocks...</h2>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${scanProgress()}%` }}></div>
            </div>
            <p>{Math.round(scanProgress())}% complete</p>
          </div>
        </div>
      </Show>
      
      <div class="main-container">
        <aside class="movers-sidebar">
          <h3>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
              <path d="M10 2L4 12H10L9 18L16 8H10L10 2Z" fill="#ff6b35" stroke="#ff6b35" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            Top Intraday Movers
          </h3>
          
          <div class="scanner-stats">
            <div class="stat">
              <span class="stat-label">Tracking:</span>
              <span class="stat-value">{topMoversStore.getAllStocksCount()} stocks</span>
            </div>
            <div class="stat">
              <span class="stat-label">Last scan:</span>
              <span class="stat-value">{topMoversStore.getLastUpdateTime()}</span>
            </div>
          </div>
          
          <div class="movers-list">
            <Show 
              when={!topMoversStore.isInitializing()} 
              fallback={<div class="movers-empty">Scanning stocks...</div>}
            >
              <For each={topMoversStore.getTopMoversData()}>
                {(stock, index) => (
                  <div
                    class="mover-item"
                    onClick={() => {
                      const element = document.getElementById(`stock-${stock.ticker}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    <div class="mover-left">
                      <span class="mover-rank">{index() + 1}</span>
                      <span class="mover-ticker">{stock.ticker}</span>
                      <span class="mover-price">${stock.price.toFixed(2)}</span>
                    </div>
                    <div class="mover-right">
                      <span class={`mover-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                      <span class="mover-volume">{(stock.volume / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </aside>
        
        <div class="charts-wrapper">
          <Show when={!isScanning()} fallback={
            <div class="loading-charts">
              <p>Scanning stocks to find top movers...</p>
            </div>
          }>
            <div class="top-movers-header">
              <h2>Top 10 Movers - Live Charts</h2>
              <p class="update-notice">Charts update automatically as rankings change</p>
            </div>
            
            <div class="stocks-list">
              <For each={topMoversStore.getTopMovers()}>
                {(ticker) => (
                  <Show when={stockStore.data()[ticker]} fallback={<div>Loading {ticker}...</div>}>
                    <StockCard ticker={ticker} />
                  </Show>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
      
      <style jsx>{`
        .scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .scanner-content {
          background: #1a1a1a;
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        
        .scanner-content h2 {
          margin: 0 0 20px 0;
          color: #fff;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          margin: 20px 0;
        }
        
        .progress-fill {
          height: 100%;
          background: #4facfe;
          transition: width 0.3s ease;
        }
        
        .scanner-stats {
          padding: 12px;
          background: #0a0a0a;
          border-radius: 6px;
          margin: 12px 0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        
        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-label {
          color: #666;
        }
        
        .stat-value {
          color: #fff;
          font-weight: 500;
        }
        
        .mover-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #222;
        }
        
        .mover-item:hover {
          background: #1a1a1a;
        }
        
        .mover-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .mover-price {
          color: #999;
          font-size: 13px;
        }
        
        .mover-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        
        .mover-volume {
          color: #666;
          font-size: 11px;
        }
        
        .top-movers-header {
          padding: 20px 0;
          border-bottom: 1px solid #333;
          margin-bottom: 20px;
        }
        
        .top-movers-header h2 {
          margin: 0 0 8px 0;
        }
        
        .update-notice {
          color: #666;
          font-size: 14px;
          margin: 0;
        }
        
        .loading-charts {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #666;
        }
      `}</style>
    </>
  );
};

export default App;