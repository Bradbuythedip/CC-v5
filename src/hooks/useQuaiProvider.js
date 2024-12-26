import { useState, useEffect } from 'react';
import { quais } from 'quais';

// Helper function to detect Pelagus
const detectPelagus = () => {
  if (typeof window === 'undefined') return false;
  return window.pelagus !== undefined && window.pelagus !== null;
};

// Helper function to check chain
const checkChain = async (provider) => {
  try {
    if (!provider) return false;
    const network = await provider.getNetwork();
    return network?.chainId.toString() === '9000'; // Cyprus-1 chain ID
  } catch (error) {
    console.error('Chain check error:', error);
    return false;
  }
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
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error('Please install Pelagus wallet');
      }

      console.log('Requesting accounts from Pelagus...');
      let accounts;
      try {
        accounts = await window.pelagus.request({
          method: 'quai_requestAccounts'
        });
        console.log('Accounts received:', accounts);
      } catch (error) {
        console.error('Account request error:', error);
        if (error.code === 4001) {
          throw new Error('You rejected the connection request');
        }
        throw new Error(error.message || 'Failed to get accounts');
      }

      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      const currentAccount = accounts[0];
      console.log('Selected account:', currentAccount);

      // Verify account zone
      try {
        const zone = await window.pelagus.request({
          method: 'quai_getZone'
        });
        console.log('Current zone:', zone);

        if (!zone?.toLowerCase().includes('cyprus')) {
          throw new Error('Please switch to Cyprus-1 zone in Pelagus');
        }
      } catch (error) {
        console.error('Zone check error:', error);
        throw new Error('Failed to verify zone. Please make sure you are on Cyprus-1');
      }

      // Setup provider using Pelagus
      console.log('Setting up provider with Pelagus...');
      try {
        // First check network
        const network = await window.pelagus.request({
          method: 'quai_getNetwork'
        });
        console.log('Network info:', network);

        if (network?.chainId !== CHAIN_CONFIG.chainId) {
          await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainId }]
          });
        }

        // Create provider
        const quaiProvider = new quais.Web3Provider(window.pelagus, {
          name: CHAIN_CONFIG.name,
          chainId: parseInt(CHAIN_CONFIG.chainId)
        });

        // Get signer
        const quaiSigner = quaiProvider.getSigner();
        
        setProvider(quaiProvider);
        setSigner(quaiSigner);
        setAccount(currentAccount);

        console.log('Wallet connection complete');
        return true;

      } catch (error) {
        console.error('Provider setup error:', error);
        if (error.code === 4001) {
          throw new Error('You rejected the network switch request');
        }
        throw new Error(error.message || 'Failed to setup wallet connection');
      }

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

  // Handle Pelagus connection and events
  useEffect(() => {
    if (!window.pelagus) return;

    const checkConnection = async () => {
      try {
        // First check if we have permission to access accounts
        const accounts = await window.pelagus.request({
          method: 'quai_accounts'
        });
        console.log('Checking existing connection:', accounts);
        
        if (accounts?.length) {
          // Verify zone
          const zone = await window.pelagus.request({
            method: 'quai_getZone'
          });
          console.log('Current zone:', zone);

          if (zone?.toLowerCase().includes('cyprus')) {
            // Verify network
            const network = await window.pelagus.request({
              method: 'quai_getNetwork'
            });
            console.log('Current network:', network);

            if (network?.chainId === CHAIN_CONFIG.chainId) {
              await connectWallet();
            } else {
              console.log('Wrong network - not connecting');
            }
          } else {
            console.log('Not on Cyprus-1 zone - not connecting');
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        if (error.code !== 4001) {  // Don't log user rejections
          console.dir(error);
        }
      }
    };

    const handleAccountsChanged = async (accounts) => {
      console.log('Accounts changed:', accounts);
      
      if (!accounts.length) {
        console.log('No accounts - disconnecting');
        setAccount(null);
        setSigner(null);
        setProvider(null);
        return;
      }

      try {
        // Check zone when accounts change
        const zone = await window.pelagus.request({
          method: 'quai_getZone'
        });
        console.log('Zone for new account:', zone);

        if (zone?.toLowerCase().includes('cyprus')) {
          // Check network
          const network = await window.pelagus.request({
            method: 'quai_getNetwork'
          });
          console.log('Network for new account:', network);

          if (network?.chainId === CHAIN_CONFIG.chainId && accounts[0] !== account) {
            console.log('Valid account on correct network - reconnecting');
            await connectWallet();
          } else {
            console.log('Wrong network - disconnecting');
            setAccount(null);
            setSigner(null);
            setProvider(null);
          }
        } else {
          console.log('Not on Cyprus-1 zone - disconnecting');
          setAccount(null);
          setSigner(null);
          setProvider(null);
        }
      } catch (error) {
        console.error('Error handling account change:', error);
        setAccount(null);
        setSigner(null);
        setProvider(null);
      }
    };

    const handleChainChanged = async (chainId) => {
      console.log('Chain changed:', chainId);
      try {
        if (chainId === CHAIN_CONFIG.chainId) {
          const zone = await window.pelagus.request({
            method: 'quai_getZone'
          });
          if (zone?.toLowerCase().includes('cyprus')) {
            console.log('Correct chain and zone - reconnecting');
            await connectWallet();
            return;
          }
        }
        console.log('Invalid chain or zone - disconnecting');
        setAccount(null);
        setSigner(null);
        setProvider(null);
      } catch (error) {
        console.error('Error handling chain change:', error);
        setAccount(null);
        setSigner(null);
        setProvider(null);
      }
    };

    // Setup event listeners
    window.pelagus.on('accountsChanged', handleAccountsChanged);
    window.pelagus.on('chainChanged', handleChainChanged);

    // Check for existing connection
    checkConnection();

    // Cleanup listeners
    return () => {
      if (window.pelagus) {
        window.pelagus.removeListener('accountsChanged', handleAccountsChanged);
        window.pelagus.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  return {
    provider,
    signer,
    account,
    error,
    isConnecting,
    connectWallet
  };
}