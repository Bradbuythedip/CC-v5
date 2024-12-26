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
        // Use the standard eth_requestAccounts method
        accounts = await window.pelagus.request({
          method: 'eth_requestAccounts'
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

      // Create provider
      console.log('Setting up provider with Pelagus...');
      try {
        const quaiProvider = new quais.Web3Provider(window.pelagus);
        console.log('Provider created:', quaiProvider);

        // Verify network
        const network = await quaiProvider.getNetwork();
        console.log('Network info:', network);

        if (network.chainId.toString() !== CHAIN_CONFIG.chainId) {
          try {
            // Try to switch network
            await window.pelagus.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CHAIN_CONFIG.chainId }]
            });
          } catch (switchError) {
            console.error('Network switch error:', switchError);
            throw new Error('Please switch to Cyprus-1 network in Pelagus');
          }
        }

        // Get signer
        const quaiSigner = quaiProvider.getSigner();
        console.log('Signer created');

        // Verify the zone by checking the address prefix
        if (!currentAccount.toLowerCase().startsWith('0x00')) {
          throw new Error('Please switch to a Cyprus-1 address (starting with 0x00)');
        }
        
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
        // Check if we already have access to accounts
        const accounts = await window.pelagus.request({
          method: 'eth_accounts'
        });
        console.log('Checking existing connection:', accounts);
        
        if (accounts?.length) {
          const currentAccount = accounts[0];
          
          // Check if it's a Cyprus-1 address
          if (currentAccount.toLowerCase().startsWith('0x00')) {
            try {
              // Create provider to check network
              const provider = new quais.Web3Provider(window.pelagus);
              const network = await provider.getNetwork();
              
              if (network.chainId.toString() === CHAIN_CONFIG.chainId) {
                console.log('Valid existing connection found');
                await connectWallet();
              } else {
                console.log('Wrong network for existing connection');
              }
            } catch (error) {
              console.error('Error checking existing connection:', error);
            }
          } else {
            console.log('Existing account is not a Cyprus-1 address');
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        console.dir(error);
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

      const newAccount = accounts[0];
      console.log('New account:', newAccount);

      // Only continue if it's a Cyprus-1 address
      if (newAccount.toLowerCase().startsWith('0x00')) {
        try {
          // Check network with provider
          if (provider) {
            const network = await provider.getNetwork();
            if (network.chainId.toString() === CHAIN_CONFIG.chainId) {
              console.log('Valid account on correct network - reconnecting');
              await connectWallet();
              return;
            }
          }
          console.log('Network check failed - attempting reconnect');
          await connectWallet();
        } catch (error) {
          console.error('Error handling account change:', error);
          setAccount(null);
          setSigner(null);
          setProvider(null);
        }
      } else {
        console.log('New account is not a Cyprus-1 address - disconnecting');
        setAccount(null);
        setSigner(null);
        setProvider(null);
      }
    };

    const handleChainChanged = async (chainId) => {
      console.log('Chain changed:', chainId);
      if (chainId.toString() === CHAIN_CONFIG.chainId) {
        // Only reconnect if we have a Cyprus-1 address
        if (account?.toLowerCase().startsWith('0x00')) {
          console.log('Correct chain detected - reconnecting');
          await connectWallet();
        }
      } else {
        console.log('Wrong chain detected - disconnecting');
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