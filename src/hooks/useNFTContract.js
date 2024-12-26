import { useState, useEffect } from 'react';
import { quais } from 'quais';

const NFT_ABI = [
  "function mint() payable",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintsPerWallet(address) view returns (uint256)",
  "function hasUsedFreeMint(address) view returns (bool)",
  "function mintingEnabled() view returns (bool)",
  "function owner() view returns (address)",
  "function setMintingEnabled(bool enabled) external"
];

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;

export function useNFTContract(signer, provider, account) {
  const [contract, setContract] = useState(null);
  const [mintInfo, setMintInfo] = useState({
    totalSupply: 0,
    maxSupply: 420,
    mintsPerWallet: 0,
    hasFreeMint: true,
    mintingEnabled: false
  });
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize contract
  useEffect(() => {
    if (!NFT_CONTRACT_ADDRESS || !provider) return;

    try {
      const nftContract = new quais.Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_ABI,
        provider
      );
      setContract(nftContract);
      loadContractData();
    } catch (err) {
      console.error('Contract initialization error:', err);
      setError('Failed to initialize contract');
    }
  }, [provider, NFT_CONTRACT_ADDRESS]);

  // Load contract data
  const loadContractData = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      setError(null);

      const [
        totalSupply,
        maxSupply,
        mintsPerWallet,
        hasUsedFreeMint,
        mintingEnabled,
        owner
      ] = await Promise.all([
        contract.totalSupply(),
        contract.maxSupply(),
        contract.mintsPerWallet(account),
        contract.hasUsedFreeMint(account),
        contract.mintingEnabled(),
        contract.owner()
      ]);

      setMintInfo({
        totalSupply: Number(totalSupply),
        maxSupply: Number(maxSupply),
        mintsPerWallet: Number(mintsPerWallet),
        hasFreeMint: !hasUsedFreeMint,
        mintingEnabled
      });

      setIsOwner(owner.toLowerCase() === account.toLowerCase());

    } catch (err) {
      console.error('Error loading contract data:', err);
      setError('Failed to load NFT data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse error object
  const parseError = (error) => {
    console.log('Full error object:', error);
    console.log('Error type:', typeof error);
    
    // Default error message
    let errorMessage = 'Transaction failed. Please try again.';

    try {
      // If error is a string, return it directly
      if (typeof error === 'string') {
        return error;
      }

      // If error is not an object or is null, return default message
      if (typeof error !== 'object' || error === null) {
        return errorMessage;
      }

      // Log all error properties for debugging
      Object.keys(error).forEach(key => {
        console.log(`${key}:`, error[key]);
      });

      // Handle user rejection
      if (error.code === 4001) {
        return 'You rejected the transaction';
      }

      // Handle CALL_EXCEPTION with missing revert data
      if (error.code === 'CALL_EXCEPTION' && error.transaction) {
        console.log('Transaction data:', error.transaction);
        
        // Get contract state to determine why the call failed
        const checkContractState = async () => {
          try {
            const [
              mintingEnabled,
              totalSupply,
              maxSupply,
              mintsPerWallet,
              hasFreeMint
            ] = await Promise.all([
              contract.mintingEnabled(),
              contract.totalSupply(),
              contract.maxSupply(),
              contract.mintsPerWallet(error.transaction.from),
              contract.hasFreeMint(error.transaction.from)
            ]);

            console.log('Contract state:', {
              mintingEnabled,
              totalSupply: totalSupply.toString(),
              maxSupply: maxSupply.toString(),
              mintsPerWallet: mintsPerWallet.toString(),
              hasFreeMint
            });

            // Check various conditions
            if (!mintingEnabled) {
              return 'Minting is currently disabled';
            }
            if (totalSupply >= maxSupply) {
              return 'All NFTs have been minted';
            }
            if (mintsPerWallet >= 20) {
              return 'You have reached your maximum mint limit (20)';
            }
            if (!hasFreeMint && (!error.transaction.value || error.transaction.value === '0x0')) {
              return 'Please send 1 QUAI to mint';
            }
          } catch (stateError) {
            console.error('Error checking contract state:', stateError);
          }
          return 'Transaction failed - please check your wallet and try again';
        };

        // Since we can't return a promise directly, mark as checking
        return 'Checking transaction status...';
      }

      // Handle contract revert with data
      if (error.data) {
        try {
          const decodedError = quais.utils.toUtf8String(error.data);
          const errorMessages = {
            'MINTING_DISABLED': 'Minting is currently disabled',
            'MAX_SUPPLY_REACHED': 'All NFTs have been minted',
            'WALLET_LIMIT_REACHED': 'You have reached your maximum mint limit (20)',
            'INSUFFICIENT_PAYMENT': 'Please send 1 QUAI to mint',
            'PAYMENT_FAILED': 'Payment transfer failed. Please try again',
            'MINT_FAILED': 'NFT minting failed. Please try again'
          };
          return errorMessages[decodedError] || `Contract Error: ${decodedError}`;
        } catch (decodeError) {
          console.error('Error decoding data:', decodeError);
        }
      }

      // Check common error messages
      if (error.message) {
        const message = error.message.toLowerCase();
        if (message.includes('insufficient funds')) {
          return 'Insufficient funds in your wallet';
        }
        if (message.includes('gas required exceeds allowance')) {
          return 'Transaction might fail - please try again with higher gas limit';
        }
        if (message.includes('execution reverted')) {
          return 'Transaction reverted by the contract';
        }
        if (message.includes('nonce too high')) {
          return 'Please reset your wallet transaction count';
        }
        return error.message;
      }

      // Check for reason
      if (error.reason) {
        return `Transaction failed: ${error.reason}`;
      }

    } catch (parseError) {
      console.error('Error while parsing error:', parseError);
    }

    return errorMessage;
  };

  // Mint function
  const mint = async () => {
    if (!contract || !signer || !account) {
      throw new Error('Please connect your wallet');
    }

    const signedContract = contract.connect(signer);

    try {
      console.log('Starting mint transaction...');
      
      // Prepare transaction options
      const options = {
        gasLimit: "0x2DC6C0", // 3,000,000 gas
        maxFeePerGas: quais.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: quais.parseUnits('20', 'gwei')
      };

      // Add value if not a free mint
      if (!mintInfo.hasFreeMint) {
        options.value = quais.parseEther('1.0');
      }

      console.log('Mint options:', options);

      // First check if minting is possible
      console.log('Checking contract state before minting...');
      try {
        const mintingEnabled = await contract.mintingEnabled();
        if (!mintingEnabled) {
          throw new Error('MINTING_DISABLED');
        }

        const totalSupply = await contract.totalSupply();
        const maxSupply = await contract.maxSupply();
        if (totalSupply >= maxSupply) {
          throw new Error('MAX_SUPPLY_REACHED');
        }

        const mintsPerWallet = await contract.mintsPerWallet(account);
        if (mintsPerWallet >= 20) {
          throw new Error('WALLET_LIMIT_REACHED');
        }
      } catch (checkError) {
        console.error('Pre-mint check failed:', checkError);
        throw checkError;
      }

      // Prepare transaction parameters
      const txParams = {
        from: account,
        to: contract.address,
        data: contract.interface.encodeFunctionData('mint'),
        ...options
      };

      console.log('Sending transaction with params:', txParams);

      // Send transaction using Pelagus provider
      try {
        const txHash = await window.pelagus.request({
          method: 'quai_sendTransaction',
          params: [txParams]
        });
        
        console.log('Transaction hash:', txHash);

        // Wait for transaction confirmation
        console.log('Waiting for transaction confirmation...');
        const receipt = await provider.waitForTransaction(txHash);
        console.log('Transaction confirmed:', receipt);

      // Refresh data
      await loadContractData();

      return receipt;
    } catch (error) {
      console.error('Mint error:', error);
      
      // Handle specific Pelagus error codes
      if (error.code === 4001) {
        throw new Error('You rejected the transaction');
      }
      
      // Handle RPC errors (-32000 to -32099)
      if (error.code && error.code <= -32000 && error.code >= -32099) {
        if (error.message?.includes('insufficient funds')) {
          throw new Error('Insufficient funds in your wallet');
        }
        if (error.message?.includes('nonce too low')) {
          throw new Error('Transaction nonce too low. Please try again');
        }
        if (error.message?.includes('gas required exceeds allowance')) {
          throw new Error('Gas estimation failed. The transaction might fail');
        }
        throw new Error(`RPC Error: ${error.message || 'Unknown RPC error'}`);
      }

      // Handle invalid parameters (-32602)
      if (error.code === -32602) {
        throw new Error('Invalid transaction parameters. Please try again');
      }

      // Handle internal JSON-RPC error (-32603)
      if (error.code === -32603) {
        throw new Error('Internal RPC error. Please try again');
      }

      // If it's a string error from our pre-mint checks
      if (typeof error.message === 'string') {
        const errorMessages = {
          'MINTING_DISABLED': 'Minting is currently disabled',
          'MAX_SUPPLY_REACHED': 'All NFTs have been minted',
          'WALLET_LIMIT_REACHED': 'You have reached your maximum mint limit (20)',
          'INSUFFICIENT_PAYMENT': 'Please send 1 QUAI to mint',
          'PAYMENT_FAILED': 'Payment transfer failed. Please try again',
          'MINT_FAILED': 'NFT minting failed. Please try again'
        };

        const knownError = Object.keys(errorMessages).find(key => 
          error.message.includes(key)
        );

        if (knownError) {
          throw new Error(errorMessages[knownError]);
        }
      }

      // Default error message
      throw new Error('Transaction failed. Please try again');
    }
  };

  // Toggle minting (owner only)
  const toggleMinting = async (enable) => {
    if (!contract || !signer || !isOwner) {
      throw new Error('Unauthorized');
    }

    const signedContract = contract.connect(signer);
    const tx = await signedContract.setMintingEnabled(enable);
    await tx.wait();
    await loadContractData();
  };

  return {
    contract,
    mintInfo,
    isOwner,
    error,
    loading,
    mint,
    toggleMinting,
    refreshData: loadContractData
  };
}