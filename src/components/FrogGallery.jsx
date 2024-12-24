import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const getImageUrl = (frogId) => {
  // Try to get image from public assets
  try {
    return new URL(`/assets/images/${frogId}.png`, window.location.origin).href;
  } catch (error) {
    console.error('Error creating image URL:', error);
    return `/assets/images/${frogId}.png`;
  }
};

// Function to check if image exists
const checkImage = async (frogId) => {
  try {
    const response = await fetch(getImageUrl(frogId), { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image:', error);
    return false;
  }
};

// Generate an array of random numbers between 1 and 420
const FROGS_PER_ROW = 6;
const NUM_ROWS = 3;
const TOTAL_FROGS = FROGS_PER_ROW * NUM_ROWS;

const getRandomFrogs = () => {
  const frogs = new Set();
  while (frogs.size < TOTAL_FROGS) {
    frogs.add(Math.floor(Math.random() * 420) + 1);
  }
  return Array.from(frogs);
};

const FrogGallery = () => {
  const [displayedFrogs, setDisplayedFrogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageStatus, setImageStatus] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const frogs = getRandomFrogs();
        setDisplayedFrogs(frogs);
        
        const status = {};
        for (const frogId of frogs) {
          try {
            const exists = await checkImage(frogId);
            status[frogId] = {
              url: getImageUrl(frogId),
              exists
            };
          } catch (imageError) {
            console.error(`Error loading image for frog #${frogId}:`, imageError);
            status[frogId] = {
              url: getImageUrl(frogId),
              exists: false,
              error: imageError.message
            };
          }
        }
        setImageStatus(status);
      } catch (e) {
        console.error('Error in loadImages:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
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

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error" gutterBottom>
          Error loading gallery
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {error}
        </Typography>
      </Box>
    );
  }

  // For debugging purposes
  const debugInfo = {
    baseUrl: import.meta.env.BASE_URL,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    sampleImageUrl: `/assets/images/1.png`
  };

  console.log('Environment Debug Info:', debugInfo);

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
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
      {/* Debug information display */}
      {import.meta.env.DEV && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </Typography>
        </Box>
      )}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${FROGS_PER_ROW}, 1fr)`,
          gap: '16px',
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 16px'
        }}
      >
      {displayedFrogs.map((frogId) => {
        const status = imageStatus[frogId] || {};
        return (
          <Box
            key={frogId}
            sx={{
              aspectRatio: '1',
              width: '100%',
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
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={status.url}
                  alt={`Quai Frog #${frogId}`}
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Error loading image for frog #${frogId}:`, e);
                    e.target.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </Box>
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
                <Typography variant="caption" sx={{ fontSize: '8px', textAlign: 'center', px: 1 }}>
                  Image loading failed
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
      </Box>
    </Box>
  );
};

export default FrogGallery;