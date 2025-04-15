import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './', // Set base path for GitHub Pages
  build: {
    // Improve build performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', '@hookform/resolvers'],
          i18n: ['i18next', 'react-i18next'],
          utils: ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
          state: ['zustand', '@tanstack/react-query'],
          ui: ['framer-motion', '@tanstack/react-table', '@tanstack/react-virtual'],
        },
        // Add cache optimization
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name?.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            extType = 'img';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType || '')) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Generate source maps for production
    sourcemap: true,
  },
  server: {
    // Improve dev server performance
    hmr: {
      overlay: false,
    },
  },
  // Add security headers
  preview: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://yvwhtdnuevvehjqnqcnv.supabase.co wss://yvwhtdnuevvehjqnqcnv.supabase.co https://api.openai.com https://api.elevenlabs.io; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
    }
  }
});