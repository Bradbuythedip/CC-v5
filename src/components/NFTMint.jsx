import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { quais } from 'quais';

// Helper function to get connected accounts
const getConnectedAccounts = async () => {
  try {
    const accounts = await window.pelagus.request({ method: 'quai_accounts' });
    console.log('Connected accounts:', accounts);
    return accounts;
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return [];
  }
};

// Helper function to request accounts
const requestAccounts = async () => {
  try {
    const accounts = await window.pelagus.request({ 
      method: 'quai_requestAccounts' 
    });

    console.log('Account request result:', accounts);
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned');
    }

    return accounts;
  } catch (error) {
    console.error('Account request error:', error);
    if (error.code === 4001) {
      // EIP-1193 userRejectedRequest error
      console.log('User rejected request');
      throw error;
    }
    throw error;
  }
};

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
const MINTING_ENABLED = NFT_CONTRACT_ADDRESS !== null;

const NFTMint = () => {
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(420);
  const [hasFreeMint, setHasFreeMint] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);

  // Setup provider and contract configuration
  const CHAIN_CONFIG = {
    name: 'Cyprus 1',
    chainId: 9000,
    url: 'https://rpc.quai.network'
  };

  // Contract ABI for read functions
  const readAbi = [
    "function totalSupply() view returns (uint256)",
    "function maxSupply() view returns (uint256)",
    "function mintsPerWallet(address) view returns (uint256)",
    "function hasUsedFreeMint(address) view returns (bool)"
  ];

  // Function to check contract read data
  const readContract = async (methodName, params = []) => {
    try {
      const accounts = await getConnectedAccounts();
      if (!accounts?.length) return null;

      // Create provider using Pelagus directly
      const result = await window.pelagus.request({
        method: 'quai_call',
        params: [{
          to: NFT_CONTRACT_ADDRESS,
          data: quais.Interface.from(readAbi).encodeFunctionData(methodName, params),
          from: accounts[0]
        }, 'latest']
      });

      // Decode the result
      const decodedResult = quais.Interface.from(readAbi).decodeFunctionResult(methodName, result);
      console.log(`${methodName} result:`, decodedResult);

      return Array.isArray(decodedResult) && decodedResult.length === 1 
        ? decodedResult[0] 
        : decodedResult;
    } catch (error) {
      console.error('Contract read error:', error);
      if (error.code === 4001) throw error;
      return null;
    }
  };

  // Load contract data
  const loadContractData = async () => {
    if (!MINTING_ENABLED) {
      setError("Minting is not yet enabled");
      return;
    }

    try {
      const accounts = await getConnectedAccounts();
      if (!accounts?.length) {
        console.log('No connected accounts');
        return;
      }

      // Get contract data
      const [totalSupply, maxSupply, mintsPerWallet] = await Promise.all([
        readContract("totalSupply"),
        readContract("maxSupply"),
        readContract("mintsPerWallet", [accounts[0]])
      ]);

      // Convert BigNumber to number if needed
      const total = totalSupply ? Number(totalSupply) : 0;
      const max = maxSupply ? Number(maxSupply) : 420;
      const mintsCount = mintsPerWallet ? Number(mintsPerWallet) : 0;

      console.log("Contract data:", { total, max, mintsCount });

      // Update state
      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(mintsCount === 0);
      setError(null);

    } catch (err) {
      console.error("Error loading data:", err);
      // Don't show error for user rejections
      if (err.code !== 4001) {
        setError("Unable to load NFT data. Please try again.");
      }
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      const accounts = await requestAccounts();
      
      if (accounts?.length) {
        const currentAccount = accounts[0];
        console.log('Connected to account:', currentAccount);

        setIsConnected(true);
        setAccount(currentAccount);
        setError(null);
        await loadContractData();
      }
    } catch (err) {
      console.error("Connection error:", err);
      if (err.code !== 4001) { // Don't show error for user rejection
        setError(err.message || "Failed to connect wallet");
      }
      setIsConnected(false);
      setAccount(null);
    }
  };

  // Mint function
  const mintNFT = async () => {
    try {
      setLoading(true);
      setError(null);

      const accounts = await getConnectedAccounts();
      if (!accounts?.length) {
        throw new Error("Please connect your wallet first");
      }

      const currentAccount = accounts[0];
      console.log('Minting with account:', currentAccount);

      // Check current mints
      const [currentMints, hasFreeMint] = await Promise.all([
        readContract('mintsPerWallet', [currentAccount]),
        readContract('hasUsedFreeMint', [currentAccount])
      ]);

      const mintCount = Number(currentMints || 0);
      if (mintCount >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Prepare transaction
      const mintValue = hasFreeMint ? '0x0' : '0xde0b6b3a7640000'; // 0 or 1 QUAI

      // Create interface for mint function
      const mintAbi = ["function mint() payable"];
      const mintInterface = quais.Interface.from(mintAbi);
      const mintData = mintInterface.encodeFunctionData('mint', []);

      console.log('Preparing mint transaction:', {
        from: currentAccount,
        to: NFT_CONTRACT_ADDRESS,
        value: mintValue,
        data: mintData
      });

      // Execute mint transaction through Pelagus
      const txHash = await window.pelagus.request({
        method: 'quai_sendTransaction',
        params: [{
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: mintValue,
          data: mintData,
          gas: '0x2DC6C0', // 3,000,000 gas
          maxFeePerGas: '0x4A817C800', // 20 gwei
          maxPriorityFeePerGas: '0x4A817C800' // 20 gwei
        }]
      });

      console.log('Mint transaction sent:', txHash);

      // Wait for transaction confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 1 minute max waiting time

      while (!confirmed && attempts < maxAttempts) {
        try {
          const receipt = await window.pelagus.request({
            method: 'quai_getTransactionReceipt',
            params: [txHash]
          });

          if (receipt && receipt.blockNumber) {
            confirmed = true;
            console.log('Transaction confirmed in block:', receipt.blockNumber);
          } else {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking again
          }
        } catch (error) {
          console.warn('Error checking transaction receipt:', error);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!confirmed) {
        console.warn('Transaction not confirmed after timeout, but it might still be pending');
      }

      setLoading(false);
      return txHash;

    } catch (err) {
      console.error("Error minting NFT:", err);
      if (err.code !== 4001) { // Don't show error for user rejection
        setError(err.message || "Failed to mint NFT");
      }
      setLoading(false);
      throw err;
    }
  };

  // Check if we're on the correct chain
  const checkChain = async () => {
    try {
      const chainId = await window.pelagus.request({
        method: 'quai_chainId'
      });
      const expectedChainId = '0x2328'; // 9000 in hex
      return chainId === expectedChainId;
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      return false;
    }
  };

  // Initialize connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check chain first
        const isCorrectChain = await checkChain();
        if (!isCorrectChain) {
          setError("Please connect to Quai Network Cyprus1");
          return;
        }

        const accounts = await getConnectedAccounts();
        if (accounts?.length) {
          setIsConnected(true);
          setAccount(accounts[0]);
          await loadContractData();
        }
      } catch (err) {
        console.error("Connection check failed:", err);
      }
    };

    checkConnection();

    // Setup event listeners
    if (window.pelagus) {
      window.pelagus.on('accountsChanged', async (accounts) => {
        if (accounts?.length) {
          const currentAccount = accounts[0];
          console.log('Account changed to:', currentAccount);
          
          setIsConnected(true);
          setAccount(currentAccount);
          setError(null);
          await loadContractData();
        } else {
          setIsConnected(false);
          setAccount(null);
          setError(null);
        }
      });

      window.pelagus.on('chainChanged', async (chainId) => {
        const isCorrectChain = chainId === '0x2328'; // 9000 in hex
        if (!isCorrectChain) {
          setError("Please connect to Quai Network Cyprus1");
          setIsConnected(false);
          setAccount(null);
        } else {
          setError(null);
          const accounts = await getConnectedAccounts();
          if (accounts?.length) {
            setIsConnected(true);
            setAccount(accounts[0]);
            await loadContractData();
          }
        }
      });

      window.pelagus.on('disconnect', () => {
        setIsConnected(false);
        setAccount(null);
        setError(null);
      });
    }
  }, []);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" gutterBottom>
          Mint Your Croak City NFT
        </Typography>

        {error && (
          <Typography color="error" align="center">
            {error}
          </Typography>
        )}

        <Typography variant="body1" align="center">
          {`Total Supply: ${totalSupply} / ${maxSupply}`}
        </Typography>

        {isConnected && (
          <>
            <Typography variant="h6" gutterBottom>
              {hasFreeMint ? 'You have a free mint available!' : 'Mint Cost: 1 QUAI'}
            </Typography>
            
            {loading ? (
              <CircularProgress />
            ) : (
              <Button
                variant="contained"
                onClick={mintNFT}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
                  borderRadius: 8,
                  border: 0,
                  color: 'white',
                  height: 48,
                  padding: '0 30px',
                  boxShadow: '0 3px 5px 2px rgba(0, 255, 157, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
                  },
                }}
              >
                {loading ? 'Minting...' : 'Mint NFT'}
              </Button>
            )}
          </>
        )}

        {!isConnected && (
          <Button
            variant="contained"
            onClick={connectWallet}
            sx={{
              background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
              borderRadius: 8,
              border: 0,
              color: 'white',
              height: 48,
              padding: '0 30px',
              boxShadow: '0 3px 5px 2px rgba(0, 255, 157, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
              },
            }}
          >
            Connect Wallet
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default NFTMint;