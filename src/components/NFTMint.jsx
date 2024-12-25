import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Slider,
  CircularProgress,
  Stack,
} from '@mui/material';

// Helper function to wait for Pelagus to be fully initialized
const waitForPelagus = async () => {
  const maxAttempts = 50; // 5 seconds total
  const checkInterval = 100; // 100ms between checks

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    try {
      // Check if Pelagus is available
      if (window.pelagus) {
        // Try to get the chain ID to verify the connection
        const chainId = await window.pelagus.request({ method: 'eth_chainId' });
        if (chainId) {
          console.log('Pelagus initialized with chain ID:', chainId);
          return true;
        }
      }
    } catch (error) {
      console.log('Waiting for Pelagus to initialize...', attempts);
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return false;
};

// Helper function to get provider with proper initialization
const getProvider = async () => {
  try {
    if (typeof window === 'undefined') {
      throw new Error("Browser environment not detected");
    }

    // Wait for Pelagus to be fully initialized
    const isPelagusReady = await waitForPelagus();
    if (!isPelagusReady) {
      throw new Error("Pelagus wallet not initialized after waiting");
    }

    // Request account access if needed
    const accounts = await window.pelagus.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      await window.pelagus.request({ method: 'eth_requestAccounts' });
    }

    return window.pelagus;
  } catch (error) {
    console.error('Error initializing provider:', error);
    throw new Error('Failed to initialize Pelagus provider: ' + error.message);
  }
};

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const MINTING_ENABLED = NFT_CONTRACT_ADDRESS !== null;
const NFT_ABI = [
  "function mint() public payable",
  "function totalSupply() public view returns (uint256)",
  "function maxSupply() public pure returns (uint256)",
  "function hasFreeMint(address) public view returns (bool)",
  "function hasUsedFreeMint(address) public view returns (bool)",
  "function mintsPerWallet(address) public view returns (uint256)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function tokenURI(uint256) public view returns (string)"
];

const NFTMint = () => {
  const [loading, setLoading] = useState(false);
  const [mintAmount, setMintAmount] = useState(1);
  const [totalSupply, setTotalSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(420);
  const [hasFreeMint, setHasFreeMint] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);

  const handleMintChange = (event, newValue) => {
    setMintAmount(newValue);
  };

  // Contract helper functions for view functions with proper initialization
  const readContract = async (functionSelector, params = [], retry = true) => {
    try {
      // Initialize provider first
      await getProvider();
      
      console.log(`Calling contract with selector: ${functionSelector}`);
      const data = functionSelector + (params.length > 0 
        ? params.map(p => p.replace('0x', '').toLowerCase().padStart(64, '0')).join('')
        : '');

      // Get the current account
      const accounts = await window.pelagus.request({ method: 'eth_accounts' });
      const from = accounts?.[0];

      if (!from) {
        console.log('No account available');
        return null;
      }

      // Call params for view function
      const callParams = {
        to: NFT_CONTRACT_ADDRESS,
        data,
        from
      };

      // Try different RPC methods
      const methods = retry ? ['eth_call', 'quai_call'] : ['eth_call'];
      let lastError;

      for (const method of methods) {
        try {
          const result = await window.pelagus.request({
            method,
            params: [callParams, 'latest']
          });
          
          if (result) {
            console.log(`Contract call success (${method}):`, result);
            return result;
          }
        } catch (err) {
          console.log(`${method} failed:`, err);
          lastError = err;
          if (err.code === 4001 && !retry) break;
        }
      }

      if (lastError?.code === 4001) {
        console.log('User rejected the request');
        return null;
      }

      throw lastError || new Error('Contract call failed');
    } catch (error) {
      console.error('Contract call error:', error);
      return null;
    }
  };

  const loadContractData = async () => {
    if (!MINTING_ENABLED) {
      setError("Minting is not yet enabled");
      return;
    }

    try {
      // Initialize provider first
      await getProvider();

      const accounts = await window.pelagus.request({ method: 'eth_accounts' });
      if (!accounts?.length) return;

      const currentAccount = accounts[0];

      // Get all contract data in sequence to avoid race conditions
      const totalSupplyResult = await readContract("0x18160ddd");
      const maxSupplyResult = await readContract("0xd5abeb01");
      const mintsResult = await readContract("0x8b7ada50", [currentAccount]);

      // Parse results with default values
      const total = totalSupplyResult ? parseInt(totalSupplyResult.slice(2), 16) : 0;
      const max = maxSupplyResult ? parseInt(maxSupplyResult.slice(2), 16) : 420;
      const mintsCount = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;

      console.log("Contract data loaded:", { total, max, mintsCount });

      // Calculate states
      const hasUsedFree = mintsCount > 0;
      const canMint = mintsCount < 20;
      const shouldBeFree = !hasUsedFree;

      // Update all states
      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(shouldBeFree);

    } catch (err) {
      console.error("Error loading contract data:", err);
      if (!err.code || err.code !== 4001) {
        setError(`Error loading contract data: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!window.pelagus) {
          if (mounted) {
            setIsConnected(false);
            setAccount(null);
            setError('Please install Pelagus wallet extension');
          }
          return;
        }

        // Initialize provider
        await getProvider();

        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        if (mounted && accounts?.length) {
          setIsConnected(true);
          setAccount(accounts[0]);
          await loadContractData();
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (mounted) {
          setError(err.message);
          setIsConnected(false);
          setAccount(null);
        }
      }
    };

    init();

    if (window.pelagus) {
      const onAccountsChanged = async (accounts) => {
        if (!mounted) return;
        if (accounts?.length) {
          setIsConnected(true);
          setAccount(accounts[0]);
          await loadContractData();
        } else {
          setIsConnected(false);
          setAccount(null);
        }
      };

      const onChainChanged = () => {
        if (mounted) window.location.reload();
      };

      const onDisconnect = () => {
        if (mounted) {
          setIsConnected(false);
          setAccount(null);
          setError(null);
        }
      };

      window.pelagus.on('accountsChanged', onAccountsChanged);
      window.pelagus.on('chainChanged', onChainChanged);
      window.pelagus.on('disconnect', onDisconnect);

      return () => {
        mounted = false;
        window.pelagus.removeListener('accountsChanged', onAccountsChanged);
        window.pelagus.removeListener('chainChanged', onChainChanged);
        window.pelagus.removeListener('disconnect', onDisconnect);
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const connectWallet = async () => {
    try {
      // Initialize provider first
      const provider = await getProvider();
      if (!provider) {
        throw new Error("Failed to initialize wallet connection");
      }

      const chainId = await provider.request({ method: 'eth_chainId' });
      if (chainId !== '0x2330') {
        throw new Error('Please connect to Cyprus-1 network in Pelagus');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts?.length) {
        setIsConnected(true);
        setAccount(accounts[0]);
        setError(null);
        await loadContractData();
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Error connecting wallet");
      setIsConnected(false);
      setAccount(null);
    }
  };

  const mintNFT = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize provider first
      const provider = await getProvider();
      if (!provider) {
        throw new Error("Failed to initialize wallet connection");
      }

      if (!MINTING_ENABLED) {
        throw new Error("Minting is not yet enabled");
      }

      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts?.length) {
        throw new Error("Please connect your wallet first");
      }

      const currentAccount = accounts[0];

      // Check current mints
      const mintsResult = await readContract('0x8b7ada50', [currentAccount], false);
      if (!mintsResult) {
        throw new Error("Failed to check current mints");
      }

      const currentMints = parseInt(mintsResult.slice(2), 16);
      if (currentMints >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Determine if this should be a free mint
      const shouldBeFree = currentMints === 0;

      // Prepare transaction
      const mintValue = shouldBeFree ? '0x0' : '0xde0b6b3a7640000'; // 0 or 1 QUAI
      
      // Estimate gas first
      const gasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: mintValue,
          data: '0x1249c58b' // mint()
        }]
      });

      // Add 10% buffer to gas estimate
      const safeGasEstimate = Math.ceil(parseInt(gasEstimate, 16) * 1.1);

      // Execute mint transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: mintValue,
          data: '0x1249c58b', // mint()
          gas: '0x' + safeGasEstimate.toString(16)
        }]
      });

      console.log('Mint transaction sent:', txHash);
      setLoading(false);
      return txHash;

    } catch (err) {
      console.error("Error minting NFT:", err);
      setError(err.message || "Error minting NFT");
      setLoading(false);
      throw err;
    }
  };

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