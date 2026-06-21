import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        phos: {
          green:  '#39ff6e',
          cyan:   '#27e8ff',
          amber:  '#ffc234',
          red:    '#ff3b4e',
          white:  '#eaffe9',
          dim:    'rgba(57,255,110,0.35)',
          bg:     '#020403',
        },
      },
      fontFamily: {
        mono: ['"Courier New"', 'ui-monospace', 'monospace'],
        block: ['Anton', '"Arial Black"', 'Impact', 'sans-serif'],
      },
      boxShadow: {
        glow:       '0 0 12px currentColor',
        'glow-lg':  '0 0 24px currentColor',
      },
    },
  },
  plugins: [],
}
export default config
