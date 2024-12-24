import React from 'react';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const NAVBAR_HEIGHT = 64; // This will help us coordinate spacing

const SharedNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnalyticsPage = location.pathname === '/analytics';

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        background: 'rgba(26, 71, 42, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 255, 157, 0.1)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Button
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            color: '#00ff9d',
            fontSize: '0.8rem',
            '&:hover': {
              backgroundColor: 'rgba(0, 255, 157, 0.1)',
            },
          }}
        >
          Home
        </Button>

        {!isAnalyticsPage && (
          <Button
            startIcon={<ShowChartIcon />}
            onClick={() => navigate('/analytics')}
            sx={{
              color: '#00ff9d',
              fontSize: '0.8rem',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 157, 0.1)',
              },
            }}
          >
            Analytics
          </Button>
        )}

        <Button
          variant="contained"
          onClick={() => {
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            if (!isChrome) {
              alert("Please use Chrome browser to connect Pelagus wallet");
              return;
            }
            if (typeof window.pelagus !== 'undefined') {
              window.pelagus.send('eth_requestAccounts');
            } else {
              window.open('https://pelagus.space/download', '_blank');
            }
          }}
          sx={{
            background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
            color: '#0a1f13',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            '&:hover': {
              background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
            },
          }}
        >
          {typeof window.pelagus !== 'undefined' ? 'Connect Wallet' : 'Install Pelagus'}
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export { SharedNavBar, NAVBAR_HEIGHT };