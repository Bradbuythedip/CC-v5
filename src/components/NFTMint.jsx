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
  const [connecting, setConnecting] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(420);
  const [hasFreeMint, setHasFreeMint] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);

  // Setup provider and contract configuration
  const CHAIN_CONFIG = {
    name: 'Cyprus 1',
    chainId: Number(import.meta.env.VITE_QUAI_CHAIN_ID || 9000),
    url: import.meta.env.VITE_QUAI_RPC_URL || 'https://rpc.quai.network'
  };

  // Contract ABI for read functions
  const readAbi = {
    totalSupply: {
      name: 'totalSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    maxSupply: {
      name: 'maxSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }]
    },
    mintsPerWallet: {
      name: 'mintsPerWallet',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }]
    },
    hasUsedFreeMint: {
      name: 'hasUsedFreeMint',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }]
    }
  };

  // Function to check contract read data
  const readContract = async (methodName, params = []) => {
    try {
      const accounts = await getConnectedAccounts();
      if (!accounts?.length) return null;

      const functionAbi = readAbi[methodName];
      if (!functionAbi) {
        throw new Error(`Function ${methodName} not found in ABI`);
      }

      // Create the interface for this specific function
      const iface = new quais.Interface([functionAbi]);
      
      // Encode function data
      const data = iface.encodeFunctionData(methodName, params);
      
      console.log(`Calling ${methodName} with params:`, params);
      console.log('Encoded data:', data);

      // Create provider using Pelagus directly
      const result = await window.pelagus.request({
        method: 'quai_call',
        params: [{
          to: NFT_CONTRACT_ADDRESS,
          data: data,
          from: accounts[0]
        }, 'latest']
      });

      console.log(`Raw result for ${methodName}:`, result);

      if (!result) {
        console.warn(`No result returned for ${methodName}`);
        return null;
      }

      // Decode the result
      const decodedResult = iface.decodeFunctionResult(methodName, result);
      console.log(`${methodName} decoded result:`, decodedResult);

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
      const [totalSupply, maxSupply, mintsPerWallet, hasFreeMintAvailable] = await Promise.all([
        readContract("totalSupply"),
        readContract("maxSupply"),
        readContract("mintsPerWallet", [accounts[0]]),
        readContract("hasUsedFreeMint", [accounts[0]])
      ]);

      // Convert BigNumber to number if needed
      const total = totalSupply ? Number(totalSupply) : 0;
      const max = maxSupply ? Number(maxSupply) : 420;
      const mintsCount = mintsPerWallet ? Number(mintsPerWallet) : 0;

      console.log("Contract data:", { total, max, mintsCount });

      // Update state
      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(!hasFreeMintAvailable);
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
      setConnecting(true);
      setError(null);

      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      // Check network first
      console.log("Checking network...");
      await checkChain();

      // Request accounts after confirming network
      console.log("Requesting accounts...");
      const accounts = await requestAccounts();
      
      if (accounts?.length) {
        const currentAccount = accounts[0];
        console.log('Connected to account:', currentAccount);

        // Double check address format matches Cyprus-1
        if (!currentAccount.toLowerCase().startsWith('0x00')) {
          throw new Error("Please use a Cyprus-1 address (starting with 0x00)");
        }

        setIsConnected(true);
        setAccount(currentAccount);
        setError(null);

        // Load contract data
        console.log("Loading contract data...");
        await loadContractData();
        console.log("Contract data loaded successfully");
      }
    } catch (err) {
      console.error("Connection error:", err);
      if (err.code !== 4001) { // Don't show error for user rejection
        setError(err.message || "Failed to connect wallet");
      }
      setIsConnected(false);
      setAccount(null);
    } finally {
      setConnecting(false);
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
      const [currentMints, hasUsedFreeMint] = await Promise.all([
        readContract('mintsPerWallet', [currentAccount]),
        readContract('hasUsedFreeMint', [currentAccount])
      ]);

      const mintCount = Number(currentMints || 0);
      if (mintCount >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Prepare transaction
      const mintValue = !hasUsedFreeMint ? '0x0' : quais.parseEther('1.0').toString(); // 0 or 1 QUAI

      // Create interface for mint function
      const mintAbi = {
        name: 'mint',
        type: 'function',
        stateMutability: 'payable',
        inputs: [],
        outputs: []
      };
      const mintInterface = new quais.Interface([mintAbi]);
      const mintData = mintInterface.encodeFunctionData('mint', []);

      console.log('Preparing mint transaction:', {
        from: currentAccount,
        to: NFT_CONTRACT_ADDRESS,
        value: mintValue,
        data: mintData
      });

      // Execute mint transaction through Pelagus
      console.log('Sending transaction...');
      const txHash = await window.pelagus.request({
        method: 'quai_sendTransaction',
        params: [{
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: mintValue,
          data: mintData,
          gasLimit: '0x2DC6C0', // 3,000,000 gas
          maxFeePerGas: quais.parseUnits('20', 'gwei').toString(),
          maxPriorityFeePerGas: quais.parseUnits('20', 'gwei').toString()
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

  // Check if we're connected to Cyprus-1
  const checkChain = async () => {
    try {
      // First check if Pelagus is available
      if (!window.pelagus) {
        throw new Error("Please install Pelagus wallet");
      }

      // Check network/zone
      const networkInfo = await window.pelagus.request({
        method: 'quai_getNetwork'
      });
      console.log('Network info:', networkInfo);

      // Get zone information
      const zoneInfo = await window.pelagus.request({
        method: 'quai_getZone'
      });
      console.log('Zone info:', zoneInfo);

      // Check if we're on Cyprus-1
      if (!zoneInfo || !zoneInfo.toLowerCase().includes('cyprus')) {
        throw new Error("Please switch to Cyprus-1 zone in Pelagus");
      }

      // Get accounts
      const accounts = await window.pelagus.request({
        method: 'quai_accounts'
      });
      console.log('Connected accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      return true;
    } catch (error) {
      console.error('Chain check failed:', error);
      throw error;
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

      window.pelagus.on('networkChanged', async () => {
        try {
          // Check if we're still on Cyprus-1
          await checkChain();
          setError(null);
          
          // Refresh connection if on correct network
          const accounts = await getConnectedAccounts();
          if (accounts?.length) {
            const currentAccount = accounts[0];
            if (currentAccount.toLowerCase().startsWith('0x00')) {
              setIsConnected(true);
              setAccount(currentAccount);
              await loadContractData();
            } else {
              throw new Error("Please use a Cyprus-1 address (starting with 0x00)");
            }
          }
        } catch (err) {
          console.error("Network change error:", err);
          setError(err.message || "Please connect to Cyprus-1 network");
          setIsConnected(false);
          setAccount(null);
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
            disabled={connecting}
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
              '&:disabled': {
                background: 'linear-gradient(45deg, #cccccc 30%, #999999 90%)',
              },
            }}
          >
            {connecting ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} sx={{ color: 'white' }} />
                <span>Connecting...</span>
              </Stack>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default NFTMint;