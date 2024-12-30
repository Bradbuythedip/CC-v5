import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import NFTMint from './components/NFTMint';

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <Web3Provider>
        <div className="App">
          <NFTMint />
          <Toaster position="bottom-right" />
        </div>
      </Web3Provider>
    </ChakraProvider>
  );
};

export default App;