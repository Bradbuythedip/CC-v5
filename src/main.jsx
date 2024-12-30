import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import App from './App';

// Extend Chakra theme with custom colors
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#0a1f13',
        color: 'white',
      },
    },
  },
  colors: {
    brand: {
      primary: '#00ff9d',
      secondary: '#1a472a',
    },
  },
});

// Add global styles
const style = document.createElement('style');
style.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #0a1f13;
  }

  ::-webkit-scrollbar {
    width: 10px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(26, 71, 42, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 157, 0.3);
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 157, 0.5);
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <Web3Provider>
        <App />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a472a',
              color: '#fff',
              border: '1px solid #00ff9d',
            },
          }}
        />
      </Web3Provider>
    </ChakraProvider>
  </StrictMode>,
);
