// config/stockGroups.js
export const STOCK_GROUPS = {
    techLarge: {
      id: 'techLarge',
      name: 'Tech Large Caps',
      description: 'Large cap technology companies',
      tickers: [
        'NVDA', 'AAPL', 'TSLA', 'META', 'GOOGL', 'MSFT', 'ROKU', 'AVGO', 
        'ORCL', 'CSCO', 'CRM', 'IBM', 'INTU', 'NOW', 'ACN', 'AMD', 
        'ADBE', 'UBER', 'TXN', 'QCOM', 'APP', 'AMAT', 'ADP', 'CRWD', 
        'ANET', 'MU', 'APH', 'ADI'
      ]
    },
    techSmall: {
      id: 'techSmall',
      name: 'Tech Small Caps',
      description: 'Small cap technology companies with growth potential',
      tickers: [
        'WRLD', 'HOV', 'PLTR', 'NVTS', 'BBAI', 'QUBT', 'APLD', 
        'WULF', 'CIFR', 'AAOI', 'LAES', 'KC', 'PLAB'
      ]
    },
    biotech: {
      id: 'biotech',
      name: 'Biotech Stocks',
      description: 'Biotechnology and pharmaceutical companies',
      tickers: [
        'BIIB', 'ILMN', 'AMGN', 'VRTX', 'REGN', 'GILD', 
        'EXEL', 'MLTX', 'ADMA', 'LQDA', 'HRMY'
      ]
    },
    momentum: {
      id: 'momentum',
      name: 'Momentum Stocks',
      description: 'High momentum stocks with breakout potential',
      tickers: [
        'EYE', 'CRWV', 'AEVA', 'ALMU'
      ]
    }
  };
  
  // Helper function to get group by ID
  export const getStockGroup = (groupId) => {
    return STOCK_GROUPS[groupId] || null;
  };
  
  // Helper function to get all group IDs
  export const getGroupIds = () => {
    return Object.keys(STOCK_GROUPS);
  };
  
  // Future: This function can be replaced to fetch from Cloud Storage
  export const loadStockGroups = async () => {
    // For now, return static data
    return STOCK_GROUPS;
    
    // Future implementation:
    // const response = await fetch('https://storage.googleapis.com/your-bucket/stock-groups.json');
    // return await response.json();
  };