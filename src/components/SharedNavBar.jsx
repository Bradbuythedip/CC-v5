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
        background: 'rgba(26, 71, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)', // For Safari
        borderBottom: '1px solid rgba(0, 255, 157, 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        position: 'relative', // Helps with stacking context in Firefox
      }}
    >
      <Toolbar 
        sx={{ 
          justifyContent: 'space-between',
          minHeight: NAVBAR_HEIGHT,
          padding: '0 16px',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          '@media (max-width: 600px)': {
            padding: '0 8px',
          },
        }}
      >
        <Button
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            color: '#00ff9d',
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: '4px',
            transition: 'all 0.2s ease-in-out',
            textTransform: 'none',
            minWidth: 'auto',
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
              padding: '6px 12px',
              borderRadius: '4px',
              transition: 'all 0.2s ease-in-out',
              textTransform: 'none',
              minWidth: 'auto',
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
            padding: '6px 16px',
            borderRadius: '4px',
            transition: 'all 0.3s ease-in-out',
            textTransform: 'none',
            boxShadow: '0 2px 4px rgba(0, 255, 157, 0.2)',
            '&:hover': {
              background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
              boxShadow: '0 4px 8px rgba(0, 255, 157, 0.3)',
              transform: 'translateY(-1px)',
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