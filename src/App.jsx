import React from 'react';
import { ThemeProvider, CssBaseline, Container, Typography, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NFTMint from './components/NFTMint';
import Analytics from './components/Analytics';
import { SharedNavBar, NAVBAR_HEIGHT } from './components/SharedNavBar';
import Roadmap from './components/Roadmap';
import FrogGallery from './components/FrogGallery';
import theme from './theme';

function App() {
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            position: 'relative',
            padding: '20px'
          }}
        >
          {!isChrome && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(255, 68, 68, 0.9)',
                color: 'white',
                textAlign: 'center',
                py: 1,
                zIndex: 1000,
                fontSize: '0.9rem'
              }}
            >
              Please use Chrome browser for the best experience and Pelagus wallet compatibility.
            </Box>
          )}
          <SharedNavBar />
          <Routes>
            <Route 
              path="/" 
              element={
                <Box component="main">
                  <Container maxWidth="xl" sx={{ 
                    position: 'relative', 
                    mt: 0,
                    pt: '64px', // Height of navbar
                  }}>
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}>
                      <Typography 
                        variant="h1" 
                        align="center" 
                        sx={{ 
                          textShadow: '0 0 20px rgba(0, 255, 157, 0.3)',
                          fontSize: '2.5rem',
                          mt: 1
                        }}
                      >
                        Croak City
                      </Typography>
                      <FrogGallery />
                      <Box 
                        sx={{ 
                          background: 'rgba(26, 71, 42, 0.7)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '16px',
                          border: '1px solid rgba(0, 255, 157, 0.1)',
                          p: 3,
                          maxWidth: '600px',
                          margin: '0 auto'
                        }}
                      >
                        <NFTMint />
                      </Box>
                      <Roadmap />
                    </Box>
                  </Container>
                </Box>
              } 
            />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Box>
      </ThemeProvider>
    </Router>
  );
}

export default App;