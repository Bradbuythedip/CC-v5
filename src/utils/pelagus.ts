export async function waitForPelagus() {
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const maxAttempts = isFirefox ? 40 : 50; // Increased attempts for Firefox
  const checkInterval = isFirefox ? 500 : 100; // Longer interval for Firefox

  console.log(`Starting Pelagus check for ${isFirefox ? 'Firefox' : 'Chrome'}...`);

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    try {
      // First check if the object exists
      if (window.pelagus) {
        // For Firefox, we need to wait a bit after the object appears
        if (isFirefox) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
          // Test if methods are actually available
          const chainId = await window.pelagus.request({ method: 'eth_chainId' });
          const isMethodAvailable = typeof window.pelagus.request === 'function';
          
          if (chainId && isMethodAvailable) {
            console.log('Pelagus initialized successfully:', {
              chainId,
              browser: isFirefox ? 'Firefox' : 'Chrome',
              attempt: attempts + 1
            });
            return true;
          }
        } catch (methodError) {
          console.log('Pelagus methods not ready yet:', methodError);
          // In Firefox, sometimes the object exists but methods aren't ready
          if (isFirefox) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else {
        console.log(`Waiting for Pelagus object... Attempt ${attempts + 1}/${maxAttempts}`);
      }
    } catch (error) {
      console.log('Error checking Pelagus:', error);
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.log('Pelagus initialization timed out');
  return false;
}

// Helper function to check if extension is actually installed
export function isPelagusInstalled(): boolean {
  const isFirefox = /Firefox/.test(navigator.userAgent);
  
  // Check for Firefox-specific extension attributes
  if (isFirefox) {
    const hasExtensionAttribute = document.documentElement.getAttribute('data-pelagus-extension') === 'true';
    const hasObject = typeof window.pelagus !== 'undefined';
    return hasExtensionAttribute || hasObject;
  }
  
  // For Chrome and others, just check if object exists
  return typeof window.pelagus !== 'undefined';
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