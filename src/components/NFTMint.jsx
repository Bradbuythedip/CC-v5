import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';

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

const NFT_CONTRACT_ADDRESS = "0x0062481f93e27cdb73ce0fa173c3251dffe40127";
const MINTING_ENABLED = NFT_CONTRACT_ADDRESS !== null;

const NFTMint = () => {
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(420);
  const [hasFreeMint, setHasFreeMint] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);

  // Function to check contract read data
  const readContract = async (functionSelector, params = []) => {
    try {
      const accounts = await getConnectedAccounts();
      if (!accounts?.length) return null;

      const data = functionSelector + (params.length > 0 
        ? params.map(p => p.replace('0x', '').toLowerCase().padStart(64, '0')).join('')
        : '');

      const result = await window.pelagus.request({
        method: 'quai_call',
        params: [{
          to: NFT_CONTRACT_ADDRESS,
          data,
          from: accounts[0]
        }, 'latest']
      });

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
      const [totalSupplyResult, maxSupplyResult, mintsResult] = await Promise.all([
        readContract("0x18160ddd"),
        readContract("0xd5abeb01"),
        readContract("0x8b7ada50", [accounts[0]])
      ]);

      // Parse results
      const total = totalSupplyResult ? parseInt(totalSupplyResult.slice(2), 16) : 0;
      const max = maxSupplyResult ? parseInt(maxSupplyResult.slice(2), 16) : 420;
      const mintsCount = mintsResult ? parseInt(mintsResult.slice(2), 16) : 0;

      console.log("Contract data:", { total, max, mintsCount });

      // Update state
      setTotalSupply(total);
      setMaxSupply(max);
      setHasFreeMint(mintsCount === 0);
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
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error("Please install Pelagus wallet");
      }

      const accounts = await requestAccounts();
      
      if (accounts?.length) {
        const currentAccount = accounts[0];
        console.log('Connected to account:', currentAccount);

        setIsConnected(true);
        setAccount(currentAccount);
        setError(null);
        await loadContractData();
      }
    } catch (err) {
      console.error("Connection error:", err);
      if (err.code !== 4001) { // Don't show error for user rejection
        setError(err.message || "Failed to connect wallet");
      }
      setIsConnected(false);
      setAccount(null);
    }
  };

  // Mint function
  const mintNFT = async () => {
    try {
      setLoading(true);
      setError(null);

      const accounts = await getConnectedAccounts();
      if (!accounts?.length) {
        throw new Error("Please connect your wallet first");
      }

      const currentAccount = accounts[0];
      console.log('Minting with account:', currentAccount);

      // Check current mints
      const mintsResult = await readContract('0x8b7ada50', [currentAccount]);
      if (!mintsResult) {
        throw new Error("Unable to verify mint eligibility");
      }

      const currentMints = parseInt(mintsResult.slice(2), 16);
      if (currentMints >= 20) {
        throw new Error('You have reached the maximum number of mints (20) per wallet');
      }

      // Prepare transaction
      const shouldBeFree = currentMints === 0;
      const mintValue = shouldBeFree ? '0x0' : '0xde0b6b3a7640000'; // 0 or 1 QUAI

      console.log('Preparing mint transaction:', {
        from: currentAccount,
        to: NFT_CONTRACT_ADDRESS,
        shouldBeFree,
        mintValue
      });

      // Execute mint transaction using Quai method
      const txHash = await window.pelagus.request({
        method: 'quai_sendTransaction',
        params: [{
          from: currentAccount,
          to: NFT_CONTRACT_ADDRESS,
          value: mintValue,
          data: '0x1249c58b' // mint()
        }]
      }).catch(error => {
        if (error.code === 4001) {
          console.log('User rejected transaction');
          throw error;
        }
        throw new Error('Failed to send transaction: ' + error.message);
      });

      console.log('Mint transaction sent:', txHash);
      setLoading(false);
      return txHash;

    } catch (err) {
      console.error("Error minting NFT:", err);
      if (err.code !== 4001) { // Don't show error for user rejection
        setError(err.message || "Failed to mint NFT");
      }
      setLoading(false);
      throw err;
    }
  };

  // Initialize connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const accounts = await getConnectedAccounts();
        if (accounts?.length) {
          setIsConnected(true);
          setAccount(accounts[0]);
          await loadContractData();
        }
      } catch (err) {
        console.error("Connection check failed:", err);
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

      window.pelagus.on('chainChanged', () => {
        window.location.reload();
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