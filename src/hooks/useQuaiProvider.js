import { useState, useEffect } from 'react';
import { quais } from 'quais';

// Helper function to detect Pelagus
const detectPelagus = () => {
  if (typeof window === 'undefined') return false;
  return window.pelagus !== undefined && window.pelagus !== null;
};

// Helper function to check method support
const checkMethodSupport = async (method) => {
  if (!window.pelagus) return false;
  
  try {
    // Try to call the method with minimal params
    switch (method) {
      case 'eth_accounts':
      case 'quai_accounts':
        await window.pelagus.request({ method });
        break;
      case 'eth_requestAccounts':
      case 'quai_requestAccounts':
        // Just check if method exists
        if (typeof window.pelagus.request !== 'function') return false;
        break;
      case 'personal_sign':
        await window.pelagus.request({
          method,
          params: ['test', '0x0000000000000000000000000000000000000000']
        });
        break;
      default:
        await window.pelagus.request({ method });
    }
    return true;
  } catch (error) {
    if (error.code === 4200) {
      console.log(`Method ${method} not supported`);
      return false;
    }
    // If error is about invalid params, method is supported
    if (error.code === -32602) return true;
    // For other errors, check if it's about method support
    return !error.message?.includes('not supported');
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

// Helper function for chain checking
export const checkChain = async (provider) => {
  if (!provider) return false;
  
  try {
    // Check network using provider
    const network = await provider.getNetwork();
    console.log('Network check:', {
      current: network.chainId.toString(),
      expected: '9000',
      name: network.name
    });
    return network.chainId.toString() === '9000'; // Cyprus-1
  } catch (error) {
    console.error('Chain check failed:', error);
    return false;
  }
};

// Main hook
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

      // Check for Pelagus
      console.log('Checking for Pelagus wallet...');
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error('Please install Pelagus wallet');
      }

      // Request accounts using quai_requestAccounts
      console.log('Requesting access to accounts...');
      let accounts;
      try {
        accounts = await window.pelagus
          .request({ 
            method: 'quai_requestAccounts' 
          })
          .then(result => {
            console.log('Account request successful:', result);
            return result;
          })
          .catch(error => {
            console.error('Account request error:', error);
            if (error.code === 4001) {
              throw new Error('You rejected the connection request');
            }
            throw error;
          });
      } catch (error) {
        console.error('Failed to request accounts:', error);
        throw new Error(error.message || 'Failed to connect to wallet');
      }

      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      const currentAccount = accounts[0];
      console.log('Selected account:', currentAccount);

      // Check if it's a Cyprus-1 address
      if (!currentAccount.toLowerCase().startsWith('0x00')) {
        throw new Error('Please switch to a Cyprus-1 address (starting with 0x00)');
      }

      // Set up providers
      console.log('Setting up providers...');
      try {
        // Create RPC provider for network interactions
        const quaiProvider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl, {
          name: CHAIN_CONFIG.name,
          chainId: parseInt(CHAIN_CONFIG.chainId)
        });

        // Check network
        const network = await quaiProvider.getNetwork();
        console.log('Network info:', network);

        if (network.chainId.toString() !== CHAIN_CONFIG.chainId) {
          const formattedChainId = `0x${parseInt(CHAIN_CONFIG.chainId).toString(16)}`;
          console.log('Wrong network, attempting to switch...', formattedChainId);

          try {
            // Try to switch network
            await window.pelagus.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: formattedChainId }]
            }).catch(error => {
              console.error('Network switch error:', error);
              if (error.code === 4001) {
                throw new Error('You rejected the network switch');
              } else if (error.code === 4200) {
                throw new Error('Network switch not supported. Please switch manually to Cyprus-1');
              }
              throw error;
            });
          } catch (error) {
            console.error('Failed to switch network:', error);
            throw new Error('Please switch to Cyprus-1 network in Pelagus');
          }
        }

        // Get signer from Pelagus provider
        const quaiSigner = pelagusProvider.getSigner();
        
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
        
        console.log('Checking method support...');
        const isQuaiSupported = await checkMethodSupport('quai_accounts');
        const isEthSupported = await checkMethodSupport('eth_accounts');

        console.log('Method support:', {
          quai_accounts: isQuaiSupported,
          eth_accounts: isEthSupported
        });

        if (!isQuaiSupported && !isEthSupported) {
          console.log('No supported account query method found');
          return;
        }

        let accounts;
        if (isQuaiSupported) {
          accounts = await window.pelagus.request({
            method: 'quai_accounts'
          });
          console.log('Existing accounts (quai):', accounts);
        } else {
          accounts = await window.pelagus.request({
            method: 'eth_accounts'
          });
          console.log('Existing accounts (eth):', accounts);
        }
        console.log('Found accounts:', accounts);
        
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

  // Helper function to send transaction
  const sendTransaction = async (txParams) => {
    if (!window.pelagus || !account) {
      throw new Error('Please connect your wallet first');
    }

    console.group('Transaction');
    console.log('Transaction params:', txParams);

    try {
      // Prepare transaction parameters
      const params = {
        from: account,
        ...txParams
      };

      // Convert values to hex if needed
      if (params.value && !params.value.startsWith('0x')) {
        params.value = `0x${BigInt(params.value).toString(16)}`;
      }
      if (params.gasLimit && !params.gasLimit.startsWith('0x')) {
        params.gasLimit = `0x${BigInt(params.gasLimit).toString(16)}`;
      }
      if (params.maxFeePerGas && !params.maxFeePerGas.startsWith('0x')) {
        params.maxFeePerGas = `0x${BigInt(params.maxFeePerGas).toString(16)}`;
      }

      console.log('Formatted params:', params);

      // Send transaction
      const txHash = await window.pelagus
        .request({
          method: 'quai_sendTransaction',
          params: [params]
        })
        .then(result => {
          console.log('Transaction hash:', result);
          return result;
        })
        .catch(error => {
          console.error('Transaction error:', error);
          if (error.code === 4001) {
            throw new Error('You rejected the transaction');
          }
          throw error;
        });

      console.log('Waiting for confirmation...');
      const receipt = await provider.waitForTransaction(txHash);
      console.log('Transaction confirmed:', receipt);

      console.groupEnd();
      return { hash: txHash, receipt };
    } catch (error) {
      console.error('Transaction failed:', error);
      console.groupEnd();
      throw new Error(error.message || 'Transaction failed');
    }
  };

  // Helper function to sign messages
  const signMessage = async (message) => {
    if (!window.pelagus || !account) {
      throw new Error('Please connect your wallet first');
    }

    console.group('Message Signing');
    console.log('Message:', message);
    console.log('Signer:', account);

    try {
      // Convert message to hex if needed
      const msg = message.startsWith('0x') ? 
        message : 
        `0x${Buffer.from(message, 'utf8').toString('hex')}`;

      const signature = await window.pelagus
        .request({
          method: 'personal_sign',
          params: [msg, account]
        })
        .then(result => {
          console.log('Signature:', result);
          return result;
        })
        .catch(error => {
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
    isPelagusDetected,
    connectWallet,
    sendTransaction,
    signMessage,
    signMessage,
    signTypedData
  };
}