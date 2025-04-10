/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A3C34", // Dark green
          light: "#f0f5f3",   // Light green for backgrounds
        },
        secondary: {
          DEFAULT: "#606060", // Medium gray for secondary text
        },
        text: {
          DEFAULT: "#333333", // Dark gray for primary text
        },
        error: "#FF5733",     // Red for errors
        success: "#1A3C34",   // Green for success states
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      spacing: {
        '4': '8px',    // Smallest spacing
        '8': '16px',   // Base spacing unit
        '12': '24px',  // Spacing between major sections
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-x': 'bounce-x 1s infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
        },
        'bounce-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(5px)' },
        }
      },
    },
  },
  plugins: [],
}

