import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Avatar,
} from '@mui/material';

const Trending = () => {
  const [loading, setLoading] = useState(true);
  const [trendingTokens, setTrendingTokens] = useState([]);
  const [error, setError] = useState(null);

  const fetchTrendingTokens = async () => {
    try {
      const response = await fetch('https://pro-api.coingecko.com/api/v3/search/trending', {
        headers: {
          'x-cg-pro-api-key': import.meta.env.VITE_COINGECKO_API_KEY
        }
      });
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch trending tokens: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data && data.coins && Array.isArray(data.coins)) {
        setTrendingTokens(data.coins);
      } else if (data && Array.isArray(data)) {
        setTrendingTokens(data);
      } else {
        throw new Error('Invalid response format');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trending tokens:', err);
      setError(err.message || 'Failed to load trending tokens');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTokens();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchTrendingTokens, 300000);
    return () => clearInterval(interval);
  }, []);

  const TokenCard = ({ token }) => {
    const coinData = token.item || token;
    
    return (
      <Card 
        sx={{ 
          height: '100%',
          backgroundColor: 'rgba(26, 71, 42, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 157, 0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 4px 20px rgba(0, 255, 157, 0.2)',
            border: '1px solid rgba(0, 255, 157, 0.3)',
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar 
              src={coinData.thumb || coinData.image || ''}
              alt={coinData.name || 'Token'}
              sx={{ width: 32, height: 32, mr: 1 }}
            />
            <Box>
              <Typography variant="h6" color="#00ff9d">
                {(coinData.symbol || '').toUpperCase()}
              </Typography>
              <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                {coinData.name || 'Unknown Token'}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" color="rgba(255, 255, 255, 0.9)" mb={1}>
            Market Cap Rank: #{coinData.market_cap_rank || 'N/A'}
          </Typography>
          <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
            {coinData.price_btc ? `Price (BTC): ${Number(coinData.price_btc).toFixed(8)}` : 'Price: N/A'}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
      >
        <CircularProgress sx={{ color: '#00ff9d' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Grid container spacing={3}>
        {trendingTokens.map((token, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <TokenCard token={token} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Trending;