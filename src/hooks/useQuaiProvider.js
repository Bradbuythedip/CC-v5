import { useState, useEffect } from 'react';
import { quais } from 'quais';

// Helper function to detect Pelagus
const detectPelagus = () => {
  if (typeof window === 'undefined') return false;
  return window.pelagus !== undefined && window.pelagus !== null;
};

// Helper function to get zone from address
const getAddressInfo = (address) => {
  try {
    const zone = quais.getZoneFromAddress(address);
    return {
      address,
      zone,
      isCyprus: zone?.toLowerCase().includes('cyprus')
    };
  } catch (error) {
    console.error('Error getting zone from address:', error);
    return { address, zone: null, isCyprus: false };
  }
};

export function useQuaiProvider() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPelagusDetected, setIsPelagusDetected] = useState(false);

  const CHAIN_CONFIG = {
    chainId: '9000',
    rpcUrl: import.meta.env.VITE_QUAI_RPC_URL || 'https://rpc.cyprus1.colosseum.quai.network',
    name: 'Cyprus 1'
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      console.log('Checking for Pelagus wallet...');
      const isPelagus = detectPelagus();
      setIsPelagusDetected(isPelagus);

      if (!isPelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error('Please install Pelagus wallet');
      }

      console.log('Pelagus detected, requesting accounts...');
      let accounts;
      try {
        accounts = await window.pelagus.request({
          method: 'quai_requestAccounts'
        });
      } catch (accountError) {
        console.error('Account request error:', accountError);
        if (accountError.code === 4001) {
          throw new Error('You rejected the connection request');
        }
        throw new Error('Failed to get accounts');
      }

      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      console.log('Accounts received:', accounts);
      const currentAccount = accounts[0];
      const addressInfo = getAddressInfo(currentAccount);
      
      console.log('Address info:', addressInfo);
      if (!addressInfo.isCyprus) {
        throw new Error('Please switch to a Cyprus-1 address (starting with 0x00)');
      }

      // Setup provider
      console.log('Setting up provider...');
      const quaiProvider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl, {
        name: CHAIN_CONFIG.name,
        chainId: parseInt(CHAIN_CONFIG.chainId)
      });

      // Get network to verify connection
      try {
        const network = await quaiProvider.getNetwork();
        console.log('Connected to network:', network);
        
        if (network.chainId.toString() !== CHAIN_CONFIG.chainId) {
          throw new Error(`Please connect to ${CHAIN_CONFIG.name}`);
        }
      } catch (networkError) {
        console.error('Network error:', networkError);
        throw new Error('Failed to connect to network');
      }

      setProvider(quaiProvider);
      setAccount(currentAccount);

      // Setup signer if needed for transactions
      if (window.pelagus.getSigner) {
        try {
          const quaiSigner = await window.pelagus.getSigner();
          setSigner(quaiSigner);
          console.log('Signer setup complete');
        } catch (signerError) {
          console.error('Signer setup error:', signerError);
          // Don't throw here - we can still proceed with read-only operations
        }
      }

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

  // Check for Pelagus on mount
  useEffect(() => {
    setIsPelagusDetected(detectPelagus());
  }, []);

  // Handle existing connection and events
  useEffect(() => {
    if (!isPelagusDetected) return;

    const checkConnection = async () => {
      try {
        const accounts = await window.pelagus.request({ method: 'quai_accounts' });
        console.log('Checking existing connection:', accounts);
        
        if (accounts?.length) {
          const addressInfo = getAddressInfo(accounts[0]);
          if (addressInfo.isCyprus) {
            connectWallet();
          } else {
            console.log('Existing account is not on Cyprus-1');
          }
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    };

    const handleAccountsChanged = async (accounts) => {
      console.log('Accounts changed:', accounts);
      
      if (!accounts.length) {
        console.log('No accounts - disconnecting');
        setAccount(null);
        setSigner(null);
        return;
      }

      const addressInfo = getAddressInfo(accounts[0]);
      console.log('New account info:', addressInfo);

      if (addressInfo.isCyprus && accounts[0] !== account) {
        console.log('Valid Cyprus-1 account - reconnecting');
        await connectWallet();
      } else {
        console.log('Invalid account - disconnecting');
        setAccount(null);
        setSigner(null);
      }
    };

    const handleChainChanged = () => {
      console.log('Chain changed - reloading page');
      window.location.reload();
    };

    // Check for existing connection
    checkConnection();

    // Setup event listeners
    window.pelagus.on('accountsChanged', handleAccountsChanged);
    window.pelagus.on('chainChanged', handleChainChanged);

    // Cleanup
    return () => {
      window.pelagus.removeListener('accountsChanged', handleAccountsChanged);
      window.pelagus.removeListener('chainChanged', handleChainChanged);
    };
  }, [isPelagusDetected, account]);

  return {
    provider,
    signer,
    account,
    error,
    isConnecting,
    connectWallet
  };
}