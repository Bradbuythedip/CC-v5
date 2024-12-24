import React from 'react';
import { Box } from '@mui/material';

// Generate an array of random numbers between 1 and 420
const getRandomFrogs = (count) => {
  const frogs = new Set();
  while (frogs.size < count) {
    frogs.add(Math.floor(Math.random() * 420) + 1);
  }
  return Array.from(frogs);
};

const FrogGallery = () => {
  const displayedFrogs = getRandomFrogs(24); // Show 24 random frogs

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        maxWidth: '1200px',
        margin: '0 auto',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        mb: 0,
        mt: 0,
      }}
    >
      {displayedFrogs.map((frogId) => (
        <Box
          key={frogId}
          sx={{
            width: '100px',
            height: '100px',
            overflow: 'hidden',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 157, 0.2)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
              border: '1px solid rgba(0, 255, 157, 0.5)',
              boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)',
            },
          }}
        >
          <img
            src={`/assets/images/${frogId}.png`}
            alt={`Quai Frog #${frogId}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default FrogGallery;