/**
 * Tailwind configuration generated from the "La librería" design system
 * (stitch_la_librer_a_slms/la_librer_a_design_system/DESIGN.md).
 *
 * The Material-3 style tonal token names are preserved so the Stitch HTML
 * mockups map onto these classes one-to-one.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Surfaces (tonal layers) ----------------------------------
        surface: '#faf8ff',
        'surface-dim': '#d9d9e5',
        'surface-bright': '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3fe',
        'surface-container': '#ededf9',
        'surface-container-high': '#e7e7f3',
        'surface-container-highest': '#e1e2ed',
        'surface-variant': '#e1e2ed',
        background: '#faf8ff',

        // ---- Content --------------------------------------------------
        'on-surface': '#191b23',
        'on-surface-variant': '#434655',
        'on-background': '#191b23',
        'inverse-surface': '#2e3039',
        'inverse-on-surface': '#f0f0fb',

        // ---- Outlines -------------------------------------------------
        outline: '#737686',
        'outline-variant': '#c3c6d7',

        // ---- Primary (academic blue) ----------------------------------
        primary: '#004ac6',
        'on-primary': '#ffffff',
        'primary-container': '#2563eb',
        'on-primary-container': '#eeefff',
        'inverse-primary': '#b4c5ff',
        'surface-tint': '#0053db',
        'primary-fixed': '#dbe1ff',
        'primary-fixed-dim': '#b4c5ff',
        'on-primary-fixed': '#00174b',
        'on-primary-fixed-variant': '#003ea8',

        // ---- Secondary ------------------------------------------------
        secondary: '#505f76',
        'on-secondary': '#ffffff',
        'secondary-container': '#d0e1fb',
        'on-secondary-container': '#54647a',
        'secondary-fixed': '#d3e4fe',
        'secondary-fixed-dim': '#b7c8e1',
        'on-secondary-fixed': '#0b1c30',
        'on-secondary-fixed-variant': '#38485d',

        // ---- Tertiary -------------------------------------------------
        tertiary: '#943700',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#bc4800',
        'on-tertiary-container': '#ffede6',
        'tertiary-fixed': '#ffdbcd',
        'tertiary-fixed-dim': '#ffb596',
        'on-tertiary-fixed': '#360f00',
        'on-tertiary-fixed-variant': '#7d2d00',

        // ---- Error ----------------------------------------------------
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        // ---- Semantic status (fixed vocabulary) -----------------------
        // Colour is never the sole carrier of meaning — every badge pairs
        // these with an icon and a text label.
        success: '#15803d',
        'success-container': '#dcfce7',
        'on-success-container': '#166534',
        warning: '#b45309',
        'warning-container': '#fef3c7',
        'on-warning-container': '#92400e',
        danger: '#b91c1c',
        'danger-container': '#fee2e2',
        'on-danger-container': '#991b1b',
        info: '#1d4ed8',
        'info-container': '#dbeafe',
        'on-info-container': '#1e40af',
        neutral: '#4b5563',
        'neutral-container': '#f3f4f6',
        'on-neutral-container': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        'data-mono': ['13px', { lineHeight: '16px', fontWeight: '500' }],
        // The scanner field must be readable from a seated distance.
        'scan-display': ['20px', { lineHeight: '28px', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        'container-max': '1440px',
        gutter: '1.5rem',
        'stack-sm': '0.5rem',
        'stack-md': '1rem',
        'stack-lg': '1.5rem',
        sidebar: '240px',
        topbar: '64px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.05)',
        dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
        modal: '0 20px 40px rgba(0, 0, 0, 0.15)',
      },
      keyframes: {
        scanline: {
          '0%': { top: '-100%' },
          '100%': { top: '100%' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scanline: 'scanline 3s infinite linear',
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
