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

// Helper function to handle errors
const handleError = (error, context = '') => {
  // Start a new console group for this error
  console.group(`Error in ${context}`);
  console.error('Error object:', error);
  console.log('Error type:', typeof error);
  
  // Log error properties if it's an object
  if (error && typeof error === 'object') {
    console.log('Error properties:', Object.keys(error));
    console.log('Error structure:', {
      code: error?.code,
      message: error?.message,
      data: error?.data,
      error: error?.error,
      reason: error?.reason
    });
  }
  
  // Helper function to extract error message
  const getMessage = () => {
    // Handle null/undefined
    if (!error) return 'Unknown error occurred';
    
    // Handle string errors
    if (typeof error === 'string') return error;
    
    // Handle Error instances
    if (error instanceof Error) return error.message;
    
    // Handle objects
    if (typeof error === 'object') {
      // Check for user rejection
      if (error.code === 4001) return 'You rejected the request';
      
      // Check for nested error
      if (error.error?.message) return error.error.message;
      
      // Check for standard message
      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('user rejected')) return 'You rejected the request';
        if (msg.includes('network')) return 'Network connection failed';
        return error.message;
      }
      
      // Check for error data
      if (error.data) {
        try {
          return quais.utils.toUtf8String(error.data);
        } catch (e) {
          console.error('Error decoding data:', e);
        }
      }
      
      // Check for reason
      if (error.reason) return error.reason;
      
      // Try toString if it's meaningful
      if (typeof error.toString === 'function') {
        const str = error.toString();
        if (str !== '[object Object]') return str;
      }
    }
    
    return 'An unexpected error occurred';
  };
  
  const message = getMessage();
  console.log('Final error message:', message);
  console.groupEnd();
  
  return message;
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
      const errorMessage = handleError(err, 'Wallet Connection');
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
      console.group('Account Change Event');
      console.log('New accounts:', accounts);
      console.log('Current account:', account);
      
      try {
        if (!accounts?.length) {
          console.log('No accounts - disconnecting');
          setAccount(null);
          setSigner(null);
          setProvider(null);
          console.groupEnd();
          return;
        }

        const newAccount = accounts[0];
        console.log('Selected account:', newAccount);

        // Only continue if it's a Cyprus-1 address
        if (newAccount.toLowerCase().startsWith('0x00')) {
          // Check network if we have a provider
          if (provider) {
            try {
              console.log('Checking network with existing provider...');
              const network = await provider.getNetwork();
              console.log('Network info:', network);

              if (network.chainId.toString() === CHAIN_CONFIG.chainId) {
                console.log('Valid network - reconnecting wallet');
                await connectWallet();
                console.groupEnd();
                return;
              }
              console.log('Wrong network detected');
            } catch (networkError) {
              handleError(networkError, 'Network Check');
            }
          }

          // No valid provider or wrong network - try full reconnect
          console.log('Attempting full reconnect...');
          await connectWallet();
          
        } else {
          console.log('Account is not a Cyprus-1 address - disconnecting');
          setAccount(null);
          setSigner(null);
          setProvider(null);
        }
      } catch (error) {
        handleError(error, 'Account Change Handler');
        // Clear connection state on error
        setAccount(null);
        setSigner(null);
        setProvider(null);
      }
      console.groupEnd();
    };

    const handleChainChanged = async (chainId) => {
      console.group('Chain Change Event');
      console.log('New chain ID:', chainId);
      console.log('Current account:', account);
      
      try {
        const isCorrectChain = chainId.toString() === CHAIN_CONFIG.chainId;
        const hasValidAccount = account?.toLowerCase().startsWith('0x00');
        
        console.log('Chain validation:', {
          isCorrectChain,
          hasValidAccount,
          expectedChain: CHAIN_CONFIG.chainId,
          currentAccount: account
        });

        if (isCorrectChain && hasValidAccount) {
          console.log('Valid chain and account - reconnecting');
          await connectWallet();
        } else {
          console.log('Invalid chain or account - disconnecting');
          setAccount(null);
          setSigner(null);
          setProvider(null);
        }
      } catch (error) {
        handleError(error, 'Chain Change Handler');
        // Clear connection state on error
        setAccount(null);
        setSigner(null);
        setProvider(null);
      }
      console.groupEnd();
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