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

// Helper function to check Chrome browser
const isChromeBrowser = () => {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
};

// Helper function to get provider
const getProvider = async () => {
  try {
    if (typeof window === 'undefined') {
      throw new Error("Browser environment not detected");
    }

    if (!isChromeBrowser()) {
      throw new Error("Please use Google Chrome to interact with Pelagus wallet");
    }

    // Check Pelagus initialization
    const isPelagusReady = await waitForPelagus();
    if (!isPelagusReady) {
      throw new Error("Please install Pelagus wallet extension from https://pelagus.space/download");
    }

    // Request account access if needed
    const accounts = await window.pelagus.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      await window.pelagus.request({ method: 'eth_requestAccounts' });
    }

    // Verify network
    const chainId = await window.pelagus.request({ method: 'eth_chainId' });
    if (chainId !== '0x2330') {
      throw new Error("Please connect to Cyprus-1 network in Pelagus");
    }

    return window.pelagus;
  } catch (error) {
    console.error('Error initializing provider:', error);
    throw new Error(error.message || 'Failed to initialize Pelagus provider');
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

  // Contract helper functions for view functions
  const readContract = async (functionSelector, params = [], retry = true) => {
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

      // Get the current account if available
      let from;
      try {
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        if (accounts?.length > 0) {
          from = accounts[0];
        }
      } catch (e) {
        console.log('Failed to get current account:', e);
      }

      // Call params for view function
      const callParams = {
        to: NFT_CONTRACT_ADDRESS,
        data,
      };
      if (from) {
        callParams.from = from;
      }

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
          // If it's a user rejection and we're not retrying, break immediately
          if (err.code === 4001 && !retry) break;
          // Otherwise continue to next method
        }
      }

      // If we got here, all methods failed
      if (lastError?.code === 4001) {
        console.log('All methods failed with user rejection');
        // For view functions, continue with default values instead of throwing
        return null;
      }

      throw lastError || new Error('All RPC methods failed');
    } catch (error) {
      console.error('Contract call error:', error);
      // For view functions, we'll use default values instead of throwing
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

      // Get all contract data in parallel
      const [totalSupplyResult, maxSupplyResult, mintsResult] = await Promise.all([
        readContract("0x18160ddd"),
        readContract("0xd5abeb01"),
        readContract("0x8b7ada50", [currentAccount])
      ]);

      // Parse results with default values
      const total = totalSupplyResult ? parseInt(totalSupplyResult.slice(2), 16) : 0;
      console.log("Total supply:", total);

      const max = maxSupplyResult ? parseInt(maxSupplyResult.slice(2), 16) : 420;
      console.log("Max supply:", max);

      const mintsCount = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;
      console.log("Current mints for wallet:", mintsCount);

      // Calculate states
      const hasUsedFree = mintsCount > 0;
      const canMint = mintsCount < 20;
      const shouldBeFree = !hasUsedFree;

      console.log("Mint status:", {
        hasUsedFree,
        canMint,
        shouldBeFree,
        mintsCount
      });

      // Update all states
      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(shouldBeFree);

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
        console.log('Connection status:', { isConnected, accounts });

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
        // Check network and request account access
        const chainId = await window.pelagus.request({ method: 'eth_chainId' });
        console.log('Connected to chain:', chainId);
        
        // Cyprus-1 chainId is 0x2330
        if (chainId !== '0x2330') {
          throw new Error('Please connect to Cyprus-1 network in Pelagus');
        }

        const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0]);
          setError(null); // Clear any previous errors
          // Load contract data after successful connection
          await loadContractData();
        }
      } catch (err) {
        console.error('Connection error:', err);
        if (err.code === 4001) {
          // User rejected the connection request
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

      // Basic environment checks
      if (!MINTING_ENABLED) {
        throw new Error("Minting is not yet enabled");
      }

      if (!isChromeBrowser()) {
        throw new Error("Please use Google Chrome to mint NFTs");
      }

      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet extension");
      }

      // Check network first
      const chainId = await window.pelagus.request({ method: 'eth_chainId' });
      if (chainId !== '0x2330') {
        throw new Error("Please connect to Cyprus-1 network in Pelagus");
      }

      // Get current account
      const accounts = await window.pelagus.request({ 
        method: 'eth_accounts' 
      }).catch(() => []);

      if (!accounts || accounts.length === 0) {
        throw new Error("Please connect your Pelagus wallet");
      }
      const currentAccount = accounts[0];

      // Check contract status
      const [totalSupply, maxSupply] = await Promise.all([
        readContract("0x18160ddd"),
        readContract("0xd5abeb01")
      ]);

      const currentSupply = parseInt(totalSupply?.slice(2) || '0', 16);
      const supplyLimit = parseInt(maxSupply?.slice(2) || '0', 16);

      if (currentSupply >= supplyLimit) {
        throw new Error(`All ${supplyLimit} NFTs have been minted`);
      }

      // Debug Pelagus state
      const debugState = {
        chainId: await window.pelagus.request({ method: 'eth_chainId' }).catch(e => e.message),
        balance: await window.pelagus.request({ 
          method: 'eth_getBalance',
          params: [currentAccount, 'latest']
        }).catch(e => e.message)
      };
      console.log('Pelagus debug state:', debugState);

      // Check current mints without requiring approval
      console.log('Checking current mints...');
      const mintsResult = await readContract('0x8b7ada50', [currentAccount], false);
      const currentMints = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;
      console.log('Current mints:', currentMints);

      if (currentMints >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Determine if this should be a free mint
      const shouldBeFree = currentMints === 0;
      console.log('Should be free mint:', shouldBeFree);

      // Prepare transaction
      console.log('Preparing mint transaction...');
      
      try {
        // Check balance first
        const balance = await window.pelagus.request({
          method: 'eth_getBalance',
          params: [currentAccount, 'latest']
        });
        
        const balanceInWei = BigInt(balance);
        console.log('Current balance (wei):', balanceInWei.toString());

        // Get gas price with debug
        console.log('Requesting gas price...');
        const gasPrice = await window.pelagus.request({
          method: 'eth_gasPrice',
          params: []
        }).catch(e => {
          console.error('Gas price request failed:', e);
          throw e;
        });
        console.log('Current gas price:', {
          hex: gasPrice,
          decimal: parseInt(gasPrice, 16),
          gwei: parseInt(gasPrice, 16) / 1e9
        });

        // Create base parameters for estimation with debug
        console.log('Creating transaction parameters. Free mint:', shouldBeFree);
        const value = shouldBeFree ? '0x0' : '0xDE0B6B3A7640000';
        console.log('Transaction value:', {
          hex: value,
          decimal: parseInt(value || '0', 16),
          quai: parseInt(value || '0', 16) / 1e18
        });

        const baseParams = {
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          data: '0x1249c58b', // mint()
          value,
          gasPrice
        };
        
        console.log('Base transaction parameters:', {
          ...baseParams,
          fromAccount: currentAccount,
          contractAddress: NFT_CONTRACT_ADDRESS,
          valueInQuai: parseInt(value, 16) / 1e18,
          gasPriceGwei: parseInt(gasPrice, 16) / 1e9
        });

        // Log the transaction we're going to estimate
        console.log('Estimating gas for transaction:', {
          ...baseParams,
          shouldBeFree,
          gasPriceGwei: BigInt(gasPrice) / BigInt(1e9)
        });

        // Estimate gas with complete parameters
        const gasEstimate = await window.pelagus.request({
          method: 'eth_estimateGas',
          params: [baseParams]
        }).catch(error => {
          console.error('Gas estimation failed:', error);
          // Use a higher default for safety
          return '0x2DC6C0'; // 3,000,000 gas
        });
        console.log('Gas estimate:', gasEstimate, '(', parseInt(gasEstimate, 16), ' units)');

        // Calculate total cost
        const gasCost = BigInt(gasEstimate) * BigInt(gasPrice);
        const mintCost = shouldBeFree ? BigInt(0) : BigInt('1000000000000000000'); // 0 or 1 QUAI
        const totalCost = gasCost + mintCost;

        console.log('Cost breakdown:', {
          gasCost: gasCost.toString(),
          mintCost: mintCost.toString(),
          totalCost: totalCost.toString(),
          balance: balanceInWei.toString()
        });

        // Check if user has enough balance
        if (balanceInWei < totalCost) {
          const requiredQuai = Number(totalCost) / 1e18;
          throw new Error(
            shouldBeFree
              ? `Insufficient balance for gas fees. You need at least ${requiredQuai.toFixed(4)} QUAI.`
              : `Insufficient balance. You need ${requiredQuai.toFixed(4)} QUAI (1 QUAI + gas fees).`
          );
        }

        // Add 10% to gas estimate for safety
        const safeGasEstimate = BigInt(gasEstimate) * BigInt(11) / BigInt(10);
        
        // Prepare final transaction parameters
        const mintParams = {
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          data: '0x1249c58b', // mint()
          value: shouldBeFree ? '0x0' : '0xDE0B6B3A7640000', // 0 or 1 QUAI
          gasPrice: gasPrice,
          gas: '0x' + safeGasEstimate.toString(16) // Convert back to hex with 10% buffer
        };

        // Log details for debugging
        console.log('Final transaction parameters:', {
          ...mintParams,
          shouldBeFree,
          estimatedGasCost: (BigInt(gasEstimate) * BigInt(gasPrice) / BigInt(1e18)).toString() + ' QUAI',
          totalValue: shouldBeFree ? '0' : '1 QUAI',
          gasLimit: parseInt(mintParams.gas, 16).toString() + ' units'
        });

        // Send the transaction
        console.log('Sending transaction...');
        const txHash = await window.pelagus.request({
          method: 'eth_sendTransaction',
          params: [mintParams]
        });

        if (!txHash) {
          throw new Error('No transaction hash received');
        }

        console.log('Transaction sent successfully, hash:', txHash);
        return txHash;

      } catch (err) {
        // Log the complete error for debugging
        console.error('Transaction error details:', {
          code: err.code,
          message: err.message,
          data: err.data,
          stack: err.stack
        });
        
        // Calculate actual gas cost in QUAI for better error messages
        const estimatedGasCost = gasCost ? (gasCost / BigInt(1e18)).toString() : '0.0012';
        
        if (err.code === 4001) {
          // User rejected the transaction
          const message = shouldBeFree
            ? `Please note: This is a free mint - you only need to pay gas fees (approximately ${estimatedGasCost} QUAI).`
            : `Please note: The mint costs 1 QUAI plus gas fees (approximately ${estimatedGasCost} QUAI).`;
            
          throw new Error(`Transaction cancelled. ${message} Please try again.`);
        }
        
        if (err.message && err.message.toLowerCase().includes('insufficient')) {
          // Insufficient balance error
          const requiredTotal = shouldBeFree 
            ? estimatedGasCost
            : (BigInt(1e18) + gasCost) / BigInt(1e18);
            
          throw new Error(
            `Insufficient balance. You need ${requiredTotal} QUAI ${shouldBeFree ? 'for gas fees' : 'total (1 QUAI + gas fees)'}.`
          );
        }
        
        // For other errors, provide context about the attempted operation
        throw new Error(
          `Failed to ${shouldBeFree ? 'process free mint' : 'mint NFT'}: ${err.message || 'Unknown error'}. ` +
          'Please ensure you have enough QUAI and are connected to Cyprus-1 network.'
        );
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
    <Box sx={{ maxWidth: '400px', mx: 'auto', p: 3 }}>
      <Stack spacing={3} alignItems="center">
        {/* Title and Status */}
        <Stack spacing={1} alignItems="center" width="100%">
          <Typography 
            variant="h5" 
            sx={{ 
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#00ff9d',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textAlign: 'center',
            }}
          >
            MINT YOUR CROAK CITY NFT
          </Typography>
          
          {/* Supply Status */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#00ff9d',
              textAlign: 'center',
              opacity: 0.8
            }}
          >
            {totalSupply} / {maxSupply} Minted
          </Typography>

          {/* Mint Price Info */}
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#00ff9d',
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          >
            {hasFreeMint ? '🎁 First Mint FREE!' : '1 QUAI + Gas'}
          </Typography>
          
          {/* Connection Status */}
          {isConnected ? (
            <Typography
              variant="body2"
              sx={{
                color: '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <span style={{ fontSize: '1.2em' }}>✓</span> Connected to Pelagus
            </Typography>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: '#FFA726',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <span style={{ fontSize: '1.2em' }}>⚠</span> Please connect wallet
            </Typography>
          )}
          
          {/* Error Display */}
          {error && (
            <Typography
              variant="body2"
              sx={{
                color: '#f44336',
                textAlign: 'center',
                mt: 1,
                padding: '8px',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                borderRadius: '4px',
                width: '100%'
              }}
            >
              {error}
            </Typography>
          )}
        </Stack>

        {/* Action Buttons */}
        <Stack spacing={2} width="100%">
          {!isConnected ? (
            <Button
              variant="contained"
              onClick={connectWallet}
              disabled={loading}
              sx={{
                backgroundColor: '#00ff9d',
                color: 'black',
                '&:hover': {
                  backgroundColor: '#00cc7d'
                }
              }}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={mintNFT}
              disabled={loading || !MINTING_ENABLED}
              sx={{
                backgroundColor: hasFreeMint ? '#00ff9d' : '#2196f3',
                color: 'black',
                '&:hover': {
                  backgroundColor: hasFreeMint ? '#00cc7d' : '#1976d2'
                }
              }}
            >
              {loading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Minting...</span>
                </Stack>
              ) : (
                hasFreeMint ? 'Mint FREE NFT' : 'Mint NFT (1 QUAI)'
              )}
            </Button>
          )}
        </Stack>

        {/* Display owned NFTs */}
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
    </Box>
  );
};

export default NFTMint;