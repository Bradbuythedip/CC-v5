import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FearAndGreed = () => {
  const [loading, setLoading] = useState(true);
  const [fearGreedData, setFearGreedData] = useState(null);
  const [error, setError] = useState(null);

  const getColorForValue = (value) => {
    const numValue = parseInt(value);
    if (numValue <= 24) return '#FF3B30'; // Extreme Fear - Red
    if (numValue <= 44) return '#FF9500'; // Fear - Orange
    if (numValue <= 55) return '#FFCC00'; // Neutral - Yellow
    if (numValue <= 75) return '#34C759'; // Greed - Light Green
    return '#00FF9D'; // Extreme Greed - Bright Green
  };

  const getSentimentText = (value) => {
    const numValue = parseInt(value);
    if (numValue <= 24) return 'Extreme Fear';
    if (numValue <= 44) return 'Fear';
    if (numValue <= 55) return 'Neutral';
    if (numValue <= 75) return 'Greed';
    return 'Extreme Greed';
  };

  const fetchFearAndGreed = async () => {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=30');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Fear & Greed data');
      }
      
      const data = await response.json();
      setFearGreedData(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching fear and greed:', err);
      setError(err.message || 'Failed to load Fear & Greed index');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFearAndGreed();
    const interval = setInterval(fetchFearAndGreed, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress sx={{ color: '#00ff9d' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!fearGreedData || fearGreedData.length === 0) {
    return (
      <Typography color="error">No Fear & Greed data available</Typography>
    );
  }

  const currentValue = fearGreedData[0].value;
  const color = getColorForValue(currentValue);
  const sentiment = getSentimentText(currentValue);

  // Prepare chart data
  const chartData = {
    labels: fearGreedData.slice().reverse().map(day => 
      new Date(day.timestamp * 1000).toLocaleDateString()
    ),
    datasets: [{
      label: 'Fear & Greed Index',
      data: fearGreedData.slice().reverse().map(day => day.value),
      borderColor: '#00ff9d',
      backgroundColor: 'rgba(0, 255, 157, 0.15)',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxTicksLimit: 7,
        }
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          stepSize: 25,
          callback: (value) => {
            if (value === 0) return 'Extreme Fear';
            if (value === 25) return 'Fear';
            if (value === 50) return 'Neutral';
            if (value === 75) return 'Greed';
            if (value === 100) return 'Extreme Greed';
            return '';
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(26, 71, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#00ff9d',
        borderColor: 'rgba(0, 255, 157, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (tooltipItems) => {
            return new Date(fearGreedData[fearGreedData.length - 1 - tooltipItems[0].dataIndex].timestamp * 1000)
              .toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
          },
          label: (context) => {
            const value = context.raw;
            return [`Index: ${value}`, `Sentiment: ${getSentimentText(value)}`];
          },
        },
      },
    },
  };

  return (
    <Box 
      sx={{
        width: '100%',
        height: 'calc(100vh - 84px)',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        py: 2,
        mt: '64px'
      }}
    >
      <Card
        elevation={3}
        sx={{
          backgroundColor: 'rgba(26, 71, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${color}20`,
          borderRadius: 2,
          width: '100%',
          maxWidth: '1200px',
          height: '100%',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <CardContent sx={{ 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#ffffff', mb: 1 }}>
                Crypto Fear & Greed Index
              </Typography>
              <Typography variant="body1" sx={{ color: '#ffffff80' }}>
                Historical sentiment data for the last 30 days
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h1" sx={{ color, fontWeight: 'bold', fontSize: '3.5rem', lineHeight: 1 }}>
                {currentValue}
              </Typography>
              <Typography variant="h5" sx={{ 
                color, 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                fontWeight: 500,
                mt: 1
              }}>
                {sentiment}
              </Typography>
            </Box>
          </Box>
          
          {/* Index Scale */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#FF3B30' }}>Extreme Fear</Typography>
              <Typography sx={{ color: '#FF9500' }}>Fear</Typography>
              <Typography sx={{ color: '#FFCC00' }}>Neutral</Typography>
              <Typography sx={{ color: '#34C759' }}>Greed</Typography>
              <Typography sx={{ color: '#00FF9D' }}>Extreme Greed</Typography>
            </Box>
            <Box sx={{ position: 'relative', height: '8px', bgcolor: '#ffffff20', borderRadius: '4px' }}>
              <Box sx={{
                position: 'absolute',
                width: '8px',
                height: '16px',
                backgroundColor: color,
                borderRadius: '4px',
                top: '-4px',
                left: `${currentValue}%`,
                transform: 'translateX(-50%)',
                transition: 'all 0.3s ease'
              }} />
              <Box sx={{
                height: '100%',
                background: 'linear-gradient(to right, #FF3B30, #FF9500, #FFCC00, #34C759, #00FF9D)',
                borderRadius: '4px',
                opacity: 0.3
              }} />
            </Box>
          </Box>

          {/* Historical Chart */}
          <Box sx={{ 
            flex: 1,
            minHeight: '300px',
            mt: 2,
            position: 'relative',
            width: '100%'
          }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FearAndGreed;