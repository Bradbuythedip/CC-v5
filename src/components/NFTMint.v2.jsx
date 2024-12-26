import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Grid,
  Paper
} from '@mui/material';
import { useQuaiProvider } from '../hooks/useQuaiProvider';
import { useNFTContract } from '../hooks/useNFTContract';

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;

export default function NFTMint() {
  const [minting, setMinting] = useState(false);
  const [txError, setTxError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const {
    provider,
    signer,
    account,
    error: walletError,
    isConnecting,
    connectWallet
  } = useQuaiProvider();

  const {
    mintInfo,
    isOwner,
    error: contractError,
    loading: contractLoading,
    mint,
    toggleMinting,
    refreshData
  } = useNFTContract(signer, provider, account);

  const handleMint = async () => {
    try {
      setMinting(true);
      setTxError(null);
      setTxHash(null);

      console.log('Starting mint process...');
      const receipt = await mint();
      console.log('Mint transaction receipt:', receipt);
      
      if (receipt?.hash) {
        setTxHash(receipt.hash);
        console.log('Refreshing data after successful mint...');
        await refreshData();
      } else {
        console.error('Missing transaction hash in receipt:', receipt);
        throw new Error('Transaction failed - missing hash');
      }

    } catch (err) {
      console.error('Minting error:', err);
      console.dir(err); // Detailed error logging
      
      // Handle different error types
      let errorMessage = 'Failed to mint NFT';
      
      if (err?.code === 4001) {
        errorMessage = 'You rejected the transaction';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.data) {
        try {
          const decodedError = quais.utils.toUtf8String(err.data);
          errorMessage = `Minting failed: ${decodedError}`;
        } catch (decodeError) {
          console.error('Error decoding data:', decodeError);
        }
      }
      
      setTxError(errorMessage);
    } finally {
      setMinting(false);
    }
  };

  const handleToggleMinting = async (enable) => {
    try {
      await toggleMinting(enable);
    } catch (err) {
      console.error('Toggle minting error:', err);
    }
  };

  if (!NFT_CONTRACT_ADDRESS) {
    return (
      <Alert severity="error">
        NFT contract address not configured. Please check your environment variables.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Croak City NFT Mint
      </Typography>

      {/* Connection Status */}
      {!account ? (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <CircularProgress size={24} sx={{ mr: 1 }} />
            ) : null}
            Connect Wallet
          </Button>
          {walletError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {walletError}
            </Typography>
          )}
        </Box>
      ) : null}

      {/* Mint Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              Total Minted
            </Typography>
            <Typography variant="h4">
              {mintInfo.totalSupply}/{mintInfo.maxSupply}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              Your Mints
            </Typography>
            <Typography variant="h4">
              {mintInfo.mintsPerWallet}/20
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              Mint Price
            </Typography>
            <Typography variant="h4">
              {mintInfo.hasFreeMint ? "FREE" : "1 QUAI"}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Minting Controls */}
      <Stack spacing={2} sx={{ maxWidth: 'sm', mx: 'auto' }}>
        {account && (
          <Button
            variant="contained"
            onClick={handleMint}
            disabled={
              minting ||
              contractLoading ||
              !mintInfo.mintingEnabled ||
              mintInfo.totalSupply >= mintInfo.maxSupply ||
              mintInfo.mintsPerWallet >= 20
            }
            sx={{ py: 2 }}
          >
            {minting ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Minting...
              </>
            ) : (
              'Mint NFT'
            )}
          </Button>
        )}

        {/* Owner Controls */}
        {isOwner && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Owner Controls
            </Typography>
            <Button
              variant="outlined"
              onClick={() => handleToggleMinting(!mintInfo.mintingEnabled)}
              disabled={contractLoading}
            >
              {mintInfo.mintingEnabled ? 'Disable Minting' : 'Enable Minting'}
            </Button>
          </Box>
        )}

        {/* Status Messages */}
        {txHash && (
          <Alert severity="success">
            Mint successful! Transaction: {txHash}
          </Alert>
        )}

        {txError && (
          <Alert severity="error">
            {txError}
          </Alert>
        )}

        {contractError && (
          <Alert severity="error">
            {contractError}
          </Alert>
        )}

        {mintInfo.totalSupply >= mintInfo.maxSupply && (
          <Alert severity="info">
            All NFTs have been minted!
          </Alert>
        )}

        {mintInfo.mintsPerWallet >= 20 && (
          <Alert severity="info">
            You've reached your maximum mint limit (20)
          </Alert>
        )}
      </Stack>
    </Box>
  );
}