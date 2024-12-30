import React from 'react';
import { Box, Button, Flex, HStack, Text, useColorModeValue } from "@chakra-ui/react";
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { formatAddress } from '../utils/pelagus';

const Navigation = () => {
  const navigate = useNavigate();
  const { state, connectWallet, disconnect } = useWeb3();
  const { isConnected, account, loading } = state;

  const bgColor = useColorModeValue('brand.secondary', 'blackAlpha.900');
  const buttonBg = useColorModeValue('brand.primary', 'green.200');
  const buttonText = useColorModeValue('brand.secondary', 'black');

  const handleAnalyticsClick = () => {
    navigate('/analytics');
  };

  return (
    <Box>
      <Flex
        bg={bgColor}
        w="100%"
        px={4}
        py={4}
        justifyContent="space-between"
        alignItems="center"
        borderBottom="1px solid"
        borderColor="brand.primary"
      >
        <HStack spacing={4}>
          <Text color="brand.primary" fontSize="xl" fontWeight="bold">
            Croak City
          </Text>
        </HStack>
        <HStack spacing={4}>
          <Button
            bg={buttonBg}
            color={buttonText}
            _hover={{ opacity: 0.8 }}
            onClick={handleAnalyticsClick}
          >
            Analytics
          </Button>
          <Button
            bg={buttonBg}
            color={buttonText}
            _hover={{ opacity: 0.8 }}
            onClick={isConnected ? disconnect : connectWallet}
            isLoading={loading}
          >
            {!window.pelagus 
              ? 'Install Pelagus'
              : isConnected 
                ? formatAddress(account || '') 
                : 'Connect Wallet'
            }
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navigation;