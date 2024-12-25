import { useState } from 'react';
import { useQuaiContract } from '../hooks/useQuaiContract';

const MintButton = ({ account }) => {
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { contract, loading, error: contractError, mint } = useQuaiContract(account);

    const handleMint = async () => {
        if (loading || !contract || !account) return;
        
        setIsMinting(true);
        setError(null);
        setSuccess(false);

        try {
            // Attempt to mint
            const receipt = await mint();
            console.log('Mint successful:', receipt);
            setSuccess(true);
        } catch (err) {
            console.error('Error minting NFT:', err);
            // Clean up the error message
            let errorMessage = err.message || 'Failed to mint NFT';
            if (errorMessage.includes('user rejected')) {
                errorMessage = 'Transaction rejected by user';
            } else if (errorMessage.includes('insufficient funds')) {
                errorMessage = 'Insufficient QUAI balance';
            }
            setError(errorMessage);
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