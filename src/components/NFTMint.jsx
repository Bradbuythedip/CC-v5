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

    // Create provider
    const provider = new window.pelagus.providers.Web3Provider(window.pelagus, {
      name: 'Cyprus1',
      chainId: 1337,
      networkId: 1337,
    });

    // Ensure we're connected to the right network
    const network = await provider.getNetwork();
    console.log('Connected to network:', network);

    return provider;
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
      const provider = await getProvider();
      const signer = provider.getSigner();
      const contract = new window.pelagus.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

      const total = await contract.totalSupply();
      const max = await contract.maxSupply();
      const currentAccount = await signer.getAddress();
      const hasUsedFree = await contract.hasUsedFreeMint(currentAccount);

      setTotalSupply(total.toNumber());
      setMaxSupply(max.toNumber());
      setHasFreeMint(!hasUsedFree);
    } catch (err) {
      console.error("Error loading contract data:", err);
      setError(`Error loading contract data: ${err.message}`);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window !== 'undefined' && window.pelagus) {
          const accounts = await window.pelagus.request({ method: 'eth_accounts' });
          const isConnected = accounts.length > 0;
          setIsConnected(isConnected);
          if (isConnected) {
            setAccount(accounts[0]);
            await loadContractData();
          }
        }
      } catch (err) {
        console.error("Error checking connection:", err);
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
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    try {
      // Check if Chrome and Pelagus
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      if (!isChrome) {
        setError("Please use Chrome browser to connect Pelagus wallet");
        return;
      }
      
      if (typeof window !== 'undefined' && window.pelagus) {
        // Request account access
        await window.pelagus.request({ method: 'eth_requestAccounts' });
        
        // Get accounts
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          // Load contract data after successful connection
          await loadContractData();
        }
      } else {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Error connecting wallet");
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
      const signer = provider.getSigner();
      const contract = new window.pelagus.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

      const mintTx = await contract.mint({
        value: hasFreeMint ? 0 : window.pelagus.utils.parseEther("1")
      });

      await mintTx.wait();
      
      // Refresh data
      const total = await contract.totalSupply();
      setTotalSupply(total.toNumber());
      
      const account = await signer.getAddress();
      const hasUsedFree = await contract.hasUsedFreeMint(account);
      setHasFreeMint(!hasUsedFree);
      
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