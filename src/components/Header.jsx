// components/Header.jsx
import { A } from '@solidjs/router';

export function Header() {
  return (
    <header class="header">
      <div class="header-container">
        <div class="header-content">
          <div class="logo-section">
            <A href="/" class="logo-link">
              <div class="logo-text">
                <h1>Breakout Charts</h1>
                <span class="logo-tagline">Real-Time Price Action</span>
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