/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A86D9',
        'primary-light': '#E1EDF8',
        background: '#EAF2FC',
        surface: '#FFFFFF',
        content: '#1A1F36',
        muted: '#8A94A6',
        hairline: '#E5EDF5',
        danger: '#FF6B8A',
        warning: '#FFB347',
        success: '#4BC8A0',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #4A86D9 0%, #6BA4E8 100%)',
      },
      // 앱 프레임 최대 너비. 확대 후 600px
      maxWidth: {
        app: '480px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(74, 134, 217, 0.08)',
        button: '0 4px 16px rgba(74, 134, 217, 0.35)',
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '24px',
      },
      fontFamily: {
        sans: ["'Pretendard Variable'", 'Pretendard', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
