import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Import all images
const IMAGES = {};
for (let i = 1; i <= 420; i++) {
  IMAGES[i] = `/assets/images/${i}.png`;
}

// Generate an array of random numbers between 1 and 420
const getRandomFrogs = (count) => {
  const frogs = new Set();
  while (frogs.size < count) {
    frogs.add(Math.floor(Math.random() * 420) + 1);
  }
  return Array.from(frogs);
};

const FrogGallery = () => {
  const [displayedFrogs, setDisplayedFrogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDisplayedFrogs(getRandomFrogs(24));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress sx={{ color: '#00ff9d' }} />
      </Box>
    );
  }

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
      {displayedFrogs.map((frogId) => {
        const imageUrl = IMAGES[frogId];
        return (
          <Box
            key={frogId}
            sx={{
              width: '100px',
              height: '100px',
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 157, 0.2)',
              transition: 'all 0.3s ease-in-out',
              position: 'relative',
              '&:hover': {
                transform: 'scale(1.05)',
                border: '1px solid rgba(0, 255, 157, 0.5)',
                boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)',
              },
            }}
          >
            <img
              src={imageUrl}
              alt={`Quai Frog #${frogId}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                console.error(`Failed to load image ${frogId}:`, e);
                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%231a472a%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2250%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%2300ff9d%22%3E%23${frogId}%3C%2Ftext%3E%3C%2Fsvg%3E';
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default FrogGallery;