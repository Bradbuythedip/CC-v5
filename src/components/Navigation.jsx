import React from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { quais } from 'quais';

const Navigation = () => {
  const navigate = useNavigate();

  const handleAnalyticsClick = () => {
    navigate('/analytics');
  };

  const handleConnectWallet = async () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) {
      alert("Please use Chrome browser to connect Pelagus wallet");
      return;
    }

    if (typeof window.pelagus !== 'undefined') {
      try {
        const provider = new quais.BrowserProvider(window.pelagus);
        await provider.send('eth_requestAccounts', []);
      } catch (err) {
        console.error("Error connecting wallet:", err);
      }
    } else {
      window.open('https://pelagus.space/download', '_blank');
    }
  };

  return (
    <Box sx={{ 
      position: 'absolute',
      top: 20,
      right: 20,
      display: 'flex',
      gap: 2
    }}>
      <Button
        variant="contained"
        onClick={handleAnalyticsClick}
        sx={{
          background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
          color: '#0a1f13',
          fontWeight: 'bold',
          '&:hover': {
            background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
          },
        }}
      >
        Analytics
      </Button>
      <Button
        variant="contained"
        onClick={handleConnectWallet}
        sx={{
          background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
          color: '#0a1f13',
          fontWeight: 'bold',
          '&:hover': {
            background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
          },
        }}
      >
        {typeof window.pelagus !== 'undefined' ? 'Connect Wallet' : 'Install Pelagus'}
      </Button>
    </Box>
  );
};

export default Navigation;