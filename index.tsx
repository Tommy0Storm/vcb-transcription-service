import React from 'react';
import { createRoot } from 'react-dom/client';
import UltraPremiumApp from './ultra-premium-app.jsx';

const App = () => {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap');
          
          :root {
            --font-family-sans: 'Quicksand', sans-serif;

            /* VCB Cleaner Theme - Strict Monochrome Palette (§5.1) */
            --color-background: #F8F9FA;  /* Light Grey */
            --color-surface: #FFFFFF;      /* White */
            --color-on-surface: #000000;   /* Black */
            --color-on-surface-secondary: #6C757D;  /* Mid Grey */
            --color-border: #E9ECEF;       /* Light Grey */
            --color-primary: #212529;      /* Dark Grey (replaces blue) */
            --color-primary-hover: #000000; /* Black on hover */
            --color-on-primary: #FFFFFF;   /* White */
            --color-highlight: #E9ECEF;    /* Light Grey (replaces yellow) */
            --color-success: #212529;      /* Dark Grey (replaces green) */
            --color-danger: #000000;       /* Black (replaces red) */

            /* VCB Cleaner Theme - No Shadows (§5.1) */
            --shadow-sm: none;
            --shadow-md: none;
            --shadow-lg: none;

            --border-radius: 8px;
            --spacing-1: 4px;
            --spacing-2: 8px;
            --spacing-3: 12px;
            --spacing-4: 16px;
            --spacing-5: 24px;
            --spacing-6: 32px;
            --spacing-7: 48px;
            --spacing-8: 64px;
          }

          *, *::before, *::after {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background-color: var(--color-background);
            font-family: var(--font-family-sans);
            font-weight: 300;  /* VCB Cleaner Theme - Quicksand 300 for body (§5.2) */
            color: var(--color-on-surface);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* --- ANIMATIONS --- */
          @keyframes shimmer-progress {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          @keyframes now-playing-glow {
            0%, 100% { border-color: var(--color-primary); }
            50% { border-color: var(--color-on-surface); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes dash {
            0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
            50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
            100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          /* --- UTILITY & COMPONENT STYLES --- */
          .card {
            background-color: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            transition: border-color 0.2s ease-in-out;
          }
          .card:hover {
             border-color: var(--color-on-surface-secondary);
          }

          .section-title {
            font-weight: 500;
            font-size: 20px;
            margin: 0 0 var(--spacing-6) 0;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-bottom: 1px solid var(--color-border);
            padding-bottom: var(--spacing-4);
          }
          
          .button {
            font-weight: 500;
            font-size: 14px;
            border: none;
            padding: var(--spacing-3) var(--spacing-5);
            cursor: pointer;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            transition: all 0.2s ease-in-out;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-2);
          }
          .button-primary {
            color: var(--color-on-primary);
            background-color: var(--color-on-surface);
          }
          .button-primary:hover {
            background-color: #343a40;
          }
          .button-secondary {
            color: var(--color-on-surface-secondary);
            background-color: transparent;
            border: 1px solid var(--color-border);
          }
          .button-secondary:hover {
            background-color: var(--color-background);
            color: var(--color-on-surface);
          }

          .highlight-text {
            background-color: var(--color-highlight);
            transition: background-color 0.3s ease-in-out;
          }
          mark.search-highlight {
            background-color: #E9ECEF;  /* Light Grey */
            color: var(--color-on-surface);
            padding: 2px 0;
            border-radius: 4px;
            font-weight: 600;  /* Emphasize with weight instead of color */
          }

          .save-status-indicator {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: var(--spacing-3) var(--spacing-5);
            background-color: var(--color-on-surface);
            color: var(--color-on-primary);
            border-radius: 6px;
            border: 1px solid var(--color-border);
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            animation: fadeIn 0.3s ease-out;
          }

          /* --- MOBILE-FIRST RESPONSIVE DESIGN --- */
          @media (max-width: 768px) {
            body {
              font-size: 16px; /* Prevent zoom on input focus */
            }
            .section-title {
              font-size: 18px;
              margin-bottom: var(--spacing-4);
            }
            .button {
              padding: var(--spacing-4) var(--spacing-4);
              font-size: 13px;
              min-height: 44px; /* Touch-friendly minimum */
              letter-spacing: 0.5px;
            }
            .card {
              border-radius: 12px;
            }
            .save-status-indicator {
              bottom: 16px;
              left: var(--spacing-3);
              right: var(--spacing-3);
              transform: none;
              font-size: 13px;
              padding: var(--spacing-3) var(--spacing-4);
            }
          }

          @media (max-width: 480px) {
            .button {
              font-size: 12px;
              padding: var(--spacing-3) var(--spacing-4);
            }
          }

          /* --- TOUCH-FRIENDLY ENHANCEMENTS --- */
          @media (hover: none) and (pointer: coarse) {
            .button {
              min-height: 48px;
              padding: var(--spacing-4) var(--spacing-5);
            }
            input, select, textarea {
              font-size: 16px; /* Prevent iOS zoom */
            }
          }

          /* --- UTILITY CLASSES --- */
          .fade-in {
            animation: fadeIn 0.3s ease-out;
          }
          .slide-up {
            animation: slideUp 0.4s ease-out;
          }
          .scale-in {
            animation: scaleIn 0.3s ease-out;
          }
        `}
      </style>
      <UltraPremiumApp />
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
