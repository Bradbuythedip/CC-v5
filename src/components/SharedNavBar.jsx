import React from 'react';
import { Box, Button, AppBar, Toolbar, IconButton, Tooltip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { SvgIcon } from '@mui/material';

const NAVBAR_HEIGHT = 64;

// X (Twitter) Icon
const XIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </SvgIcon>
);

// Discord Icon
const DiscordIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
  </SvgIcon>
);

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
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(0, 255, 157, 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        position: 'relative',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          {/* Social Media Icons */}
          <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
            <Tooltip title="Follow us on X (Twitter)">
              <IconButton
                onClick={() => window.open('https://x.com/croakcityquai', '_blank')}
                size="small"
                sx={{
                  color: '#00ff9d',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                  },
                }}
              >
                <XIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Join our Discord">
              <IconButton
                onClick={() => window.open('https://dsc.gg/croakcity', '_blank')}
                size="small"
                sx={{
                  color: '#00ff9d',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                  },
                }}
              >
                <DiscordIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
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
            startIcon={<TrendingUpIcon />}
            onClick={() => navigate('/trending')}
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
            Trending
          </Button>
          <Button
            startIcon={<SentimentSatisfiedAltIcon />}
            onClick={() => navigate('/fear-and-greed')}
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
            Fear & Greed
          </Button>
        </Box>

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