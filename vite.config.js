import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    // Optimize for production
    minify: 'terser',
    sourcemap: false,
    // Improve chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'd3': ['d3'],
          'solid': ['solid-js', '@solidjs/router'],
        }
      }
    }
  },
  // Ensure assets are served from the correct path
  base: '/',
});