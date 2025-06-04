// components/StockCard.jsx
import { createMemo, Show } from 'solid-js';
import { stockStore } from '../stores/stockStore';
import { StockChart } from './StockChart';

export function StockCard(props) {
  // Use createMemo to ensure reactive updates
  const stock = createMemo(() => stockStore.getStockData(props.ticker));
  
  // Reactive getters for values that need to update in real-time
  const price = () => stock().price;
  const change = () => stock().change;
  const changePercent = () => stock().changePercent;
  const isPositive = () => stock().change >= 0;
  const hasData = () => stock().hasData;
  const isLive = () => stock().isLive;
  const liveSource = () => stock().liveSource;
  const lastUpdate = () => stock().lastUpdate;
  const bid = () => stock().bid;
  const ask = () => stock().ask;
  const error = () => stock().error;
  
  // Get current date
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  // Format helpers
  const formatPrice = (value) => {
    if (!value || isNaN(value)) return 'N/A';
    return value.toFixed(2);
  };
  
  const formatChange = (value) => {
    if (!value || isNaN(value)) return '0.00';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
  };
  
  const formatPercent = (value) => {
    if (!value || isNaN(value)) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Get live indicator color based on source
  const getLiveIndicatorClass = () => {
    const source = liveSource();
    switch(source) {
      case 'trade': return 'live-dot-trade';
      case 'quote': return 'live-dot-quote';
      case 'rest': return 'live-dot-rest';
      default: return 'live-dot';
    }
  };
  
  // Get live indicator text
  const getLiveText = () => {
    const source = liveSource();
    // Check if we're in development/paper mode
    const isPaper = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    switch(source) {
      case 'trade': return 'LIVE';
      case 'quote': return 'QUOTES';
      case 'rest': return isPaper ? 'IEX' : 'DELAYED';
      case 'cached': return 'CACHED';
      default: return 'LIVE';
    }
  };

  return (
    <div id={`stock-${props.ticker}`} class="chart-container visible">
      <Show when={error()}>
        <div class="error-banner">
          Error loading {props.ticker}: {error()}
        </div>
      </Show>
      
      <div class="chart-header">
        <div class="ticker-section">
          <div class="ticker">{props.ticker}</div>
          <div class="ticker-info">
            <span class="info-label">Today ({getCurrentDate()})</span>
            <span class="info-divider">|</span>
            <span class="info-item">
              Open {hasData() ? formatPrice(stock().open) : 'N/A'}
            </span>
            <span class="info-divider">|</span>
            <span class="info-item">
              Last {hasData() ? formatPrice(price()) : 'N/A'}
            </span>
            <Show when={bid() && ask()}>
              <span class="info-divider">|</span>
              <span class="info-item">
                Bid/Ask {formatPrice(bid())}/{formatPrice(ask())}
              </span>
            </Show>
            <span class="info-divider">|</span>
            <span class={`info-item ${isPositive() ? 'positive' : 'negative'}`}>
              Change {hasData() ? formatPercent(changePercent()) : 'N/A'}
            </span>
            {isLive() && (
              <>
                <span class="info-divider">|</span>
                <span class="info-item live-indicator">
                  <span class={`live-dot ${getLiveIndicatorClass()}`}></span>
                  {getLiveText()}
                </span>
              </>
            )}
          </div>
          <Show when={lastUpdate()}>
            <div class="update-time">
              Last update: {formatTime(lastUpdate())}
            </div>
          </Show>
        </div>
        
        <div class="price-section">
          <div class="price-current">
            {hasData() ? formatPrice(price()) : 'N/A'}
          </div>
          <div class={`price-change ${isPositive() ? 'positive' : 'negative'}`}>
            <span class="period-label">Intraday:</span>
            {hasData()
              ? `${formatChange(change())} (${formatPercent(changePercent())})`
              : 'N/A (N/A)'
            }
          </div>
        </div>
      </div>
      
      <div class="charts-row">
        <div class="chart-column">
          <h4>DAILY CHART</h4>
          <div class="chart-wrapper">
            {stock().chartData.daily.length > 0 ? (
              <StockChart
                data={stock().chartData.daily}
                type="daily"
                ticker={props.ticker}
                currentPrice={isLive() ? price() : null}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                color: '#666'
              }}>
                No daily data available
              </div>
            )}
          </div>
        </div>
        
        <div class="chart-column">
          <h4>INTRADAY (1MIN)</h4>
          <div class="chart-wrapper">
            {stock().chartData.intraday.length > 0 ? (
              <StockChart
                data={stock().chartData.intraday}
                type="intraday"
                ticker={props.ticker}
                currentPrice={isLive() ? price() : null}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                color: '#666'
              }}>
                {stockStore.isMarketOpen() 
                  ? 'Waiting for intraday data...' 
                  : 'Market closed - No intraday data'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .error-banner {
          background-color: #ff4444;
          color: white;
          padding: 8px 16px;
          margin-bottom: 10px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .update-time {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
        }
        
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
          animation: pulse 2s infinite;
        }
        
        .live-dot-trade {
          background-color: #00ff00;
          box-shadow: 0 0 4px #00ff00;
        }
        
        .live-dot-quote {
          background-color: #ffff00;
          box-shadow: 0 0 4px #ffff00;
        }
        
        .live-dot-rest {
          background-color: #ff8800;
          box-shadow: 0 0 4px #ff8800;
        }
        
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}