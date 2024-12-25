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

// Log environment variables for debugging
console.log('Environment Debug Info:', {
  NFT_ADDRESS: import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
  RPC_URL: import.meta.env.VITE_QUAI_RPC_URL,
  CHAIN_ID: import.meta.env.VITE_QUAI_CHAIN_ID,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  ALL_ENV: import.meta.env
});

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
if (!NFT_CONTRACT_ADDRESS) {
  console.error('Contract address not configured in environment variables');
}
const MINTING_ENABLED = NFT_CONTRACT_ADDRESS !== null && NFT_CONTRACT_ADDRESS !== undefined;

// Contract ABI just for the functions we need
const CONTRACT_ABI = [
  "function mint() payable",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintsPerWallet(address) view returns (uint256)",
  "function hasUsedFreeMint(address) view returns (bool)",
  "function mintingEnabled() view returns (bool)",
  "function owner() view returns (address)",
  "function setMintingEnabled(bool enabled) external"
];

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
    chainId: 9000, // Cyprus-1 chain ID (not hex)
    url: import.meta.env.VITE_QUAI_RPC_URL || 'https://rpc.quai.network',
    networkId: 9000
  };

  // Function to get contract instance
  const getContract = async () => {
    if (!NFT_CONTRACT_ADDRESS) {
      throw new Error('Contract address is not configured');
    }

    const accounts = await getConnectedAccounts();
    if (!accounts?.length) {
      throw new Error('No connected account');
    }

    // Create Pelagus provider
    const provider = new quais.JsonRpcProvider(
      CHAIN_CONFIG.url,
      CHAIN_CONFIG.chainId,
      { usePathing: true }
    );

    // Create signer
    const signer = new quais.VoidSigner(accounts[0], provider);

    // Create contract instance
    const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log('Contract instance created:', {
      address: contract.address,
      signer: await signer.getAddress()
    });

    return contract;
  };

  // Function to check contract read data
  const readContract = async (methodName, params = []) => {
    try {
      // First verify network
      const networkInfo = await window.pelagus.request({
        method: 'quai_getNetwork'
      });
      console.log('Current network:', networkInfo);

      // Get zone information
      const zoneInfo = await window.pelagus.request({
        method: 'quai_getZone'
      });
      console.log('Current zone:', zoneInfo);

      // Get contract instance
      const contract = await getContract();
      console.log(`Calling ${methodName} with params:`, params);
      
      // Call the contract method
      const result = await contract[methodName](...params);
      console.log(`${methodName} result:`, result);

      return result;
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

  // State for transaction status and minting control
  const [txStatus, setTxStatus] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isMintingEnabled, setIsMintingEnabled] = useState(false);

  // Function to check if connected wallet is contract owner
  const checkOwnership = async () => {
    try {
      const contract = await getContract();
      const accounts = await getConnectedAccounts();
      if (!accounts?.length) return false;

      const owner = await contract.owner();
      const isOwner = owner.toLowerCase() === accounts[0].toLowerCase();
      console.log('Contract ownership:', { owner, currentAccount: accounts[0], isOwner });
      setIsOwner(isOwner);
      return isOwner;
    } catch (error) {
      console.error('Error checking ownership:', error);
      return false;
    }
  };

  // Function to enable/disable minting (owner only)
  const toggleMinting = async (enable) => {
    try {
      setLoading(true);
      setError(null);
      setTxStatus(enable ? 'Enabling minting...' : 'Disabling minting...');

      const contract = await getContract();
      if (!await checkOwnership()) {
        throw new Error('Only the contract owner can enable/disable minting');
      }

      const tx = await contract.setMintingEnabled(enable);
      setTxStatus('Waiting for confirmation...');
      
      await tx.wait();
      console.log(`Minting has been ${enable ? 'enabled' : 'disabled'}`);
      setTxStatus(`Minting has been ${enable ? 'enabled' : 'disabled'}`);
      setIsMintingEnabled(enable);
      
    } catch (error) {
      console.error('Failed to toggle minting:', error);
      setError(error.message || `Failed to ${enable ? 'enable' : 'disable'} minting`);
    } finally {
      setLoading(false);
    }
  };

  // Mint function
  const mintNFT = async () => {
    try {
      setLoading(true);
      setError(null);
      setTxStatus('Initializing mint...');
      setShowRetry(false);

      // Get contract instance
      const contract = await getContract();
      console.log('Got contract instance:', contract.address);

      // Check if minting is enabled
      const isMintingEnabled = await contract.mintingEnabled();
      console.log('Minting enabled:', isMintingEnabled);
      if (!isMintingEnabled) {
        throw new Error('Minting is not yet enabled by the contract owner');
      }

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

      // Prepare transaction options
      const overrides = {
        gasLimit: "0x2DC6C0", // 3,000,000 gas
        maxFeePerGas: quais.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: quais.parseUnits('20', 'gwei')
      };

      // Add value if not a free mint
      if (hasUsedFreeMint) {
        overrides.value = quais.parseEther('1.0');
      }

      console.log('Preparing mint transaction with overrides:', overrides);

      // Execute mint transaction through contract
      setTxStatus('Waiting for wallet confirmation...');
      const transaction = await contract.mint(overrides);

      console.log('Mint transaction sent:', transaction.hash);

      setTxStatus('Transaction submitted, waiting for confirmation...');
      
      // Wait for transaction confirmation
      try {
        const receipt = await transaction.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        setTxStatus('Transaction confirmed!');
      } catch (error) {
        console.warn('Error waiting for transaction confirmation:', error);
        setTxStatus('Transaction submitted but confirmation failed. Please check your wallet for status.');
      }

      setLoading(false);
      return transaction.hash;

    } catch (err) {
      console.error("Error minting NFT:", err);
      setLoading(false);
      
      if (err.code === 4001) {
        // User rejected transaction
        setTxStatus('Transaction rejected');
        setError('You rejected the transaction. Click "Mint NFT" to try again.');
        setShowRetry(true);
      } else if (err.message?.includes('insufficient funds')) {
        setTxStatus('Transaction failed');
        setError('Insufficient funds to complete the transaction.');
        setShowRetry(true);
      } else if (err.message?.includes('gas required exceeds allowance')) {
        setTxStatus('Transaction failed');
        setError('Gas estimation failed. The transaction might fail or the contract could be paused.');
        setShowRetry(true);
      } else {
        setTxStatus('Transaction failed');
        setError(err.message || "Failed to mint NFT. Please try again.");
        setShowRetry(true);
      }
    }
  };

  // Connect to Quai network Cyprus-1 zone
  const connectToQuaiChain = async () => {
    try {
      // First check if Pelagus is available
      if (!window.pelagus) {
        throw new Error("Please install Pelagus wallet");
      }

      // Get network information
      const networkInfo = await window.pelagus.request({
        method: 'quai_getNetwork'
      });
      console.log('Current network:', networkInfo);

      // Check network ID
      const expectedChainId = '9000'; // Cyprus-1 chain ID
      if (networkInfo?.chainId !== expectedChainId) {
        console.log('Wrong network, requesting switch...');
        // Request switch to Cyprus-1
        await window.pelagus.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }]
        });
      }

      // Get zone information
      const zoneInfo = await window.pelagus.request({
        method: 'quai_getZone'
      });
      console.log('Zone info:', zoneInfo);

      // Check if we're on Cyprus-1
      if (!zoneInfo || !zoneInfo.toLowerCase().includes('cyprus')) {
        throw new Error("Please switch to Cyprus-1 zone in Pelagus");
      }

      // Request account access
      const accounts = await window.pelagus.request({
        method: 'quai_requestAccounts'
      });
      console.log('Connected accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      // Verify the account is a Cyprus-1 address
      const currentAccount = accounts[0];
      if (!currentAccount.toLowerCase().startsWith('0x00')) {
        throw new Error("Please use a Cyprus-1 address (starting with 0x00)");
      }

      return true;
    } catch (error) {
      console.error('Chain check failed:', error);
      throw error;
    }
  };

  // Verify contract address is valid for the zone
  const verifyContractAddress = async () => {
    try {
      const code = await window.pelagus.request({
        method: 'quai_getCode',
        params: [NFT_CONTRACT_ADDRESS, 'latest']
      });
      
      if (!code || code === '0x') {
        throw new Error(`No contract found at address ${NFT_CONTRACT_ADDRESS}`);
      }
      console.log('Contract verified at:', NFT_CONTRACT_ADDRESS);
      return true;
    } catch (error) {
      console.error('Contract verification failed:', error);
      return false;
    }
  };

  // Initialize connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if Pelagus is available
        if (!window.pelagus) {
          setError("Please install Pelagus wallet");
          return;
        }

        // Request accounts
        const accounts = await window.pelagus.request({
          method: 'quai_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
          setError("Please connect your wallet");
          return;
        }

        // Get current network
        const networkInfo = await window.pelagus.request({
          method: 'quai_getNetwork'
        });
        console.log('Current network:', networkInfo);

        // Verify we're on Cyprus-1
        if (networkInfo?.chainId !== '9000') {
          setError("Please switch to Cyprus-1 network in Pelagus");
          return;
        }

        // Get zone information
        const zoneInfo = await window.pelagus.request({
          method: 'quai_getZone'
        });
        console.log('Current zone:', zoneInfo);

        if (!zoneInfo?.toLowerCase().includes('cyprus')) {
          setError("Please switch to Cyprus-1 zone in Pelagus");
          return;
        }

        // Update connection state
        setIsConnected(true);
        setAccount(accounts[0]);
        setError(null);

        // Initialize contract
        try {
          const contract = await getContract();
          const mintingEnabled = await contract.mintingEnabled();
          setIsMintingEnabled(mintingEnabled);
          console.log('Minting status:', mintingEnabled);

          await checkOwnership();
          await loadContractData();
        } catch (contractError) {
          console.error('Contract initialization error:', contractError);
          setError('Failed to initialize contract. Please check your connection.');
        }
      } catch (err) {
        console.error("Connection check failed:", err);
        if (err.code === 4001) {
          setError("Please authorize wallet connection");
        } else {
          setError(err.message || "Failed to connect to network");
        }
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

        {isConnected && isOwner && (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ my: 2 }}>
            <Button
              variant="contained"
              onClick={() => toggleMinting(true)}
              disabled={loading || isMintingEnabled}
              sx={{
                background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                color: 'white',
                '&:disabled': {
                  background: '#cccccc'
                }
              }}
            >
              Enable Minting
            </Button>
            <Button
              variant="contained"
              onClick={() => toggleMinting(false)}
              disabled={loading || !isMintingEnabled}
              sx={{
                background: 'linear-gradient(45deg, #f44336 30%, #e53935 90%)',
                color: 'white',
                '&:disabled': {
                  background: '#cccccc'
                }
              }}
            >
              Disable Minting
            </Button>
          </Stack>
        )}

        {isConnected && (
          <>
            <Typography variant="h6" gutterBottom>
              {hasFreeMint ? 'You have a free mint available!' : 'Mint Cost: 1 QUAI'}
            </Typography>
            
            <Stack spacing={2} alignItems="center">
              {txStatus && (
                <Typography variant="body2" color="text.secondary">
                  {txStatus}
                </Typography>
              )}
              
              {loading ? (
                <CircularProgress />
              ) : (
                <Button
                  variant="contained"
                  onClick={mintNFT}
                  disabled={loading}
                  sx={{
                    background: showRetry 
                      ? 'linear-gradient(45deg, #ff9d00 30%, #cc7d00 90%)'
                      : 'linear-gradient(45deg, #00ff9d 30%, #00cc7d 90%)',
                    borderRadius: 8,
                    border: 0,
                    color: 'white',
                    height: 48,
                    padding: '0 30px',
                    boxShadow: '0 3px 5px 2px rgba(0, 255, 157, .3)',
                    '&:hover': {
                      background: showRetry
                        ? 'linear-gradient(45deg, #cc7d00 30%, #ff9d00 90%)'
                        : 'linear-gradient(45deg, #00cc7d 30%, #00ff9d 90%)',
                    },
                  }}
                >
                  {loading ? 'Minting...' : (showRetry ? 'Retry Mint' : 'Mint NFT')}
                </Button>
              )}
            </Stack>
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