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

  // Mint function
  const mint = async () => {
    if (!contract || !signer || !account) {
      throw new Error('Please connect your wallet');
    }

    const signedContract = contract.connect(signer);

    try {
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

      // Send transaction
      const tx = await signedContract.mint(options);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // Refresh data
      await loadContractData();

      return receipt;
    } catch (error) {
      console.error('Mint error:', error);
      
      let errorMessage = 'Transaction failed. Please try again.';
      
      if (error.code === 4001) {
        errorMessage = 'You rejected the transaction';
      } else if (error.data) {
        try {
          // Try to decode the error data
          const decodedError = quais.utils.toUtf8String(error.data);
          
          // Map contract error codes to user-friendly messages
          const errorMessages = {
            'MINTING_DISABLED': 'Minting is currently disabled',
            'MAX_SUPPLY_REACHED': 'All NFTs have been minted',
            'WALLET_LIMIT_REACHED': 'You have reached your maximum mint limit (20)',
            'INSUFFICIENT_PAYMENT': 'Please send 1 QUAI to mint',
            'PAYMENT_FAILED': 'Payment transfer failed. Please try again',
            'MINT_FAILED': 'NFT minting failed. Please try again'
          };
          
          errorMessage = errorMessages[decodedError] || `Error: ${decodedError}`;
        } catch (decodeError) {
          console.error('Error decoding revert reason:', decodeError);
          
          // Check if error message contains any known strings
          if (error.message?.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds in your wallet';
          } else if (error.message?.includes('gas required exceeds allowance')) {
            errorMessage = 'Transaction might fail - please try again with higher gas limit';
          }
        }
      }
      
      throw new Error(errorMessage);
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