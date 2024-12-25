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
  const readContract = async (functionSelector, params = []) => {
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

      // Use eth_call without requiring signing
      const result = await window.pelagus.request({
        method: 'eth_call',
        params: [{
          to: NFT_CONTRACT_ADDRESS,
          data,
        }, 'latest']
      });
      console.log(`Contract call result: ${result}`);
      return result;
    } catch (error) {
      console.error('Contract call error:', error);
      // If it's not a user rejection, propagate the error
      if (!error.code || error.code !== 4001) {
        throw error;
      }
      // Return null for user rejections to handle them gracefully
      return null;
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
        // Try to read all contract data without requiring signing
        console.log('Loading contract data...');

        // Get total supply
        const totalSupplyResult = await readContract('0x18160ddd');
        console.log('Total supply raw result:', totalSupplyResult);
        const total = totalSupplyResult ? parseInt(totalSupplyResult.slice(2), 16) : 0;
        console.log('Parsed total supply:', total);

        // Get max supply (static value)
        const maxSupplyResult = await readContract('0xd5abeb01');
        console.log('Max supply raw result:', maxSupplyResult);
        const max = maxSupplyResult ? parseInt(maxSupplyResult.slice(2), 16) : 420;
        console.log('Parsed max supply:', max);

        // Check if user has used free mint by using mintsPerWallet
        const mintsResult = await readContract('0x8b7ada50', [currentAccount]);
        console.log('Mints per wallet raw result:', mintsResult);
        const mintsCount = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;
        console.log('User has minted:', mintsCount, 'times');
        // If mints count is 0, they haven't used their free mint
        const hasUsedFree = mintsCount > 0;
        console.log('Has used free mint:', hasUsedFree);

        // Only update state if we have valid results
        if (totalSupplyResult !== null && maxSupplyResult !== null) {
          console.log('Setting state with:', { total, max, hasFreeMint: !hasUsedFree });
          setTotalSupply(total);
          setMaxSupply(max);
          setHasFreeMint(!hasUsedFree);
        } else {
          console.log('Skipping state update due to rejected calls');
        }
      } catch (err) {
        console.error('Error reading contract:', err);
        throw new Error('Failed to read contract data');
      }
    } catch (err) {
      console.error("Error loading contract data:", err);
      // Check for common errors that we don't want to show to the user
      const silentErrors = [
        "Failed to read contract data",
        "User rejected the request"
      ];
      
      if (!silentErrors.includes(err.message) && (!err.code || err.code !== 4001)) {
        setError(`Error loading contract data: ${err.message}`);
      }

      // Keep current values if we have them, otherwise use defaults
      setTotalSupply(prev => prev || 0);
      setMaxSupply(prev => prev || 420);
      setHasFreeMint(prev => prev === undefined ? true : prev);
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
        console.log('Checking current mints...');
        const mintsResult = await readContract('0x8b7ada50', [currentAccount]);
        const currentMints = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;
        console.log('Current mints:', currentMints);

        if (currentMints >= 20) {
          throw new Error('You have reached the maximum number of mints (20) per wallet');
        }

        // Determine if this should be a free mint
        const shouldBeFree = currentMints === 0;
        console.log('Should be free mint:', shouldBeFree);

        console.log('Preparing mint transaction...');
        const mintParams = {
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: shouldBeFree ? '0x0' : '0xDE0B6B3A7640000', // 0 or 1 QUAI
          data: '0x1249c58b' // mint()
        };
        console.log('Mint transaction params:', mintParams);

        // Request transaction approval with clear message
        const txHash = await window.pelagus.request({
          method: 'eth_sendTransaction',
          params: [mintParams]
        }).catch(err => {
          if (err.code === 4001) {
            throw new Error(shouldBeFree ? 
              'Please approve the free mint transaction' : 
              'Please approve the mint transaction (1 QUAI)');
          }
          throw err;
        });

        console.log('Transaction hash:', txHash);

        // Wait for confirmation with timeout
        console.log('Waiting for transaction confirmation...');
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout

        while (!confirmed && attempts < maxAttempts) {
          try {
            const receipt = await window.pelagus.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            });

            if (receipt) {
              // Check if transaction was successful
              if (receipt.status === '0x1') {
                confirmed = true;
                console.log('Transaction confirmed successfully:', receipt);
              } else {
                throw new Error('Transaction failed on the blockchain');
              }
            } else {
              console.log(`Waiting for confirmation... (${attempts + 1}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
          } catch (err) {
            if (err.message === 'Transaction failed on the blockchain') {
              throw err;
            }
            console.log('Error checking receipt, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        if (!confirmed) {
          throw new Error('Transaction confirmation timed out. Please check your wallet for status.');
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