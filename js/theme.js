// "Midnight Brass" palette. The app's markup was written with Tailwind's slate/amber/emerald/red/sky
// classes, so those ramps are remapped here: slate = midnight navy to ivory, amber = brass,
// emerald = sage (correct), red/rose = coral (wrong), sky = soft blue (left hand, listening).
tailwind.config = {
  theme: {
    extend: {
      colors: {
        slate: { 50: '#F7F4EE', 100: '#F2EDE3', 200: '#E2DCD0', 300: '#C8C2B6', 400: '#A3ACBC', 500: '#8590A4', 600: '#566176', 700: '#34405A', 800: '#222C42', 900: '#182133', 950: '#0F1522' },
        amber: { 50: '#FAF5EA', 100: '#F3E6CB', 200: '#E9D3A8', 300: '#DEBF87', 400: '#D3B077', 500: '#C9A46A', 600: '#A9884F', 700: '#846A3C', 800: '#5E4B2B', 900: '#3F321D', 950: '#241C10' },
        emerald: { 50: '#EEF8F2', 100: '#D6EFE0', 200: '#B5E2C8', 300: '#97D6B2', 400: '#7FC8A0', 500: '#63B487', 600: '#3B7F5A', 700: '#30684A', 800: '#26523B', 900: '#1D3B2B', 950: '#10221A' },
        red: { 50: '#FCEFEC', 100: '#F8D9D2', 200: '#F3C0B4', 300: '#F0B3A6', 400: '#E58B7A', 500: '#D9705E', 600: '#B4513F', 700: '#934133', 800: '#6E3126', 900: '#4A2019', 950: '#2E1410' },
        rose: { 300: '#F0B3A6', 400: '#E58B7A', 500: '#D9705E', 600: '#B4513F', 700: '#934133', 900: '#4A2019', 950: '#2E1410' },
        sky: { 300: '#A9C4E8', 400: '#7FA3D6', 500: '#5F86BD', 600: '#4A6EA3', 700: '#3B5885', 800: '#2C4265', 900: '#1E2D45' }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '-apple-system', 'system-ui', 'sans-serif'],
        heading: ['"IBM Plex Sans Thai"', '-apple-system', 'system-ui', 'sans-serif']
      }
    }
  }
};
