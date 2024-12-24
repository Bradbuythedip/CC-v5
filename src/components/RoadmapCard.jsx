import React from 'react';
import {
  Box,
  Typography,
  Stack,
} from '@mui/material';

const RoadmapCard = () => {
  const roadmapItems = [
    {
      quarter: 'Q4 2024',
      title: 'NFT Launch',
      items: [
        'Release the genesis collection.',
        'Keep it simple; focus on security.',
      ],
      color: 'rgba(26, 71, 42, 0.95)'
    },
    {
      quarter: 'Q1 2025',
      title: 'Analytics Platform',
      items: [
        'Exclusively for NFT holders.',
        'Fetch live CoinGecko data.',
      ],
      color: 'rgba(26, 71, 42, 0.85)'
    },
    {
      quarter: 'Late Q1 2025',
      title: 'Top-Gainer Races',
      items: [
        'Predict the 24-hour top gainer.',
        'Winners mint special NFTs.',
      ],
      color: 'rgba(26, 71, 42, 0.75)'
    },
    {
      quarter: 'Beyond',
      title: 'Future Development',
      items: [
        'Evolve the game.',
        'Expand partnerships.',
        'Let the market guide further innovation.',
      ],
      color: 'rgba(26, 71, 42, 0.65)'
    }
  ];

  return (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h2" 
        sx={{ 
          fontSize: '2.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase',
          mb: 4,
          textAlign: 'center'
        }}
      >
        Roadmap
      </Typography>

      <Stack spacing={3}>
        {roadmapItems.map((item, index) => (
          <Box
            key={item.quarter}
            sx={{
              background: item.color,
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              p: 3,
              border: '1px solid rgba(0, 255, 157, 0.1)',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 255, 157, 0.15)',
              }
            }}
          >
            <Typography 
              variant="overline" 
              sx={{ 
                color: '#00ff9d',
                fontWeight: 'bold',
                letterSpacing: '0.1em'
              }}
            >
              {item.quarter}
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#00ff9d',
                mb: 2,
                fontWeight: 'bold'
              }}
            >
              {item.title}
            </Typography>
            <Stack spacing={1}>
              {item.items.map((listItem, i) => (
                <Typography 
                  key={i} 
                  variant="body1" 
                  sx={{ 
                    color: 'rgba(0, 255, 157, 0.8)',
                    fontFamily: '"Space Mono", monospace',
                  }}
                >
                  • {listItem}
                </Typography>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default RoadmapCard;