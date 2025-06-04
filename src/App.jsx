import { createSignal, For, createEffect, onCleanup } from 'solid-js';
import { stockStore } from './stores/stockStore';
import { StockCard } from './components/StockCard';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { STOCK_GROUPS } from './config/stockGroups';

const App = () => {
  const [currentPackage, setCurrentPackage] = createSignal('magnificent7');
  
  createEffect(() => {
    const group = STOCK_GROUPS[currentPackage()];
    if (group) {
      stockStore.loadTickers(group.tickers);
      stockStore.connectWebSocket(group.tickers);
    }
  });
  
  onCleanup(() => {
    stockStore.disconnect();
  });
  
  const topMovers = () => {
    const group = STOCK_GROUPS[currentPackage()];
    if (!group) return [];
    
    return group.tickers
      .map(ticker => stockStore.getStockData(ticker))
      .filter(stock => stock.hasData)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);
  };
  
  return (
    <>
      <Header />
      <CategoryTabs 
        currentPackage={currentPackage} 
        setCurrentPackage={setCurrentPackage} 
      />

      <div class="main-container">
        <aside class="movers-sidebar">
          <h3>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
              <path d="M10 2L4 12H10L9 18L16 8H10L10 2Z" fill="#ff6b35" stroke="#ff6b35" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            Top Intraday Movers
          </h3>
          <div class="movers-list">
            {stockStore.loading() ? (
              <div class="movers-empty">Loading...</div>
            ) : topMovers().length === 0 ? (
              <div class="movers-empty">No data available</div>
            ) : (
              <For each={topMovers()}>
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
                    </div>
                    <span class={`mover-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </For>
            )}
          </div>
        </aside>

        <div class="charts-wrapper">
          <div class="stocks-list">
            <For each={(() => {
              const group = STOCK_GROUPS[currentPackage()];
              if (!group) return [];
              return group.tickers
                .map(ticker => stockStore.getStockData(ticker))
                .sort((a, b) => b.changePercent - a.changePercent)
                .map(stock => stock.ticker);
            })()}>
              {(ticker) => <StockCard ticker={ticker} />}
            </For>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;