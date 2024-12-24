import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Slider,
  CircularProgress,
  Stack,
} from '@mui/material';
import { quais } from 'quais';

// Helper function to get provider
const getProvider = async () => {
  if (typeof window.pelagus !== 'undefined') {
    // Request account access
    await window.pelagus.send('eth_requestAccounts');
    return new quais.providers.Web3Provider(window.pelagus, "any");
  }
  throw new Error("Pelagus wallet not found");
};

const NFT_CONTRACT_ADDRESS = "0x002Bd6201a1421e7c998566650d161a8f5047d7a";
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


  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window.pelagus !== 'undefined') {
          const accounts = await window.pelagus.send('eth_accounts');
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

    const loadContractData = async () => {
      if (!MINTING_ENABLED) {
        setError("Minting is not yet enabled");
        return;
      }

      try {
        const provider = await getProvider();
        const signer = provider.getSigner();
        const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

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
      
      if (typeof window.pelagus !== 'undefined') {
        await window.pelagus.send('eth_requestAccounts');
      } else {
        window.open('https://pelagus.space/download', '_blank');
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Error connecting wallet");
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
      const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

      const mintTx = await contract.mint({
        value: hasFreeMint ? 0 : quais.utils.parseEther("1")
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