// config/stockGroups.js

// Your Google Sheet ID
const GOOGLE_SHEET_ID = '1AsKs4JO0Js0Vhhp433gwEyh5M-Ssa1XSgDLQY2haqX4';

// GIDs for each sheet tab
const SHEET_GIDS = {
  techLarge: '0',              // Tech Large Caps (first sheet)
  techSmall: '28772249',       // Tech Small Caps
  biotech: '1870652281',       // Biotech Stocks
  momentum: '1903963547'       // Momentum Stocks
};

// Static group metadata
const STOCK_GROUP_METADATA = {
  techLarge: {
    id: 'techLarge',
    name: 'Tech Large Caps',
    description: 'Large cap technology companies'
  },
  techSmall: {
    id: 'techSmall',
    name: 'Tech Small Caps',
    description: 'Small cap technology companies with growth potential'
  },
  biotech: {
    id: 'biotech',
    name: 'Biotech Stocks',
    description: 'Biotechnology and pharmaceutical companies'
  },
  momentum: {
    id: 'momentum',
    name: 'Momentum Stocks',
    description: 'High momentum stocks with breakout potential'
  }
};

// Cache for stock groups
let STOCK_GROUPS_CACHE = null;
let CACHE_TIMESTAMP = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Function to fetch CSV data from Google Sheets
async function fetchSheetAsCSV(gid) {
  try {
    // Public CSV export URL with CORS proxy
    const directUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${gid}`;
    
    // Try direct URL first, then fall back to CORS proxy if needed
    let url = directUrl;
    let response;
    
    try {
      response = await fetch(directUrl);
      if (!response.ok) throw new Error('Direct fetch failed');
    } catch (e) {
      // Use CORS proxy as fallback
      console.log(`Direct fetch failed for gid=${gid}, using CORS proxy`);
      url = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;
      response = await fetch(url);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Parse CSV - handle potential formatting issues
    const lines = csvText.split('\n');
    const tickers = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => line.match(/^[A-Z]+$/)) // Only valid ticker symbols
      .map(ticker => ticker.toUpperCase());
    
    console.log(`Loaded ${tickers.length} tickers from sheet gid=${gid}`);
    return tickers;
  } catch (error) {
    console.error(`Error fetching sheet gid=${gid}:`, error);
    return [];
  }
}

// Fallback data in case Google Sheets is unavailable
const FALLBACK_DATA = {
  techLarge: ['NVDA', 'AAPL', 'TSLA', 'META', 'GOOGL', 'MSFT'],
  techSmall: ['PLTR', 'NVTS', 'BBAI'],
  biotech: ['BIIB', 'ILMN', 'AMGN'],
  momentum: ['EYE', 'CRWV']
};

// Main function to load stock groups
export const loadStockGroups = async (forceRefresh = false) => {
  // Check cache first
  if (!forceRefresh && STOCK_GROUPS_CACHE && CACHE_TIMESTAMP) {
    const cacheAge = Date.now() - CACHE_TIMESTAMP;
    if (cacheAge < CACHE_DURATION) {
      console.log('Using cached stock groups');
      return STOCK_GROUPS_CACHE;
    }
  }
  
  console.log('Loading stock groups from Google Sheets...');
  
  try {
    // Fetch all sheets in parallel
    const fetchPromises = Object.entries(SHEET_GIDS).map(async ([groupId, gid]) => {
      const tickers = await fetchSheetAsCSV(gid);
      return { groupId, tickers };
    });
    
    const results = await Promise.all(fetchPromises);
    
    // Build the STOCK_GROUPS object
    const stockGroups = {};
    results.forEach(({ groupId, tickers }) => {
      stockGroups[groupId] = {
        ...STOCK_GROUP_METADATA[groupId],
        tickers: tickers.length > 0 ? tickers : FALLBACK_DATA[groupId]
      };
    });
    
    // Update cache
    STOCK_GROUPS_CACHE = stockGroups;
    CACHE_TIMESTAMP = Date.now();
    
    console.log('Stock groups loaded:', 
      Object.entries(stockGroups).map(([id, group]) => 
        `${group.name}: ${group.tickers.length} tickers`
      ).join(', ')
    );
    
    return stockGroups;
  } catch (error) {
    console.error('Error loading stock groups:', error);
    
    // Use fallback data
    const fallbackGroups = {};
    Object.entries(STOCK_GROUP_METADATA).forEach(([groupId, metadata]) => {
      fallbackGroups[groupId] = {
        ...metadata,
        tickers: FALLBACK_DATA[groupId] || []
      };
    });
    
    STOCK_GROUPS_CACHE = fallbackGroups;
    CACHE_TIMESTAMP = Date.now();
    
    return fallbackGroups;
  }
};

// Initialize on first import
let initPromise = null;

// Auto-load on import
export const initializeStockGroups = () => {
  if (!initPromise) {
    initPromise = loadStockGroups();
  }
  return initPromise;
};

// Helper function to get group by ID
export const getStockGroup = async (groupId) => {
  await initializeStockGroups();
  return STOCK_GROUPS_CACHE[groupId] || null;
};

// Helper function to get all group IDs
export const getGroupIds = () => {
  return Object.keys(STOCK_GROUP_METADATA);
};

// For backward compatibility - synchronous access
export const STOCK_GROUPS = new Proxy({}, {
  get: (target, prop) => {
    // Always return a valid structure
    const groups = STOCK_GROUPS_CACHE || {
      techLarge: {
        ...STOCK_GROUP_METADATA.techLarge,
        tickers: FALLBACK_DATA.techLarge || []
      },
      techSmall: {
        ...STOCK_GROUP_METADATA.techSmall,
        tickers: FALLBACK_DATA.techSmall || []
      },
      biotech: {
        ...STOCK_GROUP_METADATA.biotech,
        tickers: FALLBACK_DATA.biotech || []
      },
      momentum: {
        ...STOCK_GROUP_METADATA.momentum,
        tickers: FALLBACK_DATA.momentum || []
      }
    };
    
    return groups[prop];
  },
  
  // Support Object.keys, Object.entries, etc.
  ownKeys: () => {
    return Object.keys(STOCK_GROUP_METADATA);
  },
  
  getOwnPropertyDescriptor: (target, prop) => {
    if (STOCK_GROUP_METADATA[prop]) {
      return {
        enumerable: true,
        configurable: true
      };
    }
  }
});

// Auto-initialize when module loads
initializeStockGroups().catch(console.error);

// For debugging - expose to window object
if (typeof window !== 'undefined') {
  window.debugStockGroups = {
    loadStockGroups,
    getGroups: () => STOCK_GROUPS_CACHE,
    forceRefresh: () => loadStockGroups(true)
  };
}