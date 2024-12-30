import React from 'react';
import { Box, Container, VStack } from '@chakra-ui/react';
import NFTMint from './components/NFTMint';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  return (
    <Box minH="100vh" bg="brand.background">
      <Navigation />
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <NFTMint />
        </VStack>
      </Container>
    </Box>
  );
};

export default App;