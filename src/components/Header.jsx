// components/Header.jsx
import { A } from '@solidjs/router';

export function Header() {
  return (
    <header class="header">
      <div class="header-container">
        <div class="header-content">
          <div class="logo-section">
            <A href="/" class="logo-link">
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 32 32" 
                xmlns="http://www.w3.org/2000/svg"
                class="logo-icon"
              >
                <rect x="5" y="18" width="3" height="10" fill="#666" rx="0.5"/>
                <rect x="10" y="20" width="3" height="8" fill="#666" rx="0.5"/>
                <rect x="15" y="16" width="3" height="12" fill="#666" rx="0.5"/>
                <rect x="20" y="14" width="3" height="14" fill="#10b981" rx="0.5"/>
                <rect x="25" y="8" width="3" height="20" fill="#10b981" rx="0.5"/>
              </svg>
              <div class="logo-text">
                <h1>Breakout Charts</h1>
              </div>
            </A>
          </div>
          <nav class="header-nav">
            <A href="/about" class="nav-link">
              About
            </A>
          </nav>
        </div>
      </div>
    </header>
  );
}