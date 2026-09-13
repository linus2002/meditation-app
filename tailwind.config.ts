import type { Config } from 'tailwindcss';

/**
 * Design tokens: a deep indigo/navy canvas, muted slate labels, and the
 * brand pair — blue #1D9FDA and green #61A644 — which took over from the
 * original pink and purple. Blue -> green is the action gradient; the
 * category deck keeps its lime-teal card beside blue and green ones.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
    },
    extend: {
      screens: {
        /* Above this width the app is not offered — see DeviceStage. */
        desktop: '1025px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /*
         * Literal palette sampled from the reference image, resolved through
         * the CSS variables in globals.css so light mode swaps all of it at
         * once. `<alpha-value>` keeps `bg-canvas/80` and friends working.
         */
        canvas: {
          DEFAULT: 'rgb(var(--canvas) / <alpha-value>)',
          deep: 'rgb(var(--canvas-deep) / <alpha-value>)',
          raised: 'rgb(var(--canvas-raised) / <alpha-value>)',
          slate: 'rgb(var(--canvas-slate) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        /* The raised card fill — was the literal #141733 throughout. */
        surface: 'rgb(var(--surface) / <alpha-value>)',
        /*
         * Hairlines and raised fills are tinted with this rather than with
         * white, so the same `/[0.06]` alpha lifts a dark surface and darkens
         * a light one.
         */
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        focus: 'rgb(var(--focus) / <alpha-value>)',
        aurora: {
          lime: '#E8F27A',
          mint: '#7DD69B',
          teal: '#23A392',
          deepteal: '#0B5E5E',
          /* Brand pair: pink became blue, purple became green. */
          blue: '#1D9FDA',
          green: '#61A644',
          blush: '#1D9FDA',
          orchid: '#1D9FDA',
          lilac: '#C9CCF3',
          periwinkle: '#8FA0EC',
          violet: '#61A644',
          indigo: '#61A644',
          pink: '#1D9FDA',
          cyan: '#2FE0CB',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: '1.5rem',
        tile: '1rem',
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        deck: '0 18px 40px -18px rgba(0,0,0,0.65)',
        pill: '0 12px 30px -10px rgba(63,162,143,0.5)',
        tile: '0 10px 30px -18px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'deck-activities':
          'linear-gradient(118deg,#E8F27A 0%,#B9E683 22%,#63CB9F 48%,#23A392 70%,#0B5E5E 100%)',
        'deck-happiness':
          'linear-gradient(102deg,#D2EDA2 0%,#BFE3F5 34%,#6EC3EA 58%,#1D9FDA 74%,#A9D9F2 100%)',
        'deck-relaxation':
          'linear-gradient(104deg,#EAF3E4 0%,#CBE3BE 40%,#95C77E 70%,#61A644 100%)',
        'action-pill': 'linear-gradient(90deg,#1D9FDA 0%,#61A644 100%)',
        'analytics-pill': 'linear-gradient(90deg,#1D9FDA 0%,#61A644 100%)',
        'nav-active': 'linear-gradient(135deg,#3FD9C9 0%,#7CA9E8 50%,#1D9FDA 100%)',
        'ring-active': 'linear-gradient(140deg,#61A644 0%,#1D9FDA 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(0.82)', opacity: '0.75' },
          '50%': { transform: 'scale(1)', opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(6%,-4%,0) scale(1.08)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        breathe: 'breathe 8s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'rise-in': 'rise-in 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
