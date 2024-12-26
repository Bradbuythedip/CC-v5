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

      // Check for Pelagus
      if (!window.pelagus) {
        window.open('https://pelagus.space/download', '_blank');
        throw new Error('Please install Pelagus wallet');
      }

      // Check network
      const network = await window.pelagus.request({ method: 'quai_getNetwork' });
      if (network?.chainId !== CHAIN_CONFIG.chainId) {
        await window.pelagus.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CHAIN_CONFIG.chainId }]
        });
      }

      // Get zone info
      const zone = await window.pelagus.request({ method: 'quai_getZone' });
      if (!zone?.toLowerCase().includes('cyprus')) {
        throw new Error('Please switch to Cyprus-1 zone in Pelagus');
      }

      // Get accounts
      const accounts = await window.pelagus.request({ method: 'quai_requestAccounts' });
      if (!accounts?.length) {
        throw new Error('No accounts found');
      }

      const currentAccount = accounts[0];
      if (!currentAccount.toLowerCase().startsWith('0x00')) {
        throw new Error('Please use a Cyprus-1 address (starting with 0x00)');
      }

      // Setup provider and signer
      const quaiProvider = new quais.JsonRpcProvider(CHAIN_CONFIG.rpcUrl, {
        name: 'Cyprus 1',
        chainId: parseInt(CHAIN_CONFIG.chainId),
      });

      const quaiSigner = await window.pelagus.getSigner();

      setProvider(quaiProvider);
      setSigner(quaiSigner);
      setAccount(currentAccount);
      return true;

    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message);
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