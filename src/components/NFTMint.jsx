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

      // Create a contract instance
      const contract = {
        async totalSupply() {
          const result = await provider.request({
            method: 'eth_call',
            params: [{
              to: NFT_CONTRACT_ADDRESS,
              data: '0x18160ddd' // totalSupply()
            }, 'latest']
          });
          return parseInt(result, 16);
        },
        async maxSupply() {
          const result = await provider.request({
            method: 'eth_call',
            params: [{
              to: NFT_CONTRACT_ADDRESS,
              data: '0xd5abeb01' // maxSupply()
            }, 'latest']
          });
          return parseInt(result, 16);
        },
        async hasUsedFreeMint(address) {
          const data = '0x' + 'c5c83840' + // hasUsedFreeMint(address)
                      address.slice(2).padStart(64, '0');
          const result = await provider.request({
            method: 'eth_call',
            params: [{
              to: NFT_CONTRACT_ADDRESS,
              data: data
            }, 'latest']
          });
          return result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        }
      };

      const total = await contract.totalSupply();
      const max = await contract.maxSupply();
      const hasUsedFree = await contract.hasUsedFreeMint(currentAccount);

      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(!hasUsedFree);
    } catch (err) {
      console.error("Error loading contract data:", err);
      setError(`Error loading contract data: ${err.message}`);
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

      if (typeof window.pelagus === 'undefined') {
        throw new Error("Please install Pelagus wallet");
      }

      const provider = await getProvider();
      const accounts = await provider.request({ method: 'eth_accounts' });
      const currentAccount = accounts[0];

      // Create the mint transaction
      const mintTx = {
        from: currentAccount,
        to: NFT_CONTRACT_ADDRESS,
        value: hasFreeMint ? '0x0' : '0xDE0B6B3A7640000', // 0 or 1 QUAI
        data: '0x1249c58b' // mint()
      };

      // Send the transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [mintTx]
      });

      // Wait for transaction confirmation
      let confirmed = false;
      while (!confirmed) {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });
        if (receipt) {
          confirmed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Refresh data
      await loadContractData();
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
          onClick={typeof window.pelagus === 'undefined' ? connectWallet : mintNFT}
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