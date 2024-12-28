import React from 'react';
import { ThemeProvider, CssBaseline, Container, Typography, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NFTMint from './components/NFTMint';
import Analytics from './components/Analytics';
import { SharedNavBar, NAVBAR_HEIGHT } from './components/SharedNavBar';
import Roadmap from './components/Roadmap';
import FrogGallery from './components/FrogGallery';
import Trending from './components/Trending';
import FearAndGreed from './components/FearAndGreed';
import theme from './theme';

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            position: 'relative',
            padding: '20px',
            marginTop: '64px'
          }}
        >
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
            <Route 
              path="/analytics" 
              element={
                <Box component="main">
                  <Container maxWidth="xl" sx={{ 
                    position: 'relative', 
                    mt: 0,
                    pt: '64px', // Height of navbar
                  }}>
                    <Analytics />
                  </Container>
                </Box>
              } 
            />
            <Route 
              path="/trending" 
              element={
                <Box component="main">
                  <Container maxWidth="xl" sx={{ 
                    position: 'relative', 
                    mt: 0,
                    pt: '64px',
                  }}>
                    <Trending />
                  </Container>
                </Box>
              } 
            />
            <Route 
              path="/fear-and-greed" 
              element={
                <Box 
                  component="main" 
                  sx={{ 
                    position: 'relative',
                    height: '100vh',
                    width: '100vw',
                    overflow: 'hidden'
                  }}
                >
                  <FearAndGreed />
                </Box>
              } 
            />
          </Routes>
        </Box>
      </ThemeProvider>
    </Router>
  );
}

export default App;