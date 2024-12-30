// Firefox permission check
export async function checkFirefoxPermissions(): Promise<boolean> {
  if (!window.pelagus) return false;

  try {
    // Try to access required methods
    const results = await Promise.all([
      window.pelagus.request({ method: 'eth_chainId' }).catch(() => null),
      window.pelagus.request({ method: 'eth_accounts' }).catch(() => null),
    ]);

    // Check if all required methods are accessible
    return results.every(result => result !== null);
  } catch (error) {
    console.error('Error checking Firefox permissions:', error);
    return false;
  }
}

// Browser detection
export function getBrowserInfo() {
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  
  return {
    isFirefox,
    isChrome,
    isSupported: isFirefox || isChrome,
    name: isFirefox ? 'Firefox' : isChrome ? 'Chrome' : 'Unsupported Browser'
  };
}

// Extension URLs
export const EXTENSION_URLS = {
  firefox: 'https://addons.mozilla.org/en-US/firefox/addon/pelagus/',
  chrome: 'https://pelagus.space/download'
};

// Check if extension is properly loaded
export async function isExtensionLoaded(): Promise<boolean> {
  const { isFirefox } = getBrowserInfo();

  // Firefox-specific checks
  if (isFirefox) {
    // Check for extension attribute
    const hasAttribute = document.documentElement.getAttribute('data-pelagus-extension') === 'true';
    if (!hasAttribute) return false;

    // Check if object exists but might not be ready
    if (!window.pelagus) return false;

    // Check permissions
    return await checkFirefoxPermissions();
  }

  // Chrome check
  return typeof window.pelagus !== 'undefined';
}

// Get appropriate error message
export function getConnectionErrorMessage(): string {
  const { isFirefox, isChrome, isSupported } = getBrowserInfo();

  if (!isSupported) {
    return 'Please use Chrome or Firefox to connect to Pelagus wallet';
  }

  if (!window.pelagus) {
    return isFirefox
      ? 'Please install the Pelagus extension for Firefox'
      : 'Please install the Pelagus wallet';
  }

  return isFirefox
    ? 'Please check if Pelagus extension has the necessary permissions'
    : 'Unable to connect to Pelagus wallet. Please try again.';
}