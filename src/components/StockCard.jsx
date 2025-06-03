// components/StockCard.jsx
import { stockStore } from '../stores/stockStore';
import { StockChart } from './StockChart';

export function StockCard(props) {
  const stock = () => stockStore.getStockData(props.ticker);
  
  return (
    <div id={`stock-${props.ticker}`} class="chart-container visible">
      <div class="chart-header">
        <div class="ticker-section">
          <div class="ticker">{props.ticker}</div>
          <div class="ticker-info">
            <span class="info-label">Today (June 3, 2025)</span>
            <span class="info-divider">|</span>
            <span class="info-item">
              Open {stock().hasData ? stock().open.toFixed(2) : 'N/A'}
            </span>
            <span class="info-divider">|</span>
            <span class="info-item">
              Last {stock().hasData ? stock().price.toFixed(2) : 'N/A'}
            </span>
            <span class="info-divider">|</span>
            <span class={`info-item ${stock().change >= 0 ? 'positive' : 'negative'}`}>
              Change {stock().hasData ? `${stock().change >= 0 ? '+' : ''}${stock().changePercent.toFixed(2)}%` : 'N/A'}
            </span>
            {stock().isLive && (
              <>
                <span class="info-divider">|</span>
                <span class="info-item" style={{ color: '#00ff88' }}>● LIVE</span>
              </>
            )}
          </div>
        </div>
        <div class="price-section">
          <div class="price-current">
            {stock().hasData ? stock().price.toFixed(2) : 'N/A'}
          </div>
          <div class={`price-change ${stock().change >= 0 ? 'positive' : 'negative'}`}>
            <span class="period-label">Intraday:</span>
            {stock().hasData 
              ? `${stock().change >= 0 ? '+' : ''}${stock().change.toFixed(2)} (${stock().change >= 0 ? '+' : ''}${stock().changePercent.toFixed(2)}%)`
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
          <h4>INTRADAY (5MIN)</h4>
          <div class="chart-wrapper">
            {stock().chartData.intraday.length > 0 ? (
              <StockChart 
                data={stock().chartData.intraday} 
                type="intraday"
                ticker={props.ticker}
              />
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                'align-items': 'center', 
                'justify-content': 'center',
                color: '#666'
              }}>
                No intraday data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}