import { useState } from 'react';
import { quais } from 'quais';
import { initializeContract, getQuaiProvider } from '../utils/contractHelpers';

const MintButton = ({ account }) => {
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleMint = async () => {
        setIsMinting(true);
        setError(null);
        setSuccess(false);

        try {
            if (!window.pelagus || !account) {
                throw new Error('Please connect your wallet first');
            }

            const provider = getQuaiProvider();
            const contract = await initializeContract(provider);
            
            // Check if minting is enabled
            const mintingEnabled = await contract.mintingEnabled();
            if (!mintingEnabled) {
                throw new Error('Minting is not enabled');
            }

            // Check if user has a free mint available
            const hasFreeMint = await contract.hasFreeMint(account.address);
            
            // Prepare transaction
            const signer = provider.getSigner();
            const mintTx = await contract.connect(signer).mint({
                value: hasFreeMint ? 0 : quais.parseEther('1'),
                gasLimit: 500000 // Set a reasonable gas limit
            });

            // Wait for transaction to be mined
            const receipt = await mintTx.wait();
            console.log('Mint successful:', receipt);
            setSuccess(true);
            
        } catch (err) {
            console.error('Error minting NFT:', err);
            setError(err.message || 'Failed to mint NFT');
        } finally {
            setIsMinting(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    {error}
                </button>
                <p className="text-sm text-gray-600">Click to try again</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    className="px-4 py-2 bg-green-600 text-white rounded"
                    disabled
                >
                    Mint Successful!
                </button>
                <button
                    onClick={() => {
                        setSuccess(false);
                        handleMint();
                    }}
                    className="text-blue-600 hover:underline text-sm"
                >
                    Mint Another?
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleMint}
            disabled={isMinting || !account}
            className={`px-4 py-2 rounded ${
                isMinting || !account
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
        >
            {isMinting ? 'Minting...' : 'Mint NFT'}
        </button>
    );
};

export default MintButton;