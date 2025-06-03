// components/About.jsx
import { Header } from './Header';

export default function About() {
  return (
    <>
      <Header />
      <div class="about-page">
        <div class="about-container">
          {/* Hero Section */}
          <section class="about-hero">
            <h1>About Breakout Charts</h1>
            <p class="hero-subtitle">
              Professional-grade charting platform designed for traders who demand speed, precision, and real-time insights.
            </p>
          </section>
  
          {/* Mission Section */}
          <section class="about-section">
            <h2>Our Mission</h2>
            <p>
              We built Breakout Charts to solve a simple problem: traders need lightning-fast, 
              real-time data visualization that captures explosive market moves as they happen. 
              Whether you're a day trader catching intraday momentum or a swing trader identifying 
              the start of major moves, our platform delivers the insights you need to make 
              informed decisions.
            </p>
          </section>
  
          {/* Key Features Grid */}
          <section class="about-section">
            <h2>Why Traders Choose Breakout Charts</h2>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="12" width="4" height="9" fill="#00ff88" opacity="0.8"/>
                    <rect x="10" y="8" width="4" height="13" fill="#00ff88" opacity="0.9"/>
                    <rect x="17" y="3" width="4" height="18" fill="#00ff88"/>
                    <path d="M3 10L10 6L17 2" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
                  </svg>
                </div>
                <h3>Multiple Timeframe Analysis</h3>
                <p>
                  Our dual-chart system displays both daily and 5-minute intraday charts side by side. 
                  This unique view helps you understand the bigger picture while capturing micro-movements 
                  that often signal the beginning of larger trends.
                </p>
              </div>
  
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#00ff88" stroke="#00ff88" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h3>True Intraday Movers</h3>
                <p>
                  Unlike other platforms that show yesterday's closing changes, our Top Intraday Movers 
                  tracks real movement from today's market open (9:30 AM). This gives day traders the 
                  actual momentum data they need for intraday strategies.
                </p>
              </div>
  
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17L17 7" stroke="#00ff88" stroke-width="2" stroke-linecap="round"/>
                    <path d="M17 7V17H7" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="7" cy="17" r="2" fill="#00ff88" opacity="0.3"/>
                    <circle cx="12" cy="12" r="2" fill="#00ff88" opacity="0.5"/>
                    <circle cx="17" cy="7" r="2" fill="#00ff88"/>
                  </svg>
                </div>
                <h3>Breakout Detection</h3>
                <p>
                  Big swing moves often start with explosive intraday action. Our platform helps you 
                  spot these early breakouts, giving swing traders an edge in identifying potential 
                  multi-day runners before they fully develop.
                </p>
              </div>
  
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#00ff88" stroke-width="1.5"/>
                    <circle cx="12" cy="12" r="3" fill="#00ff88"/>
                    <path d="M12 3V9" stroke="#00ff88" stroke-width="1.5"/>
                    <path d="M12 15V21" stroke="#00ff88" stroke-width="1.5"/>
                    <path d="M3 12H9" stroke="#00ff88" stroke-width="1.5"/>
                    <path d="M15 12H21" stroke="#00ff88" stroke-width="1.5"/>
                  </svg>
                </div>
                <h3>Curated Categories</h3>
                <p>
                  We've organized stocks into focused groups: Tech Large Caps, Tech Small Caps, 
                  Biotech, and Momentum stocks. Each category is carefully selected to match different 
                  trading styles and risk profiles.
                </p>
              </div>
            </div>
          </section>
  
          {/* Technology Section */}
          <section class="about-section tech-section">
            <h2>Built for Speed</h2>
            <div class="tech-content">
              <div class="tech-visualization">
                <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background grid */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a1a" stroke-width="0.5"/>
                    </pattern>
                    <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style="stop-color:#00ff88;stop-opacity:0" />
                      <stop offset="50%" style="stop-color:#00ff88;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#00ff88;stop-opacity:0" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="300" fill="url(#grid)" />
                  
                  {/* Central hub */}
                  <circle cx="200" cy="150" r="40" fill="#0d0d0d" stroke="#00ff88" stroke-width="2">
                    <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="200" y="155" text-anchor="middle" fill="#00ff88" font-size="12" font-weight="bold">HUB</text>
                  
                  {/* Data flow lines */}
                  <g opacity="0.6">
                    {/* Left connections */}
                    <line x1="50" y1="50" x2="160" y2="130" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <line x1="50" y1="150" x2="160" y2="150" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="1.8s" repeatCount="indefinite" />
                    </line>
                    <line x1="50" y1="250" x2="160" y2="170" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="2s" repeatCount="indefinite" />
                    </line>
                    
                    {/* Right connections */}
                    <line x1="240" y1="130" x2="350" y2="50" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="1.4s" repeatCount="indefinite" />
                    </line>
                    <line x1="240" y1="150" x2="350" y2="150" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="1.6s" repeatCount="indefinite" />
                    </line>
                    <line x1="240" y1="170" x2="350" y2="250" stroke="url(#speedGradient)" stroke-width="2">
                      <animate attributeName="stroke-dasharray" values="0 200;200 0" dur="1.7s" repeatCount="indefinite" />
                    </line>
                  </g>
                  
                  {/* Client nodes */}
                  <g>
                    <circle cx="50" cy="50" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="50" cy="150" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="50" cy="250" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="350" cy="50" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="350" cy="150" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="350" cy="250" r="5" fill="#00ff88" opacity="0.8">
                      <animate attributeName="r" values="5;7;5" dur="1.7s" repeatCount="indefinite" />
                    </circle>
                  </g>
                  
                  {/* Labels */}
                  <text x="30" y="30" fill="#666" font-size="10">Traders</text>
                  <text x="320" y="30" fill="#666" font-size="10">Real-time</text>
                  <text x="200" y="280" text-anchor="middle" fill="#666" font-size="10">WebSocket Data Stream</text>
                </svg>
              </div>
              <div class="tech-description">
                <p>
                  In trading, milliseconds matter. That's why we built Breakout Charts using 
                  cutting-edge technology that delivers real-time data with zero lag.
                </p>
                <ul class="tech-list">
                  <li>
                    <strong>SolidJS Architecture:</strong> Ultra-fast reactive framework that updates 
                    only what changes, ensuring smooth real-time chart updates
                  </li>
                  <li>
                    <strong>WebSocket Streaming:</strong> Direct market data feeds deliver price 
                    updates instantly as they happen
                  </li>
                  <li>
                    <strong>D3.js Visualizations:</strong> Professional-grade charting with surgical 
                    DOM updates for flicker-free rendering
                  </li>
                  <li>
                    <strong>Centralized Data Hub:</strong> Efficient architecture that scales to 
                    thousands of concurrent users without compromising speed
                  </li>
                </ul>
              </div>
            </div>
          </section>
  
          {/* Coming Soon Section */}
          <section class="about-section">
            <h2>What's Next</h2>
            <div class="roadmap-items">
              <div class="roadmap-item">
                <h3>Custom Watchlists</h3>
                <p>Create and save your own groups of stocks to track your specific interests and strategies</p>
              </div>
              <div class="roadmap-item">
                <h3>Price Alerts</h3>
                <p>Get notified when stocks break key levels or show unusual volume patterns</p>
              </div>
              <div class="roadmap-item">
                <h3>Technical Indicators</h3>
                <p>Add moving averages, RSI, MACD, and other indicators to enhance your analysis</p>
              </div>
              <div class="roadmap-item">
                <h3>Mobile App</h3>
                <p>Take Breakout Charts with you - track markets on the go with our upcoming mobile apps</p>
              </div>
            </div>
          </section>
  
          {/* CTA Section */}
          <section class="about-cta">
            <h2>Start Trading Smarter</h2>
            <p>
              Join thousands of traders who rely on Breakout Charts for real-time market insights. 
              Currently free during our beta period - no credit card required.
            </p>
            <button class="cta-button" onClick={() => window.location.href = '/'}>
              View Live Charts
            </button>
          </section>
        </div>
      </div>
    </>
  );
}