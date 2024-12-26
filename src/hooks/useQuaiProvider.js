import { useState, useEffect } from 'react';
import { quais } from 'quais';

export function useQuaiProvider() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const CHAIN_CONFIG = {
    chainId: '9000',
    rpcUrl: import.meta.env.VITE_QUAI_RPC_URL || 'https://rpc.cyprus1.colosseum.quai.network'
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Debug: Log initial connection attempt
      console.log('Attempting to connect wallet...');

      // Check for Pelagus
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error('Please install Pelagus wallet');
      }

      // Debug: Log Pelagus check
      console.log('Pelagus detected, checking network...');

      try {
        // Check network
        const network = await window.pelagus.request({ method: 'quai_getNetwork' });
        console.log('Network info:', network);

        if (network?.chainId !== CHAIN_CONFIG.chainId) {
          console.log('Switching to Cyprus-1 network...');
          await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainId }]
          });
        }

        // Get zone info
        const zone = await window.pelagus.request({ method: 'quai_getZone' });
        console.log('Zone info:', zone);

        if (!zone?.toLowerCase().includes('cyprus')) {
          throw new Error('Please switch to Cyprus-1 zone in Pelagus');
        }

        // Get accounts
        console.log('Requesting accounts...');
        const accounts = await window.pelagus.request({ method: 'quai_requestAccounts' });
        console.log('Accounts received:', accounts);

        if (!accounts?.length) {
          throw new Error('No accounts found');
        }

        const currentAccount = accounts[0];
        if (!currentAccount.toLowerCase().startsWith('0x00')) {
          throw new Error('Please use a Cyprus-1 address (starting with 0x00)');
        }

        // Setup provider and signer
        console.log('Setting up provider and signer...');
        const quaiProvider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl, {
          name: 'Cyprus 1',
          chainId: parseInt(CHAIN_CONFIG.chainId),
        });

        const quaiSigner = await window.pelagus.getSigner();
        console.log('Provider and signer setup complete');

        setProvider(quaiProvider);
        setSigner(quaiSigner);
        setAccount(currentAccount);
        return true;

      } catch (networkError) {
        console.error('Network setup error:', networkError);
        // Handle network-specific errors
        if (networkError?.code === 4001) {
          throw new Error('You rejected the network switch request');
        } else if (networkError?.message) {
          throw new Error(networkError.message);
        } else {
          throw new Error('Failed to setup network connection');
        }
      }

    } catch (err) {
      console.error('Wallet connection error:', err);
      console.dir(err); // Detailed error logging
      
      // Handle different error types
      let errorMessage = 'Failed to connect wallet';
      
      if (err?.code === 4001) {
        errorMessage = 'You rejected the connection request';
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.data) {
        try {
          const decodedError = quais.utils.toUtf8String(err.data);
          errorMessage = decodedError;
        } catch (decodeError) {
          console.error('Error decoding data:', decodeError);
        }
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    // Check for existing connection
    const checkConnection = async () => {
      if (window.pelagus) {
        const accounts = await window.pelagus.request({ method: 'quai_accounts' });
        if (accounts?.length) {
          connectWallet();
        }
      }
    };

    checkConnection();

    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setSigner(null);
      } else {
        const newAccount = accounts[0];
        if (newAccount !== account) {
          connectWallet();
        }
      }
    };

    if (window.pelagus) {
      window.pelagus.on('accountsChanged', handleAccountsChanged);
      window.pelagus.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.pelagus) {
        window.pelagus.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  return {
    provider,
    signer,
    account,
    error,
    isConnecting,
    connectWallet
  };
}