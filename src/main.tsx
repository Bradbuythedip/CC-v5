import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import App from './App';
import theme from './theme';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
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
    </BrowserRouter>
  </React.StrictMode>
);