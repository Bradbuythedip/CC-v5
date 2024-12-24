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

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || null;
const MINTING_ENABLED = NFT_CONTRACT_ADDRESS !== null;
const NFT_ABI = [
  "function mint() public payable",
  "function totalSupply() public view returns (uint256)",
  "function maxSupply() public view returns (uint256)",
  "function hasFreeMint(address) public view returns (bool)",
];

const NFTMint = () => {
  const [loading, setLoading] = useState(false);
  const [mintAmount, setMintAmount] = useState(1);
  const [totalSupply, setTotalSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(1000);
  const [hasFreeMint, setHasFreeMint] = useState(true);
  const [error, setError] = useState(null);

  const handleMintChange = (event, newValue) => {
    setMintAmount(newValue);
  };


  useEffect(() => {
    const loadContractData = async () => {
      if (!MINTING_ENABLED) {
        setError("Minting is not yet enabled");
        return;
      }

      try {
        if (typeof window.pelagus !== 'undefined') {
          const provider = new quais.providers.Web3Provider(window.pelagus);
          const signer = provider.getSigner();
          const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

          const total = await contract.totalSupply();
          const max = await contract.maxSupply();
          const account = await signer.getAddress();
          const freeRemaining = await contract.hasFreeMint(account);

          setTotalSupply(total.toNumber());
          setMaxSupply(max.toNumber());
          setHasFreeMint(!freeRemaining);
        }
      } catch (err) {
        console.error("Error loading contract data:", err);
        setError("Error loading contract data");
      }
    };

    loadContractData();
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

      const provider = new quais.providers.Web3Provider(window.pelagus);
      const signer = provider.getSigner();
      const contract = new quais.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

      const mintTx = await contract.mint({
        value: hasFreeMint ? quais.utils.parseEther("5") : 0
      });

      await mintTx.wait();
      
      // Refresh data
      const total = await contract.totalSupply();
      setTotalSupply(total.toNumber());
      
      const account = await signer.getAddress();
      const freeRemaining = await contract.hasFreeMint(account);
      setHasFreeMint(!freeRemaining);
      
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
          ) : typeof window.pelagus === 'undefined' ? (
            'Install Pelagus Wallet'
          ) : (
            'Mint Now'
          )}
        </Button>
      </Stack>
    </Box>
  );
};

export default NFTMint;