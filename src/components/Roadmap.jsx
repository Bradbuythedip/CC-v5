import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

const RoadmapItem = ({ title, items }) => (
  <Paper
    sx={{
      background: 'rgba(26, 71, 42, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 157, 0.1)',
      p: 3,
      height: '100%',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        border: '1px solid rgba(0, 255, 157, 0.2)',
        background: 'rgba(26, 71, 42, 0.85)',
      },
    }}
  >
    <Typography
      variant="h6"
      sx={{
        color: '#00ff9d',
        fontWeight: 'bold',
        mb: 2,
        fontSize: '1rem',
        letterSpacing: '0.1em',
      }}
    >
      {title}
    </Typography>
    {items.map((item, index) => (
      <Typography
        key={index}
        variant="body2"
        sx={{
          color: 'rgba(0, 255, 157, 0.7)',
          mb: 1,
          fontSize: '0.9rem',
          lineHeight: 1.6,
          '&:last-child': { mb: 0 },
        }}
      >
        • {item}
      </Typography>
    ))}
  </Paper>
);

const Roadmap = () => {
  const roadmapData = [
    {
      title: 'Q4 2024: NFT Launch',
      items: [
        'Release the genesis collection.',
        'Keep it simple; focus on security.',
      ],
    },
    {
      title: 'Q1 2025: Analytics Platform',
      items: [
        'Exclusively for NFT holders.',
        'Fetch live CoinGecko data from Pro API.',
      ],
    },
    {
      title: 'Late Q1 2025: Top-Gainer Races',
      items: [
        'Predict the 24-hour top gainer.',
        'Winners mint special NFTs.',
      ],
    },
    {
      title: 'Beyond',
      items: [
        'Evolve the game.',
        'Expand partnerships.',
        'Let the market guide further innovation.',
      ],
    },
  ];

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          textAlign: 'center',
          mb: 2,
          color: '#00ff9d',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Roadmap
      </Typography>
      <Grid container spacing={3}>
        {roadmapData.map((phase, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <RoadmapItem {...phase} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Roadmap;