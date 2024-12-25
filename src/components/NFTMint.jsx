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
      if (!NFT_CONTRACT_ADDRESS) {
        throw new Error("Contract address not configured");
      }

      // Initialize provider first
      const provider = await getProvider();
      if (!provider) {
        throw new Error("Failed to initialize provider");
      }
      
      // Get the current account synchronously to avoid race conditions
      const accounts = await provider.request({ method: 'eth_accounts' });
      const from = accounts?.[0];
      if (!from) {
        throw new Error("No connected account found");
      }

      // Prepare the call data
      console.log(`Calling contract with selector: ${functionSelector}`);
      let data = functionSelector;
      if (params.length > 0) {
        const encodedParams = params.map(p => {
          if (!p) throw new Error("Invalid parameter: " + p);
          const cleaned = p.replace('0x', '').toLowerCase();
          return cleaned.padStart(64, '0');
        }).join('');
        console.log('Encoded params:', encodedParams);
        data += encodedParams;
      }

      // Call params for view function
      const callParams = {
        to: NFT_CONTRACT_ADDRESS,
        data,
        from
      };

      console.log('Call params:', callParams);

      // Try different RPC methods with better error handling
      const methods = retry ? ['eth_call', 'quai_call'] : ['eth_call'];
      let lastError;
      let lastResult;

      for (const method of methods) {
        try {
          const result = await provider.request({
            method,
            params: [callParams, 'latest']
          });
          
          if (result && result !== '0x') {
            console.log(`Contract call success (${method}):`, {
              result,
              parsed: parseInt(result.slice(2), 16)
            });
            lastResult = result;
            break;
          }
        } catch (err) {
          console.log(`${method} failed:`, err);
          lastError = err;
          if (err.code === 4001) break; // User rejected
        }
      }

      // Return the last successful result if we have one
      if (lastResult) {
        return lastResult;
      }

      // Handle specific error cases
      if (lastError?.code === 4001) {
        throw new Error('User rejected the request');
      } else if (lastError?.message?.includes('execution reverted')) {
        throw new Error('Contract call reverted: ' + (lastError.message || 'Unknown reason'));
      }

      throw lastError || new Error('Contract call failed');
    } catch (error) {
      console.error('Contract call error:', error);
      // Instead of returning null, throw the error for better error handling
      throw error;
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

        // Check for connected accounts without prompting
        const accounts = await window.pelagus.request({ 
          method: 'eth_accounts' 
        }).catch(err => {
          console.log('eth_accounts request failed:', err);
          return [];
        });

        if (mounted && accounts?.length) {
          // Check if we're on the right network
          const chainId = await window.pelagus.request({ method: 'eth_chainId' });
          
          if (chainId !== '0x2330') {
            setError('Please switch to Cyprus-1 network in Pelagus');
            setIsConnected(false);
            setAccount(null);
            return;
          }

          setIsConnected(true);
          setAccount(accounts[0]);
          setError(null);
          await loadContractData().catch(err => {
            console.error('Failed to load initial contract data:', err);
          });
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
          try {
            const chainId = await window.pelagus.request({ method: 'eth_chainId' });
            
            if (chainId !== '0x2330') {
              setError('Please switch to Cyprus-1 network in Pelagus');
              setIsConnected(false);
              setAccount(null);
              return;
            }

            setIsConnected(true);
            setAccount(accounts[0]);
            setError(null);
            await loadContractData().catch(err => {
              console.error('Failed to load contract data on account change:', err);
            });
          } catch (err) {
            console.error('Error checking chain on account change:', err);
            setError('Failed to verify network. Please ensure you are on Cyprus-1');
            setIsConnected(false);
            setAccount(null);
          }
        } else {
          setIsConnected(false);
          setAccount(null);
          setError('Please connect your wallet');
        }
      };

      const onChainChanged = async (chainId) => {
        if (!mounted) return;
        
        console.log('Chain changed to:', chainId);
        
        if (chainId !== '0x2330') {
          setError('Please switch to Cyprus-1 network in Pelagus');
          setIsConnected(false);
          setAccount(null);
          return;
        }

        // Reload contract data if we're connected and on the right chain
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        if (accounts?.length) {
          setIsConnected(true);
          setAccount(accounts[0]);
          setError(null);
          await loadContractData().catch(err => {
            console.error('Failed to load contract data on chain change:', err);
          });
        }
      };

      const onDisconnect = () => {
        if (mounted) {
          setIsConnected(false);
          setAccount(null);
          setError('Wallet disconnected');
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
      // First check if Pelagus is available
      if (typeof window === 'undefined' || !window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      // Request account access first
      const accounts = await window.pelagus.request({ 
        method: 'eth_requestAccounts' 
      }).catch(err => {
        if (err.code === 4001) {
          throw new Error("Please approve the connection request in Pelagus");
        }
        throw err;
      });

      if (!accounts?.length) {
        throw new Error("No accounts found. Please unlock Pelagus");
      }

      // After connection, check the chain ID
      const chainId = await window.pelagus.request({ method: 'eth_chainId' });
      console.log('Connected to chain:', chainId);

      // Cyprus-1 chainId is 0x2330
      if (chainId !== '0x2330') {
        // Try to switch to Cyprus-1
        try {
          await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2330' }],
          });
          console.log('Successfully switched to Cyprus-1');
        } catch (switchError) {
          // This error code indicates that the chain has not been added to Pelagus
          if (switchError.code === 4902) {
            try {
              await window.pelagus.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x2330',
                  chainName: 'Cyprus-1',
                  nativeCurrency: {
                    name: 'QUAI',
                    symbol: 'QUAI',
                    decimals: 18
                  },
                  rpcUrls: ['https://rpc.cyprus1.colosseum.quai.network'],
                  blockExplorerUrls: ['https://cyprus1.colosseum.quaiscan.io']
                }],
              });
            } catch (addError) {
              throw new Error('Please add and switch to Cyprus-1 network in Pelagus manually');
            }
          } else {
            throw new Error('Please switch to Cyprus-1 network in Pelagus manually');
          }
        }
      }

      // Verify the switch was successful
      const finalChainId = await window.pelagus.request({ method: 'eth_chainId' });
      if (finalChainId !== '0x2330') {
        throw new Error('Failed to switch to Cyprus-1 network. Please try again.');
      }

      // Set connected state
      setIsConnected(true);
      setAccount(accounts[0]);
      setError(null);

      // Load contract data
      await loadContractData().catch(err => {
        console.error('Failed to load initial contract data:', err);
      });

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

      // Validate environment
      if (!MINTING_ENABLED || !NFT_CONTRACT_ADDRESS) {
        throw new Error("Minting is not yet enabled");
      }

      console.log('Starting mint process...');

      // Initialize provider with validation
      const provider = await getProvider().catch(err => {
        console.error('Provider initialization failed:', err);
        throw new Error("Failed to initialize wallet connection. Please ensure Pelagus is installed and unlocked.");
      });

      // Get and validate account
      const accounts = await provider.request({ method: 'eth_accounts' }).catch(err => {
        console.error('Account fetch failed:', err);
        throw new Error("Failed to get account. Please reconnect your wallet.");
      });

      if (!accounts?.length) {
        throw new Error("Please connect your wallet first");
      }
      const currentAccount = accounts[0];

      // Check chain ID
      const chainId = await provider.request({ method: 'eth_chainId' }).catch(err => {
        console.error('Chain ID check failed:', err);
        throw new Error("Failed to verify network. Please ensure you're connected to Cyprus-1.");
      });

      if (chainId !== '0x2330') {
        throw new Error('Please switch to Cyprus-1 network in Pelagus');
      }

      console.log('Checking current mints for account:', currentAccount);

      // Check current mints with detailed error handling
      let currentMints;
      try {
        const mintsResult = await readContract('0x8b7ada50', [currentAccount], false);
        if (!mintsResult || mintsResult === '0x') {
          throw new Error("Invalid response from contract");
        }
        currentMints = parseInt(mintsResult.slice(2), 16);
        console.log('Current mints:', currentMints);
      } catch (err) {
        console.error('Mints check failed:', err);
        throw new Error("Failed to verify current mints. Please try again.");
      }

      // Validate mints count
      if (currentMints >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Determine if this should be a free mint
      const shouldBeFree = currentMints === 0;
      const mintValue = shouldBeFree ? '0x0' : '0xde0b6b3a7640000'; // 0 or 1 QUAI

      console.log('Preparing mint transaction:', {
        shouldBeFree,
        mintValue,
        currentMints
      });

      // Prepare basic transaction
      const baseTransaction = {
        from: currentAccount,
        to: NFT_CONTRACT_ADDRESS,
        value: mintValue,
        data: '0x1249c58b' // mint()
      };
      
      // Estimate gas with retry logic
      let gasEstimate;
      try {
        gasEstimate = await provider.request({
          method: 'eth_estimateGas',
          params: [baseTransaction]
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        if (err.message?.includes('insufficient funds')) {
          throw new Error(shouldBeFree 
            ? "Insufficient funds for gas fees" 
            : "Insufficient funds for mint cost and gas fees");
        }
        throw new Error("Failed to estimate gas. Please try again.");
      }

      // Add 20% buffer to gas estimate for safety
      const safeGasEstimate = Math.ceil(parseInt(gasEstimate, 16) * 1.2);
      console.log('Gas estimate:', {
        original: parseInt(gasEstimate, 16),
        withBuffer: safeGasEstimate
      });

      // Execute mint transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          ...baseTransaction,
          gas: '0x' + safeGasEstimate.toString(16)
        }]
      }).catch(err => {
        console.error('Transaction failed:', err);
        if (err.code === 4001) {
          throw new Error("Transaction was rejected. Please try again.");
        }
        throw new Error("Failed to send transaction. Please try again.");
      });

      console.log('Mint transaction sent:', txHash);
      
      // Update UI state
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