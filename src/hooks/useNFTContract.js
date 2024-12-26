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
    console.log('Parsing error object:', error);
    console.log('Error type:', typeof error);
    console.log('Error properties:', Object.keys(error));

    // Default error message
    let errorMessage = 'Transaction failed. Please try again.';

    if (typeof error === 'object' && error !== null) {
      // Check for user rejection
      if (error.code === 4001) {
        return 'You rejected the transaction';
      }

      // Check for error data (contract revert)
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

      // Check for transaction property
      if (error.transaction) {
        console.log('Transaction details:', error.transaction);
      }

      // Check for error message
      if (typeof error.message === 'string') {
        if (error.message.includes('insufficient funds')) {
          return 'Insufficient funds in your wallet';
        }
        if (error.message.includes('gas required exceeds allowance')) {
          return 'Transaction might fail - please try again with higher gas limit';
        }
        if (error.message.includes('execution reverted')) {
          return 'Transaction reverted by the contract';
        }
        return error.message;
      }

      // Check for reason property
      if (error.reason) {
        return `Transaction failed: ${error.reason}`;
      }
    }

    // If error is a string
    if (typeof error === 'string') {
      return error;
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

      // Send transaction
      const tx = await signedContract.mint(options);
      console.log('Transaction sent:', tx);
      
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Refresh data
      await loadContractData();

      return receipt;
    } catch (error) {
      console.error('Mint error:', error);
      throw new Error(parseError(error));
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