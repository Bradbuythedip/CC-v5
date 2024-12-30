import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { quais } from 'quais';
import toast from 'react-hot-toast';
import { waitForPelagus, checkAndSwitchNetwork } from '../utils/pelagus';
import { NFT_ABI, NFTContractType } from '../types/contract';

type Web3State = {
  provider: quais.BrowserProvider | null;
  signer: quais.JsonRpcSigner | null;
  contract: NFTContractType | null;
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
  loading: boolean;
  error: string | null;
};

type Web3Action =
  | { type: 'SET_PROVIDER'; payload: quais.BrowserProvider | null }
  | { type: 'SET_SIGNER'; payload: quais.JsonRpcSigner | null }
  | { type: 'SET_CONTRACT'; payload: NFTContractType | null }
  | { type: 'SET_ACCOUNT'; payload: string | null }
  | { type: 'SET_CHAIN_ID'; payload: number | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: Web3State = {
  provider: null,
  signer: null,
  contract: null,
  account: null,
  isConnected: false,
  chainId: null,
  loading: false,
  error: null,
};

const Web3Context = createContext<{
  state: Web3State;
  dispatch: React.Dispatch<Web3Action>;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
}>({
  state: initialState,
  dispatch: () => null,
  connectWallet: async () => {},
  disconnect: () => {},
});

function web3Reducer(state: Web3State, action: Web3Action): Web3State {
  switch (action.type) {
    case 'SET_PROVIDER':
      return { ...state, provider: action.payload };
    case 'SET_SIGNER':
      return { ...state, signer: action.payload };
    case 'SET_CONTRACT':
      return { ...state, contract: action.payload };
    case 'SET_ACCOUNT':
      return { ...state, account: action.payload };
    case 'SET_CHAIN_ID':
      return { ...state, chainId: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0022829f37d6139471aD521AdD335ED73CBE11fA';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(web3Reducer, initialState);

  useEffect(() => {
    checkConnection();
    setupEventListeners();
    return cleanup;
  }, []);

  async function checkConnection() {
    try {
      const isFirefox = /Firefox/.test(navigator.userAgent);
      console.log('Checking connection for:', isFirefox ? 'Firefox' : 'Chrome');

      // First check if extension is installed
      if (!isPelagusInstalled()) {
        if (isFirefox) {
          dispatch({ type: 'SET_ERROR', payload: 'Please install Pelagus extension for Firefox' });
          window.open('https://addons.mozilla.org/en-US/firefox/addon/pelagus/', '_blank');
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Please install Pelagus wallet' });
          window.open('https://pelagus.space/download', '_blank');
        }
        return;
      }

      // Wait for Pelagus to initialize
      const isPelagusReady = await waitForPelagus();
      if (!isPelagusReady) {
        if (isFirefox) {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: 'Pelagus extension not responding. Please try refreshing the page or check extension permissions.' 
          });
        } else {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: 'Pelagus not available. Please make sure the extension is enabled.' 
          });
        }
        return;
      }

      // Try to get accounts
      try {
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await initializeWeb3(accounts[0]);
        }
      } catch (accountError) {
        console.error('Error getting accounts:', accountError);
        if (isFirefox) {
          toast.error('Please check if Pelagus extension has necessary permissions');
        }
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to wallet' });
    }
  }

  async function initializeWeb3(account: string) {
    try {
      await checkAndSwitchNetwork();
      
      const provider = new quais.BrowserProvider(window.pelagus, undefined, { usePathing: true });
      const signer = await provider.getSigner();
      const contract = new quais.Contract(CONTRACT_ADDRESS, NFT_ABI, signer) as unknown as NFTContractType;
      const network = await provider.getNetwork();

      dispatch({ type: 'SET_PROVIDER', payload: provider });
      dispatch({ type: 'SET_SIGNER', payload: signer });
      dispatch({ type: 'SET_CONTRACT', payload: contract });
      dispatch({ type: 'SET_ACCOUNT', payload: account });
      dispatch({ type: 'SET_CHAIN_ID', payload: Number(network.chainId) });
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Web3 initialization failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize Web3' });
    }
  }

  async function connectWallet() {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const isPelagusReady = await waitForPelagus();
      if (!isPelagusReady) {
        throw new Error('Please install Pelagus wallet');
      }

      await checkAndSwitchNetwork();
      const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        await initializeWeb3(accounts[0]);
        toast.success('Wallet connected successfully');
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(error.message || 'Failed to connect wallet');
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  function disconnect() {
    dispatch({ type: 'SET_PROVIDER', payload: null });
    dispatch({ type: 'SET_SIGNER', payload: null });
    dispatch({ type: 'SET_CONTRACT', payload: null });
    dispatch({ type: 'SET_ACCOUNT', payload: null });
    dispatch({ type: 'SET_CHAIN_ID', payload: null });
    dispatch({ type: 'SET_CONNECTED', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
    toast.success('Wallet disconnected');
  }

  function setupEventListeners() {
    if (window.pelagus) {
      window.pelagus.on('accountsChanged', handleAccountsChanged);
      window.pelagus.on('chainChanged', handleChainChanged);
      window.pelagus.on('disconnect', handleDisconnect);
    }
  }

  function cleanup() {
    if (window.pelagus) {
      window.pelagus.removeListener('accountsChanged', handleAccountsChanged);
      window.pelagus.removeListener('chainChanged', handleChainChanged);
      window.pelagus.removeListener('disconnect', handleDisconnect);
    }
  }

  async function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      disconnect();
    } else {
      await initializeWeb3(accounts[0]);
    }
  }

  function handleChainChanged() {
    window.location.reload();
  }

  function handleDisconnect() {
    disconnect();
  }

  return (
    <Web3Context.Provider
      value={{
        state,
        dispatch,
        connectWallet,
        disconnect,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}