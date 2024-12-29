import { useState } from 'react';
import { signMint } from './signMint';
import { quais } from 'quais';

const MintButton = ({ contractAddress, tokenId, uri }) => {
    const [minting, setMinting] = useState(false);
    const [error, setError] = useState(null);

    const handleMint = async () => {
        setMinting(true);
        setError(null);

        try {
            // Get the current account
            const accounts = await window.pelagus.request({
                method: 'quai_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No account connected');
            }

            const signer = accounts[0];
            
            // Prepare NFT data
            const nftData = {
                contractAddress,
                tokenId,
                uri
            };

            // Get signature for minting
            const { signature, typedData } = await signMint(signer, nftData);

            // Here you would typically send this signature to your backend
            // or use it in your smart contract call
            console.log('Mint data prepared:', {
                signature,
                typedData,
                signer
            });

            // You can emit an event or callback here with the signature
            // onMintComplete({ signature, typedData, signer });

        } catch (err) {
            console.error('Mint error:', err);
            setError(err.message || 'Failed to mint NFT');
        } finally {
            setMinting(false);
        }
    };

    return (
        <div>
            <button 
                onClick={handleMint}
                disabled={minting}
            >
                {minting ? 'Minting...' : 'Mint NFT'}
            </button>
            {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
    );
};

export default MintButton;