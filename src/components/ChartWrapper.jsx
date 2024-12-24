import React from 'react';
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

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
    },
    y: {
      display: true,
      grid: {
        display: true,
      },
    },
  },
};

const ChartWrapper = ({ data, options = {} }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Line
        data={data}
        options={{
          ...defaultOptions,
          ...options,
          plugins: {
            ...defaultOptions.plugins,
            ...options.plugins,
            tooltip: {
              ...defaultOptions.plugins?.tooltip,
              ...options.plugins?.tooltip,
            },
          },
          scales: {
            ...defaultOptions.scales,
            ...options.scales,
          },
        }}
      />
    </div>
  );
};

export default ChartWrapper;