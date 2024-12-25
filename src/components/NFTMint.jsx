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

  // Function to check if Pelagus is properly initialized
  const isPelagusReady = () => {
    return window.pelagus && typeof window.pelagus.request === 'function';
  };

  useEffect(() => {
    let mounted = true;
    let initializeTimer = null;
    let checkCount = 0;

    // Function to periodically check for Pelagus
    const checkForPelagus = () => {
      if (!mounted) return;
      
      checkCount++;
      console.log(`Checking for Pelagus... Attempt ${checkCount}`);
      
      if (isPelagusReady()) {
        console.log('Pelagus detected, initializing...');
        clearInterval(initializeTimer);
        init();
      } else if (checkCount >= 20) { // Stop checking after 20 attempts
        console.log('Stopped checking for Pelagus after 20 attempts');
        clearInterval(initializeTimer);
        if (mounted) {
          setError('Please refresh the page if Pelagus is installed, or install Pelagus wallet extension');
        }
      }
    };

    const init = async () => {
      try {
        // Enhanced Pelagus detection
        console.log('Checking Pelagus availability:', {
          windowPelagus: !!window.pelagus,
          isPelagusObject: window.pelagus && typeof window.pelagus === 'object',
          hasRequest: window.pelagus && typeof window.pelagus.request === 'function',
          methods: window.pelagus ? Object.keys(window.pelagus) : []
        });

        // Give Pelagus time to initialize
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
          if (window.pelagus && typeof window.pelagus.request === 'function') {
            break;
          }
          console.log(`Waiting for Pelagus to initialize... Attempt ${i + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!window.pelagus || typeof window.pelagus.request !== 'function') {
          console.log('Pelagus not properly initialized after waiting');
          if (mounted) {
            setIsConnected(false);
            setAccount(null);
            setError('Please refresh the page if Pelagus is installed, or install Pelagus wallet extension');
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

    // Start periodic checks for Pelagus
    if (isPelagusReady()) {
      console.log('Pelagus already available, initializing...');
      init();
    } else {
      console.log('Starting periodic checks for Pelagus...');
      initializeTimer = setInterval(checkForPelagus, 500);
      checkForPelagus(); // Run first check immediately
    }

    if (isPelagusReady()) {
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

      const onChainChanged = async (newChainId) => {
        if (!mounted) return;
        
        console.log('Chain changed to:', newChainId);

        try {
          // Normalize chain ID
          let chainId = newChainId;
          if (typeof chainId === 'number') {
            chainId = '0x' + chainId.toString(16);
          }
          chainId = chainId.toLowerCase();

          // Enhanced chain detection
          const isCyprus1 = 
            chainId === '0x2328' || // Hex with prefix
            chainId === '2328' ||   // Hex without prefix
            chainId === '9000' ||   // Decimal representation
            chainId === 9000;

          console.log('Chain change detection:', {
            chainId,
            isCyprus1,
            rawChainId: newChainId
          });

          // Verify RPC connection
          let rpcWorking = false;
          try {
            const block = await window.pelagus.request({
              method: 'eth_getBlockByNumber',
              params: ['latest', false]
            });
            rpcWorking = !!block;
            console.log('RPC check on chain change:', { blockNumber: block?.number, rpcWorking });
          } catch (error) {
            console.error('RPC check failed on chain change:', error);
          }

          if (!isCyprus1 || !rpcWorking) {
            console.log('Wrong network detected:', chainId);
            setError('Please switch to Cyprus-1 network in Pelagus');
            setIsConnected(false);
            setAccount(null);
            
            // Try to switch back to Cyprus-1
            try {
              // Define network config
              const CYPRUS_1 = {
                chainName: 'Cyprus-1',
                chainId: '0x2330',
                nativeCurrency: {
                  name: 'QUAI',
                  symbol: 'QUAI',
                  decimals: 18
                },
                rpcUrls: ['https://rpc.quai.network/cyprus1'],
                blockExplorerUrls: ['https://cyprus1.quaiscan.io']
              };

              // Try to add the network first
              await window.pelagus.request({
                method: 'wallet_addEthereumChain',
                params: [CYPRUS_1]
              });

              // Wait a bit for the network to be added
              await new Promise(resolve => setTimeout(resolve, 1000));

              // Then try to switch to it
              await window.pelagus.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CYPRUS_1.chainId }]
              });

              // Wait for the switch to complete
              await new Promise(resolve => setTimeout(resolve, 1000));

              // Verify RPC connection
              await window.pelagus.request({
                method: 'eth_getBlockByNumber',
                params: ['latest', false]
              });

              console.log('Successfully switched back to Cyprus-1');
              
              // Don't update state here - let the chainChanged event handle it
            } catch (err) {
              console.error('Failed to switch back to Cyprus-1:', err);
              if (err.code === 4902) {
                setError('Please add Cyprus-1 network in Pelagus manually:\nName: Cyprus-1\nRPC URL: https://rpc.quai.network/cyprus1\nChain ID: 0x2328 (9000)\nSymbol: QUAI\nDecimals: 18');
              } else {
                setError('Please switch to Cyprus-1 network in Pelagus manually');
              }
            }
            return;
          }

          // On correct network, check account and reload data
          const accounts = await window.pelagus.request({ method: 'eth_accounts' });
          if (accounts?.length) {
            console.log('Reloading with account:', accounts[0]);
            setIsConnected(true);
            setAccount(accounts[0]);
            setError(null);
            
            // Reload contract data
            await loadContractData().catch(err => {
              console.error('Failed to load contract data on chain change:', err);
              setError('Failed to load contract data. Please refresh the page.');
            });
          } else {
            setIsConnected(false);
            setAccount(null);
            setError('Please connect your wallet');
          }
        } catch (err) {
          console.error('Error handling chain change:', err);
          setError('Network change failed. Please refresh the page.');
          setIsConnected(false);
          setAccount(null);
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
      if (initializeTimer) {
        clearInterval(initializeTimer);
      }
    };
  }, []);

  const connectWallet = async () => {
    try {
      // Enhanced Pelagus detection
      console.log('Checking Pelagus on connect:', {
        windowExists: typeof window !== 'undefined',
        pelagusDefined: typeof window !== 'undefined' && !!window.pelagus,
        hasRequest: typeof window !== 'undefined' && window.pelagus && typeof window.pelagus.request === 'function'
      });

      // Wait for Pelagus to be ready
      const maxWaitAttempts = 5;
      for (let i = 0; i < maxWaitAttempts; i++) {
        if (window.pelagus && typeof window.pelagus.request === 'function') {
          break;
        }
        console.log(`Waiting for Pelagus on connect... Attempt ${i + 1}/${maxWaitAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!window.pelagus || typeof window.pelagus.request !== 'function') {
        console.log('Pelagus not available:', window.pelagus);
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please refresh the page if Pelagus is installed, or install Pelagus wallet");
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

      // Get initial connection info with enhanced chain detection
      let chainId;
      try {
        // Get chain ID and normalize it to hex
        chainId = await window.pelagus.request({ method: 'eth_chainId' });
        console.log('Raw chain ID:', chainId);
        
        // Convert number to hex if needed
        if (typeof chainId === 'number') {
          chainId = '0x' + chainId.toString(16);
        }
        // Ensure lowercase for comparison
        chainId = chainId.toLowerCase();
        
        // Also try to get the network name for debugging
        const provider = window.pelagus.getProvider?.() || window.pelagus;
        console.log('Provider info:', {
          chainId,
          networkVersion: provider.networkVersion,
          selectedAddress: provider.selectedAddress,
          isConnected: provider.isConnected?.()
        });

      } catch (err) {
        console.error('Failed to get chain ID:', err);
        throw new Error('Unable to detect network. Please check Pelagus connection.');
      }

      // Setup Cyprus-1 network configuration
      const CYPRUS_1 = {
        chainName: 'Cyprus-1',
        chainId: '0x2328', // Chain ID 9000 in hex
        nativeCurrency: {
          name: 'QUAI',
          symbol: 'QUAI',
          decimals: 18
        },
        rpcUrls: ['https://rpc.quai.network/cyprus1'],
        blockExplorerUrls: ['https://cyprus1.quaiscan.io']
      };

      // Enhanced chain detection
      const isCyprus1 = 
        chainId.toLowerCase() === '0x2328' || // Hex with prefix
        chainId.toLowerCase() === '2328' ||   // Hex without prefix
        chainId === '9000' ||                 // Decimal representation
        chainId === 9000;

      console.log('Chain detection:', {
        chainId,
        isCyprus1,
        expectedChainId: CYPRUS_1.chainId
      });

      // Verify RPC connection regardless of chain ID
      try {
        const block = await window.pelagus.request({
          method: 'eth_getBlockByNumber',
          params: ['latest', false]
        });
        console.log('RPC connection verified, latest block:', block?.number);
      } catch (rpcError) {
        console.error('RPC check failed:', rpcError);
        // Don't throw here, continue with chain ID check
      }

      // If not on Cyprus-1, attempt to add/switch to it
      if (!isCyprus1) {
        console.log('Not on Cyprus-1, attempting to configure network...');
        
        try {
          console.log('Attempting to add Cyprus-1 network...');
          // Always try to add the network first
          await window.pelagus.request({
            method: 'wallet_addEthereumChain',
            params: [CYPRUS_1]
          });
          
          // Wait a bit for the network to be added
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Then try to switch to it
          await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CYPRUS_1.chainId }]
          });
          
          // Wait for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify the switch
          const newChainId = await window.pelagus.request({ method: 'eth_chainId' });
          console.log('Current chain after switch attempt:', newChainId);
          
          if (newChainId !== '0x2330') {
            console.error('Network switch verification failed');
            throw new Error('Network switch failed verification');
          }
          
          console.log('Successfully switched to Cyprus-1');
          
          // Verify RPC connection
          try {
            await window.pelagus.request({
              method: 'eth_getBlockByNumber',
              params: ['latest', false]
            });
            console.log('RPC connection verified');
          } catch (rpcError) {
            console.error('RPC connection failed:', rpcError);
            throw new Error('Failed to connect to Cyprus-1 RPC');
          }
          
        } catch (error) {
          console.error('Network configuration failed:', error);
          
          if (error.code === 4001) {
            throw new Error('Please approve the network switch in Pelagus');
          } else if (error.code === 4902) {
            throw new Error('Please add Cyprus-1 network in Pelagus manually:\nName: Cyprus-1\nRPC URL: https://rpc.quai.network/cyprus1\nChain ID: 0x2328 (9000)\nSymbol: QUAI\nDecimals: 18');
          } else if (error.message?.includes('RPC')) {
            throw new Error('Unable to connect to Cyprus-1. Please check your internet connection and try again.');
          } else {
            throw new Error('Please switch to Cyprus-1 network in Pelagus manually');
          }
        }
      }

      // Final verification with enhanced detection
      try {
        let finalChainId = await window.pelagus.request({ method: 'eth_chainId' });
        if (typeof finalChainId === 'number') {
          finalChainId = '0x' + finalChainId.toString(16);
        }
        finalChainId = finalChainId.toLowerCase();

        const finalIsCyprus1 = 
          finalChainId === '0x2328' || // Hex with prefix
          finalChainId === '2328' ||   // Hex without prefix
          finalChainId === '9000' ||   // Decimal representation
          finalChainId === 9000;

        console.log('Final chain verification:', {
          chainId: finalChainId,
          isCyprus1: finalIsCyprus1
        });

        if (!finalIsCyprus1) {
          throw new Error('Not connected to Cyprus-1 network. Please verify your network settings.');
        }

        // Final RPC check
        const block = await window.pelagus.request({
          method: 'eth_getBlockByNumber',
          params: ['latest', false]
        });

        if (!block) {
          throw new Error('Unable to connect to Cyprus-1 RPC. Please check your connection.');
        }

        console.log('Connection fully verified:', {
          chainId: finalChainId,
          blockNumber: block.number
        });
      } catch (error) {
        console.error('Final verification failed:', error);
        throw new Error('Failed to verify Cyprus-1 connection: ' + error.message);
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