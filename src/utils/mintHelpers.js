import { quais } from 'quais';

export const handleMintError = (error) => {
    // Log the error for debugging
    console.error('Mint transaction error:', error);
    
    // If it's already an Error object, throw it directly
    if (error instanceof Error) {
        throw error;
    }
    
    // If it's a string or other type, create a proper Error object
    throw new Error(error?.message || error?.toString() || 'Unknown minting error');
};

export const signMintTransaction = async (signer, nftData) => {
    try {
        if (!window.pelagus) {
            throw new Error('Pelagus wallet is not installed');
        }

        const typedData = {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' }
                ],
                NFTMint: [
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'recipient', type: 'address' },
                    { name: 'uri', type: 'string' }
                ]
            },
            primaryType: 'NFTMint',
            domain: {
                name: 'CC-v5',
                version: '1',
                chainId: 9000,
                verifyingContract: nftData.contractAddress
            },
            message: {
                tokenId: nftData.tokenId,
                recipient: signer,
                uri: nftData.uri
            }
        };

        try {
            const signature = await window.pelagus.request({
                method: 'quai_signTypedData_v4',
                params: [signer, typedData]
            });

            return { signature, typedData };
        } catch (signError) {
            // Log and rethrow specific signing errors
            throw new Error(`Signing failed: ${signError.message || 'Unknown signing error'}`);
        }
    } catch (error) {
        handleMintError(error);
    }
};