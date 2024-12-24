import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';

const POW_COINS = [
  'bitcoin',
  'litecoin',
  'dogecoin',
  'monero',
  'zcash',
  'ravencoin',
  'ergo',
  'kadena',
  'nervos-network',
  'bitcoin-gold',
  'ethereum-classic',
  'firo',
  'flux',
  'vertcoin',
  'digibyte',
  'verge',
  'siacoin',
  'horizen',
  'beam',
  'grin'
];

const formatNumber = (num, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
  if (num === null || num === undefined) return 'N/A';
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    })}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    })}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    })}K`;
  }
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits
  })}`;
};

const renderPriceChange = (change) => {
  if (change === null || change === undefined) {
    return (
      <Box display="flex" alignItems="center">
        <RemoveIcon color="disabled" />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          N/A
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center">
      {change >= 0 ? (
        <TrendingUpIcon color="success" />
      ) : (
        <TrendingDownIcon color="error" />
      )}
      <Typography
        variant="body2"
        color={change >= 0 ? 'success' : 'error'}
        sx={{ ml: 1 }}
      >
        {change.toFixed(2)}%
      </Typography>
    </Box>
  );
};

const Analytics = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/coins/markets',
          {
            params: {
              vs_currency: 'usd',
              ids: POW_COINS.join(','),
              order: 'market_cap_desc',
              per_page: 20,
              page: 1,
              sparkline: false,
              price_change_percentage: '24h'
            },
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );

        if (response.data && Array.isArray(response.data)) {
          setData(response.data);
          setLastUpdate(new Date());
          setError(null);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 429) {
          setError('Rate limit exceeded. Please try again in a minute.');
        } else {
          setError('Failed to fetch market data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Update every 2 minutes to avoid rate limiting
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box 
      sx={{ 
        width: '100%',
        pb: 4
      }}
    >
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            textAlign: 'center',
            mb: 4,
            fontSize: '1.5rem',
            background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Proof of Work Analytics Dashboard
        </Typography>

        {/* Quai Network Placeholder */}
        <Card 
          sx={{ 
            mb: 4,
            background: 'rgba(26, 71, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 157, 0.1)',
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ff9d', fontSize: '1.1rem' }}>
              Quai Network
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(0, 255, 157, 0.7)', fontSize: '0.8rem' }}>
              Coming Soon - The Next Generation of Proof of Work
            </Typography>
          </CardContent>
        </Card>

        {/* Market Data Section */}
        <Typography 
          variant="h5" 
          sx={{ 
            mb: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
            color: '#00ff9d',
            fontSize: '1.1rem'
          }}
        >
          Top 20 PoW L1 Blockchains
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Card sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px'
          }}>
            <Typography color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The data will automatically refresh when available.
            </Typography>
          </Card>
        ) : (
          <>
            <Grid container spacing={3}>
              {data.map((coin) => (
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={coin.id}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'rgba(26, 71, 42, 0.75)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease-in-out',
                    border: '1px solid rgba(0, 255, 157, 0.1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0, 255, 157, 0.15)',
                      border: '1px solid rgba(0, 255, 157, 0.2)',
                      background: 'rgba(26, 71, 42, 0.85)',
                    },
                  }}>
                    <CardContent sx={{ height: '100%', p: 2 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '1px solid rgba(0, 255, 157, 0.3)',
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          <img
                            src={coin.image}
                            alt={coin.name}
                            style={{ width: 32, height: 32 }}
                          />
                        </Box>
                        <Box>
                          <Typography 
                            variant="h6"
                            sx={{ 
                              fontWeight: 'bold',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              fontSize: '0.9rem',
                              color: '#00ff9d'
                            }}
                          >
                            {coin.symbol.toUpperCase()}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(0, 255, 157, 0.7)',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {coin.name}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography 
                        variant="h5" 
                        gutterBottom 
                        sx={{ 
                          fontFamily: '"Space Mono", monospace',
                          letterSpacing: '0.02em',
                          fontWeight: 'bold',
                          color: '#00ff9d'
                        }}
                      >
                        {formatNumber(coin.current_price)}
                      </Typography>

                      <Box 
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 2,
                          background: coin.price_change_percentage_24h >= 0 
                            ? 'rgba(0, 255, 157, 0.1)' 
                            : 'rgba(255, 68, 68, 0.1)',
                          borderRadius: '40px',
                          p: 1,
                          width: 'fit-content'
                        }}
                      >
                        {renderPriceChange(coin.price_change_percentage_24h)}
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(0, 255, 157, 0.7)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.7rem',
                            }}
                          >
                            Market Cap
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontFamily: '"Space Mono", monospace',
                              letterSpacing: '0.02em',
                              color: '#00ff9d'
                            }}
                          >
                            {formatNumber(coin.market_cap)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(0, 255, 157, 0.7)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.7rem',
                            }}
                          >
                            24h Volume
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontFamily: '"Space Mono", monospace',
                              letterSpacing: '0.02em',
                              color: '#00ff9d'
                            }}
                          >
                            {formatNumber(coin.total_volume)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {lastUpdate && (
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ mt: 4, display: 'block' }}
              >
                Last updated: {lastUpdate.toLocaleTimeString()} • 
                Data updates every 30 seconds
              </Typography>
            )}
          </>
        )}
    </Box>
  );
};

export default Analytics;