import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const getImageUrl = (frogId) => {
  return `/assets/images/${frogId}.png`;
};

// Function to check if image exists
const checkImage = async (frogId) => {
  return true; // Assume all images exist since we verified they're in the public folder
};

// Generate an array of random numbers between 1 and 420
// Fixed constants for grid layout
const FROGS_PER_ROW = Number(6);
const NUM_ROWS = Number(2);
const TOTAL_FROGS = Number(FROGS_PER_ROW * NUM_ROWS); // Should be 12
console.log('Initializing FrogGallery with:', {
  FROGS_PER_ROW,
  NUM_ROWS,
  TOTAL_FROGS
});

const getRandomFrogs = () => {
  console.log('Generating random frogs...');
  console.log('TOTAL_FROGS:', TOTAL_FROGS);
  console.log('FROGS_PER_ROW:', FROGS_PER_ROW);
  console.log('NUM_ROWS:', NUM_ROWS);
  
  const frogs = new Set();
  let attempts = 0;
  const maxAttempts = TOTAL_FROGS * 3; // Prevent infinite loops
  
  while (frogs.size < TOTAL_FROGS && attempts < maxAttempts) {
    frogs.add(Math.floor(Math.random() * 420) + 1);
    attempts++;
  }
  
  let result = Array.from(frogs);
  
  // Ensure we have exactly TOTAL_FROGS
  while (result.length < TOTAL_FROGS) {
    const newFrog = Math.floor(Math.random() * 420) + 1;
    if (!result.includes(newFrog)) {
      result.push(newFrog);
    }
  }
  
  // If we somehow got more, trim the excess
  if (result.length > TOTAL_FROGS) {
    result = result.slice(0, TOTAL_FROGS);
  }
  
  console.log('Final frog IDs:', result);
  console.log('Final count:', result.length);
  
  return result;
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
        console.log('Generated frogs:', frogs);
        console.log('Total frogs:', frogs.length);
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
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        gap={2}
      >
        <CircularProgress sx={{ color: '#00ff9d' }} />
        <Typography variant="body2" sx={{ color: '#00ff9d' }}>
          Loading Frogs...
        </Typography>
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
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: '#00ff9d' }}>
            Displaying {displayedFrogs.length} frogs
          </Typography>
        </Box>
      )}
      <Box 
        sx={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${FROGS_PER_ROW}, 1fr)`,
          gridTemplateRows: `repeat(${NUM_ROWS}, 1fr)`,
          gap: '16px',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px',
          '@media (max-width: 900px)': {
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
          },
          '@media (max-width: 600px)': {
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)',
            gap: '12px',
            padding: '12px',
          }
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
              transition: 'all 0.2s ease-in-out',
              position: 'relative',
              backgroundColor: 'rgba(26, 71, 42, 0.1)',
              cursor: 'pointer',
              height: { xs: '120px', sm: '150px', md: '180px' },
              '&:hover': {
                transform: 'scale(1.02)',
                border: '1px solid rgba(0, 255, 157, 0.4)',
                boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)',
                backgroundColor: 'rgba(26, 71, 42, 0.2)',
              },
            }}
          >
            <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={getImageUrl(frogId)}
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
                    backgroundColor: 'rgba(26, 71, 42, 0.1)',
                  }}
                />
              </Box>
          </Box>
        );
      })}
      </Box>
    </Box>
  );
};

export default FrogGallery;