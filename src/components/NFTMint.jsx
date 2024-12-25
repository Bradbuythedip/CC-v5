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

// Helper function to get provider
const getProvider = async () => {
  try {
    if (typeof window === 'undefined') {
      throw new Error("Browser environment not detected");
    }

    // Wait for Pelagus to initialize
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

  // Contract helper functions
  const readContract = async (functionSelector, params = [], from = null) => {
    try {
      console.log(`Calling contract with selector: ${functionSelector}`);
      let data = functionSelector;
      if (params.length > 0) {
        const encodedParams = params.map(p => {
          // Remove 0x if present and pad
          const cleaned = p.replace('0x', '').toLowerCase();
          return cleaned.padStart(64, '0');
        }).join('');
        console.log('Encoded params:', encodedParams);
        data += encodedParams;
      }
      console.log('Full call data:', data);

      const callParams = {
        to: NFT_CONTRACT_ADDRESS,
        data,
      };

      if (from) {
        callParams.from = from;
      }

      console.log('Making eth_call with params:', callParams);
      const result = await window.pelagus.request({
        method: 'eth_call',
        params: [callParams, 'latest']
      });
      console.log(`Contract call result: ${result}`);
      return result;
    } catch (error) {
      console.error('Contract call error:', error);
      throw error;
    }
  };

  const loadContractData = async () => {
    if (!MINTING_ENABLED) {
      setError("Minting is not yet enabled");
      return;
    }

    try {
      // First check if we're already connected
      const accounts = await window.pelagus.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        // Don't show an error, just return silently as we're not connected yet
        return;
      }

      const currentAccount = accounts[0];

      try {
        console.log('Loading contract data for account:', currentAccount);

        // Get total supply
        const totalSupplyResult = await readContract('0x18160ddd', [], currentAccount);
        console.log('Total supply raw result:', totalSupplyResult);
        const total = totalSupplyResult ? parseInt(totalSupplyResult.slice(2), 16) : 0;
        console.log('Parsed total supply:', total);

        // Get max supply
        const maxSupplyResult = await readContract('0xd5abeb01', [], currentAccount);
        console.log('Max supply raw result:', maxSupplyResult);
        const max = maxSupplyResult ? parseInt(maxSupplyResult.slice(2), 16) : 420;
        console.log('Parsed max supply:', max);

        // Check if user has used free mint
        // First, pad the address to 32 bytes (remove 0x and pad to 64 characters)
        const paddedAddress = currentAccount.slice(2).padStart(64, '0');
        console.log('Padded address for hasUsedFreeMint:', paddedAddress);
        
        const hasUsedFreeResult = await readContract('0xc5c83840', [currentAccount], currentAccount);
        console.log('Has used free mint raw result:', hasUsedFreeResult);
        const hasUsedFree = hasUsedFreeResult && hasUsedFreeResult !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        console.log('Parsed has used free mint:', hasUsedFree);

        console.log('Setting state with:', { total, max, hasFreeMint: !hasUsedFree });
        setTotalSupply(total);
        setMaxSupply(max);
        setHasFreeMint(!hasUsedFree);
      } catch (err) {
        console.error('Error reading contract:', err);
        throw new Error('Failed to read contract data');
      }
    } catch (err) {
      console.error("Error loading contract data:", err);
      // Don't show the error to the user if we're just not connected yet
      if (err.message !== "Failed to read contract data") {
        setError(`Error loading contract data: ${err.message}`);
      }
      // Reset states on error
      setTotalSupply(0);
      setMaxSupply(420);
      setHasFreeMint(true);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window === 'undefined' || !window.pelagus) {
          return;
        }

        // Just check eth_accounts without prompting
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        const isConnected = accounts.length > 0;
        setIsConnected(isConnected);
        
        if (isConnected) {
          setAccount(accounts[0]);
          // Only load contract data if we have an account
          await loadContractData();
        } else {
          setAccount(null);
        }
      } catch (err) {
        console.error("Error checking connection:", err);
        // Don't show error to user, just log it
        setIsConnected(false);
        setAccount(null);
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.pelagus) {
      window.pelagus.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          loadContractData();
        } else {
          setIsConnected(false);
          setAccount(null);
          setError(null); // Clear any previous errors
        }
      });

      // Listen for chain changes
      window.pelagus.on('chainChanged', () => {
        // Reload the page on chain change as recommended by Pelagus
        window.location.reload();
      });

      // Listen for disconnect
      window.pelagus.on('disconnect', () => {
        setIsConnected(false);
        setAccount(null);
        setError(null);
      });
    }

    // Cleanup listeners
    return () => {
      if (window.pelagus) {
        window.pelagus.removeListener('accountsChanged', () => {});
        window.pelagus.removeListener('chainChanged', () => {});
        window.pelagus.removeListener('disconnect', () => {});
      }
    };
  }, []);

  const connectWallet = async () => {
    try {
      // Check if Chrome and Pelagus
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      if (!isChrome) {
        setError("Please use Chrome browser to connect Pelagus wallet");
        return;
      }
      
      if (typeof window === 'undefined' || !window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      try {
        // Request account access
        const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          // Load contract data after successful connection
          await loadContractData();
        }
      } catch (err) {
        if (err.code === 4001) {
          // User rejected the connection request
          throw new Error("Please approve the connection request in Pelagus");
        }
        throw err;
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

      if (!MINTING_ENABLED) {
        throw new Error("Minting is not yet enabled");
      }

      if (!window.pelagus) {
        throw new Error("Please install Pelagus wallet");
      }

      // Get current account
      const accounts = await window.pelagus.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error("Please connect your wallet first");
      }
      const currentAccount = accounts[0];

      try {
        console.log('Preparing mint transaction...');
        const mintParams = {
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: hasFreeMint ? '0x0' : '0xDE0B6B3A7640000', // 0 or 1 QUAI
          data: '0x1249c58b' // mint()
        };
        console.log('Mint transaction params:', mintParams);

        // Send transaction
        const txHash = await window.pelagus.request({
          method: 'eth_sendTransaction',
          params: [mintParams]
        });
        console.log('Transaction hash:', txHash);

        console.log('Transaction sent:', txHash);

        // Wait for confirmation
        let confirmed = false;
        while (!confirmed) {
          try {
            const receipt = await window.pelagus.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            });
            if (receipt) {
              confirmed = true;
              console.log('Transaction confirmed:', receipt);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.log('Waiting for confirmation...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Refresh data
        await loadContractData();
      } catch (err) {
        if (err.code === 4001) {
          throw new Error("Transaction was rejected. Please approve the transaction in Pelagus");
        }
        throw err;
      }
    } catch (err) {
      console.error("Error minting NFT:", err);
      setError(err.message || "Error minting NFT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: '400px', mx: 'auto' }}>
      <Stack spacing={1.5} alignItems="center">
        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#00ff9d',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
            mb: 1
          }}
        >
          MINT YOUR CROAK CITY NFT (1st Free)
        </Typography>

        <Box sx={{ width: '100%', px: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#00ff9d',
              mb: 1,
              fontSize: '0.8rem',
              textAlign: 'center',
              opacity: 0.9
            }}
          >
            Select number of NFTs to mint (max 20)
          </Typography>
          <Slider
            value={mintAmount}
            onChange={handleMintChange}
            min={1}
            max={20}
            marks
            valueLabelDisplay="on"
            sx={{
              color: '#00ff9d',
              '& .MuiSlider-mark': {
                backgroundColor: '#00ff9d',
              },
              '& .MuiSlider-rail': {
                opacity: 0.5,
              },
            }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ color: 'rgba(0, 255, 157, 0.7)', mb: 1.5, fontSize: '0.8rem' }}>
            Total Minted: {totalSupply} / {maxSupply}
          </Typography>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          onClick={!isConnected ? connectWallet : mintNFT}
          disabled={loading}
          sx={{
            background: 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
            color: '#0a1f13',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            py: 1,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: '#0a1f13' }} />
          ) : !window.pelagus ? (
            'Install Pelagus Wallet'
          ) : !isConnected ? (
            'Connect Wallet'
          ) : (
            <>Mint Now {account ? `(${account.slice(0, 6)}...${account.slice(-4)})` : ''}</>
          )}
        </Button>
      </Stack>
    </Box>
  );
};

export default NFTMint;