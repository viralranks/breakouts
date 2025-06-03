/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { lazy } from 'solid-js';
import './index.css';

// Layout component that wraps all pages
const Layout = (props) => {
  return (
    <div class="app">
      {props.children}
    </div>
  );
};

// Import components
const ChartsPage = lazy(() => import('./App'));
const About = lazy(() => import('./components/About'));

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => (
  <Router root={Layout}>
    <Route path="/" component={ChartsPage} />
    <Route path="/about" component={About} />
  </Router>
), root);