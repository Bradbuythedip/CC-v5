import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Function to check if image exists
const checkImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

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
  const [imageStatus, setImageStatus] = useState({});

  useEffect(() => {
    const loadImages = async () => {
      const frogs = getRandomFrogs(24);
      setDisplayedFrogs(frogs);
      
      // Check each image
      const status = {};
      for (const frogId of frogs) {
        // Use import.meta.env.BASE_URL to ensure correct path resolution
        const url = `${import.meta.env.BASE_URL}assets/images/${frogId}.png`;
        status[frogId] = {
          url,
          exists: await checkImage(url)
        };
      }
      setImageStatus(status);
      setLoading(false);
    };

    loadImages();
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
        const status = imageStatus[frogId] || {};
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
            {status.exists ? (
              <img
                src={status.url}
                alt={`Quai Frog #${frogId}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a472a',
                  color: '#00ff9d',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '10px' }}>
                  #{frogId}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '8px' }}>
                  {status.url}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default FrogGallery;