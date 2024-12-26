import React, { useState, useEffect } from 'react';
import { quais } from 'quais';
import {
  Box,
  Button,
  Typography,
  Slider,
  CircularProgress,
  Stack,
  Link,
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

// Helper function to wait for Pelagus initialization in Firefox
const waitForFirefoxPelagus = async () => {
  const maxAttempts = 20; // Increased attempts for Firefox
  const interval = 500; // 500ms between attempts
  
  console.log('Starting Firefox Pelagus initialization check...');
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Firefox Pelagus check attempt ${i + 1}/${maxAttempts}`);
    
    if (window.pelagus) {
      try {
        // More thorough check for Firefox
        const chainId = await window.pelagus.request({ method: 'eth_chainId' });
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        
        console.log('Firefox Pelagus check results:', {
          chainId,
          accountsAvailable: Array.isArray(accounts) && accounts.length > 0,
          pelagusMethods: Object.keys(window.pelagus).join(', ')
        });
        
        // Make sure we have the basic requirements
        if (chainId && typeof window.pelagus.request === 'function') {
          console.log('Firefox Pelagus initialization successful');
          return true;
        }
      } catch (err) {
        console.log('Firefox Pelagus not ready yet:', err.message);
      }
    } else {
      console.log('Firefox Pelagus object not found yet');
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.log('Firefox Pelagus initialization timed out');
  return false;
};

// Helper function to get provider
const getProvider = async () => {
  try {
    if (typeof window === 'undefined') {
      throw new Error("Browser environment not detected");
    }

    // Special handling for Firefox
    if (/Firefox/.test(navigator.userAgent)) {
      const isPelagusReady = await waitForFirefoxPelagus();
      if (!isPelagusReady) {
        throw new Error("Please ensure Pelagus extension is properly installed and enabled in Firefox");
      }
    } else {
      // For Chrome and others, use the original wait function
      const isPelagusReady = await waitForPelagus();
      if (!isPelagusReady) {
        throw new Error("Pelagus wallet not initialized after waiting");
      }
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
  "function maxSupply() public view returns (uint256)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function tokenURI(uint256) public view returns (string)",
  "function withdraw() public"
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
    if (!account) return;

    try {
      // Initialize provider
      const provider = new quais.BrowserProvider(window.pelagus, undefined, { usePathing: true });
      
      // Contract ABI for view functions
      const contractABI = [
        "function totalSupply() public view returns (uint256)",
        "function maxSupply() public view returns (uint256)"
      ];
      
      // Create contract instance
      const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, contractABI, provider);

      // Get contract data
      const [totalSupply, maxSupply] = await Promise.all([
        contract.totalSupply(),
        contract.maxSupply()
      ]);

      // Update states
      setTotalSupply(Number(totalSupply));
      setMaxSupply(Number(maxSupply));

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
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('Not in browser environment');
        return;
      }

      // Clear any previous errors when checking connection
      setError(null);

      // Check if Pelagus is available
      if (!window.pelagus) {
        console.log('Pelagus not available');
        setIsConnected(false);
        setAccount(null);
        
        // Enhanced Firefox-specific checks and guidance
        if (/Firefox/.test(navigator.userAgent)) {
          // Get Firefox version
          const firefoxVersion = parseInt(navigator.userAgent.split('Firefox/')[1]) || 0;
          console.log('Firefox version detected:', firefoxVersion);
          
          if (firefoxVersion < 102) {
            setError('Please update Firefox to version 102 or later to use Pelagus');
            return;
          }
          
          // Check if Pelagus extension is installed but not initialized
          const extensionPresent = document.documentElement.getAttribute('data-pelagus-extension') === 'true';
          console.log('Pelagus extension present:', extensionPresent);
          
          if (extensionPresent) {
            setError('Pelagus extension detected but not initialized. Please reload the page or check extension permissions.');
          } else {
            setError('Please install the Pelagus extension for Firefox and reload the page');
            // Open Pelagus download page in new tab
            window.open('https://pelagus.space/download', '_blank');
          }
        } else {
          setError('Please install the Pelagus wallet extension');
        }
        return;
      }

      try {
        // Check accounts without prompting
        const accounts = await window.pelagus.request({ 
          method: 'eth_accounts'
        }).catch(err => {
          console.log('eth_accounts request failed:', err);
          return [];
        });

        const isConnected = Array.isArray(accounts) && accounts.length > 0;
        
        if (isConnected) {
          // Check network when already connected
          try {
            await checkAndSwitchNetwork();
          } catch (err) {
            console.error('Network check failed:', err);
            setError(err.message);
            setIsConnected(false);
            setAccount(null);
            return;
          }
        }

        setIsConnected(isConnected);
        
        if (isConnected && accounts[0]) {
          setAccount(accounts[0]);
          // Only load contract data if we have an account
          await loadContractData().catch(err => {
            console.error('Failed to load initial contract data:', err);
          });
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

    // Add event listeners and return cleanup function
    if (window.pelagus) {
      // Setup account change handling
      const onAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          loadContractData();
        } else {
          setIsConnected(false);
          setAccount(null);
          setError(null);
        }
      };

      // Setup chain change handling
      const onChainChanged = () => {
        window.location.reload();
      };

      // Setup disconnect handling
      const onDisconnect = () => {
        setIsConnected(false);
        setAccount(null);
        setError(null);
      };

      // Add listeners
      window.pelagus.on('accountsChanged', onAccountsChanged);
      window.pelagus.on('chainChanged', onChainChanged);
      window.pelagus.on('disconnect', onDisconnect);

      // Return cleanup function
      return function cleanup() {
        window.pelagus.removeListener('accountsChanged', onAccountsChanged);
        window.pelagus.removeListener('chainChanged', onChainChanged);
        window.pelagus.removeListener('disconnect', onDisconnect);
      };
    }

    // Return empty cleanup if no pelagus
    return () => {};
  }, []);

  const checkAndSwitchNetwork = async () => {
    const chainId = await window.pelagus.request({ method: 'eth_chainId' });
    if (chainId !== '0x2330') {
      try {
        await window.pelagus.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2330' }], // Cyprus-1
        });
      } catch (error) {
        throw new Error('Please connect to Cyprus-1 network in Pelagus');
      }
    }
  };

  const connectWallet = async () => {
    try {
      // Check for supported browsers
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      
      if (!isChrome && !isFirefox) {
        setError("Please use Chrome or Firefox to connect Pelagus wallet");
        return;
      }
      
      if (typeof window === 'undefined' || !window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      try {
        // Check and switch to Cyprus-1 network
        await checkAndSwitchNetwork();

        const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          setError(null);
          await loadContractData();
        }
      } catch (err) {
        console.error('Connection error:', err);
        if (err.code === 4001) {
          throw new Error("Please approve the connection request in Pelagus");
        }
        if (err.code === -32002) {
          throw new Error("Connection request already pending. Please check Pelagus extension.");
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

      if (!window.pelagus) {
        throw new Error("Please install Pelagus wallet");
      }

      if (!account) {
        throw new Error("Please connect your wallet first");
      }

      // Ensure we're on Cyprus-1 network
      await checkAndSwitchNetwork();

      // Initialize provider and signer
      const provider = new quais.BrowserProvider(window.pelagus, undefined, { usePathing: true });
      const signer = await provider.getSigner();

      // Contract ABI for mint function
      const contractABI = ["function mint() public payable"];
      
      // Create contract instance
      const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, contractABI, signer);

      try {
        // Call mint function with 1 QUAI value
        const tx = await contract.mint({
          value: quais.parseEther("1.0") // 1 QUAI
        });

        console.log('Mint transaction sent:', tx.hash);
        
        // Wait for transaction to be mined
        await tx.wait();
        console.log('Mint transaction confirmed');

        // Refresh data
        await loadContractData();
        return tx.hash;
      } catch (error) {
        if (error.code === 'ACTION_REJECTED') {
          throw new Error('Transaction cancelled by user');
        }
        throw error;
      }

    } catch (err) {
      console.error("Error minting NFT:", err);
      if (err.code === 4001) {
        setError('Transaction cancelled. Please try again.');
      } else {
        setError(err.message || 'Failed to mint NFT. Please ensure you have 1 QUAI plus gas fees and are connected to Cyprus-1 network.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to get owned NFTs
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  
  const loadOwnedNFTs = async () => {
    if (!account) return;
    
    try {
      // Get total mints for the wallet
      const mintsResult = await readContract('0x8b7ada50', [account], false);
      const totalMints = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;
      
      // Fetch each NFT's metadata
      const nfts = [];
      for (let i = 1; i <= totalMints; i++) {
        try {
          const response = await fetch(`/assets/json/${i}`);
          if (response.ok) {
            const metadata = await response.json();
            nfts.push({
              id: i,
              ...metadata
            });
          }
        } catch (err) {
          console.error(`Error loading NFT #${i} metadata:`, err);
        }
      }
      
      setOwnedNFTs(nfts);
    } catch (err) {
      console.error("Error loading owned NFTs:", err);
    }
  };

  // Load NFTs when account changes
  useEffect(() => {
    if (account) {
      loadOwnedNFTs();
    } else {
      setOwnedNFTs([]);
    }
  }, [account]);

  // Reload NFTs after successful mint
  useEffect(() => {
    if (!loading && account) {
      loadOwnedNFTs();
    }
  }, [loading]);

  return (
    <Box sx={{ maxWidth: '400px', mx: 'auto' }}>
      <Stack spacing={3} alignItems="center">
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

        {/* Display owned NFTs */}
        {ownedNFTs.length > 0 && (
          <Box sx={{ width: '100%', mt: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1rem',
                color: '#00ff9d',
                mb: 2,
                textAlign: 'center'
              }}
            >
              Your Croak City NFTs
            </Typography>
            <Stack spacing={2}>
              {ownedNFTs.map((nft) => (
                <Box
                  key={nft.id}
                  sx={{
                    border: '1px solid #00ff9d',
                    borderRadius: '8px',
                    p: 2,
                    backgroundColor: 'rgba(0, 255, 157, 0.1)'
                  }}
                >
                  <Stack spacing={1}>
                    <Typography sx={{ color: '#fff' }}>
                      {nft.name}
                    </Typography>
                    {nft.image && (
                      <Box
                        component="img"
                        src={nft.image}
                        alt={nft.name}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '4px'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {nft.attributes?.map((attr, index) => (
                      <Typography 
                        key={index}
                        sx={{ 
                          color: '#00ff9d',
                          fontSize: '0.9rem'
                        }}
                      >
                        {attr.trait_type}: {attr.value}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

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
      {/* Contract Information */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#00ff9d' }}>
          Contract Address:{' '}
          <Link
            href={`https://cyprus1.testnet.quaiscan.io/address/${NFT_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#00ff9d', textDecorationColor: '#00ff9d' }}
          >
            {NFT_CONTRACT_ADDRESS}
          </Link>
        </Typography>
        <Typography variant="body2" sx={{ color: '#00ff9d', mt: 1 }}>
          Total Minted: {totalSupply} / {maxSupply}
        </Typography>
      </Box>
    </Box>
  );
};

export default NFTMint;