import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff9d',
      dark: '#00cc7d',
      light: '#33ffb1',
    },
    secondary: {
      main: '#1a472a',
      dark: '#143620',
      light: '#2d5940',
    },
    background: {
      default: '#0a1f13',
      paper: 'rgba(26, 71, 42, 0.7)',
    },
    text: {
      primary: '#00ff9d',
      secondary: 'rgba(0, 255, 157, 0.7)',
    },
    success: {
      main: '#00ff9d',
    },
    error: {
      main: '#ff4444',
    }
  },
  typography: {
    fontFamily: '"Space Mono", "Roboto Mono", monospace',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      background: 'linear-gradient(90deg, #00ff9d 0%, #00cc7d 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: '0 0 20px rgba(0, 255, 157, 0.3)',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: '#00ff9d',
    },
    h6: {
      fontFamily: '"Space Mono", "Roboto Mono", monospace"',
      letterSpacing: '0.05em',
    },
    body1: {
      fontFamily: '"Space Mono", "Roboto Mono", monospace',
      letterSpacing: '0.03em',
    },
    body2: {
      fontFamily: '"Space Mono", "Roboto Mono", monospace',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(26, 71, 42, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 157, 0.1)',
          borderRadius: 16,
          maxWidth: '280px',
          margin: '0 auto',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 4px 15px rgba(0, 255, 157, 0.15)',
            border: '1px solid rgba(0, 255, 157, 0.3)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
  },
});

export default theme;