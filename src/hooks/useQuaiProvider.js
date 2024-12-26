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
        // Request accounts using proper method
        accounts = await window.pelagus
          .request({ 
            method: 'quai_requestAccounts'
          })
          .then((result) => {
            console.log('Account request successful:', result);
            return result;
          })
          .catch((error) => {
            console.error('Account request error:', error);
            if (error.code === 4001) {
              throw new Error('You rejected the connection request');
            }
            throw error;
          });
      } catch (error) {
        console.error('Account request failed:', error);
        // Handle specific error codes
        if (error.code === 4001) {
          throw new Error('You rejected the connection request');
        } else if (error.code === -32002) {
          throw new Error('Request already pending. Please check your wallet');
        } else if (error.code === -32603) {
          throw new Error('Error connecting to wallet. Please try again');
        }
        throw new Error(error.message || 'Failed to connect wallet');
      }

      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      const currentAccount = accounts[0];
      console.log('Selected account:', currentAccount);

      // Get zone information using quais SDK
      const zone = quais.getZoneFromAddress(currentAccount);
      console.log('Zone info:', zone);

      if (!zone?.toLowerCase().includes('cyprus')) {
        throw new Error('Please switch to a Cyprus-1 address');
      }

      // Set up Pelagus provider
      console.log('Setting up Pelagus provider...');
      try {
        // Create provider with node URL and network config
        const quaiProvider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl, {
          name: CHAIN_CONFIG.name,
          chainId: parseInt(CHAIN_CONFIG.chainId)
        });

        // Verify network
        const network = await quaiProvider.getNetwork();
        console.log('Network info:', network);

        if (network.chainId.toString() !== CHAIN_CONFIG.chainId) {
          console.log('Wrong network, attempting to switch...');
          try {
            await window.pelagus.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CHAIN_CONFIG.chainId }]
            });
          } catch (switchError) {
            console.error('Network switch error:', switchError);
            throw new Error('Please switch to Cyprus-1 network in Pelagus');
          }
        }

        // Get signer from Pelagus
        const quaiSigner = new quais.Web3Provider(window.pelagus).getSigner();
        
        // Set state
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
        console.group('Checking Existing Connection');
        
        // Check if we have permission to access accounts
        const accounts = await window.pelagus.request({
          method: 'quai_accounts'
        });
        console.log('Existing accounts:', accounts);
        
        if (accounts?.length) {
          const currentAccount = accounts[0];
          console.log('Current account:', currentAccount);
          
          try {
            // Get zone information
            const zone = quais.getZoneFromAddress(currentAccount);
            console.log('Zone info:', zone);
            
            if (zone?.toLowerCase().includes('cyprus')) {
              // Check network with RPC provider
              const provider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
              const network = await provider.getNetwork();
              console.log('Network info:', network);
              
              if (network.chainId.toString() === CHAIN_CONFIG.chainId) {
                console.log('Valid existing connection found');
                await connectWallet();
              } else {
                console.log('Wrong network - connection needed');
              }
            } else {
              console.log('Account is not on Cyprus-1 zone');
            }
          } catch (error) {
            console.error('Error during connection check:', error);
            if (error?.code !== 4001) {  // Don't log user rejections
              console.dir(error);
            }
          }
        } else {
          console.log('No existing connection found');
        }
        
        console.groupEnd();
      } catch (error) {
        console.error('Connection check failed:', error);
        if (error?.code !== 4001) {  // Don't log user rejections
          console.dir(error);
        }
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

  // Helper function to sign messages
  const signMessage = async (message) => {
    if (!window.pelagus || !account) {
      throw new Error('Please connect your wallet first');
    }

    console.group('Message Signing');
    console.log('Message to sign:', message);
    console.log('Signing account:', account);

    try {
      const signature = await window.pelagus
        .request({
          method: 'personal_sign',
          params: [message, account]
        })
        .then((result) => {
          console.log('Signature:', result);
          return result;
        })
        .catch((error) => {
          console.error('Signing error:', error);
          if (error.code === 4001) {
            throw new Error('You rejected the signing request');
          }
          throw error;
        });

      console.groupEnd();
      return signature;

    } catch (error) {
      console.error('Message signing failed:', error);
      console.groupEnd();
      
      if (error.code === 4001) {
        throw new Error('You rejected the signing request');
      } else if (error.code === -32602) {
        throw new Error('Invalid parameters for signing');
      } else if (error.code === -32603) {
        throw new Error('Error during signing. Please try again');
      }
      
      throw new Error(error.message || 'Failed to sign message');
    }
  };

  // Helper function to sign typed data
  const signTypedData = async (typedData) => {
    if (!window.pelagus || !account) {
      throw new Error('Please connect your wallet first');
    }

    console.group('Typed Data Signing');
    console.log('Data to sign:', typedData);
    console.log('Signing account:', account);

    try {
      const signature = await window.pelagus
        .request({
          method: 'quai_signTypedData_v4',
          params: [account, typedData]
        })
        .then((result) => {
          console.log('Signature:', result);
          return result;
        })
        .catch((error) => {
          console.error('Signing error:', error);
          if (error.code === 4001) {
            throw new Error('You rejected the signing request');
          }
          throw error;
        });

      console.groupEnd();
      return signature;

    } catch (error) {
      console.error('Typed data signing failed:', error);
      console.groupEnd();
      
      if (error.code === 4001) {
        throw new Error('You rejected the signing request');
      } else if (error.code === -32602) {
        throw new Error('Invalid typed data format');
      } else if (error.code === -32603) {
        throw new Error('Error during signing. Please try again');
      }
      
      throw new Error(error.message || 'Failed to sign typed data');
    }
  };

  return {
    provider,
    signer,
    account,
    error,
    isConnecting,
    connectWallet,
    signMessage,
    signTypedData
  };
}