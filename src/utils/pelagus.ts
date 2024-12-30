export async function waitForPelagus() {
  const maxAttempts = 50;
  const checkInterval = 100;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    try {
      if (window.pelagus) {
        const chainId = await window.pelagus.request({ method: 'eth_chainId' });
        if (chainId) {
          console.log('Pelagus initialized with chain ID:', chainId);
          return true;
        }
      }
    } catch (error) {
      console.log('Waiting for Pelagus to initialize...', attempts);
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return false;
}

export async function waitForFirefoxPelagus() {
  const maxAttempts = 20;
  const interval = 500;
  
  console.log('Starting Firefox Pelagus initialization check...');
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Firefox Pelagus check attempt ${i + 1}/${maxAttempts}`);
    
    if (window.pelagus) {
      try {
        const chainId = await window.pelagus.request({ method: 'eth_chainId' });
        const accounts = await window.pelagus.request({ method: 'eth_accounts' });
        
        if (chainId && typeof window.pelagus.request === 'function') {
          console.log('Firefox Pelagus initialization successful');
          return true;
        }
      } catch (err) {
        console.log('Firefox Pelagus not ready yet:', err);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.log('Firefox Pelagus initialization timed out');
  return false;
}

export async function checkAndSwitchNetwork() {
  try {
    if (!window.pelagus) {
      throw new Error('Pelagus wallet not found');
    }

    const chainId = await window.pelagus.request({ method: 'eth_chainId' });
    console.log('Current chainId:', chainId);

    if (chainId !== '0x2328') {
      console.log('Wrong network detected. Current:', chainId, 'Expected: 0x2328');
      
      try {
        await window.pelagus.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2328',
            chainName: 'Cyprus 1',
            nativeCurrency: {
              name: 'QUAI',
              symbol: 'QUAI',
              decimals: 18
            },
            rpcUrls: ['https://rpc.cyprus1.testnet.quai.network'],
            blockExplorerUrls: ['https://cyprus1.testnet.quaiscan.io']
          }]
        });

        const newChainId = await window.pelagus.request({ method: 'eth_chainId' });
        if (newChainId !== '0x2328') {
          throw new Error('Network switch failed. Please manually switch to Cyprus-1 in Pelagus');
        }
        console.log('Successfully switched to Cyprus-1');

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (switchError) {
        console.error('Network switch error:', switchError);
        throw new Error('Please manually switch to Cyprus-1 network in Pelagus');
      }
    }
  } catch (error) {
    console.error('Network check/switch failed:', error);
    throw error;
  }
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(value: bigint): string {
  return (Number(value) / 1e18).toFixed(4);
}