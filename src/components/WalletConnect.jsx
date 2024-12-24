import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Link,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const WalletConnect = () => {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.pelagus !== 'undefined') {
        try {
          const accounts = await window.pelagus.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };

    checkConnection();
    
    // Listen for account changes
    if (typeof window.pelagus !== 'undefined') {
      window.pelagus.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window.pelagus !== 'undefined') {
        const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: '1rem', 
      right: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      {typeof window.pelagus === 'undefined' ? (
        <Link 
          href="https://pelagus.space/download" 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{
            textDecoration: 'none',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AccountBalanceWalletIcon />}
            sx={{
              background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
              color: '#0a1f13',
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
              },
            }}
          >
            Install Pelagus Wallet
          </Button>
        </Link>
      ) : account ? (
        <Typography
          sx={{
            background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
            padding: '8px 16px',
            borderRadius: '4px',
            color: '#0a1f13',
            fontWeight: 'bold',
            fontFamily: '"Space Mono", monospace',
          }}
        >
          {`${account.slice(0, 6)}...${account.slice(-4)}`}
        </Typography>
      ) : (
        <Button
          variant="contained"
          onClick={connectWallet}
          startIcon={<AccountBalanceWalletIcon />}
          sx={{
            background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
            color: '#0a1f13',
            fontWeight: 'bold',
            '&:hover': {
              background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
            },
          }}
        >
          Connect Wallet
        </Button>
      )}
    </Box>
  );
};

export default WalletConnect;