import { quais } from 'quais';

export const signMint = async (signer, nftData) => {
    try {
        // Verify Pelagus is available
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
                chainId: 9000, // Quai Network chain ID
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

            console.log('Mint Signature:', signature);
            return {
                signature,
                typedData
            };
        } catch (signError) {
            console.error('Signing error:', signError);
            throw new Error(signError.message || 'Failed to sign mint transaction');
        }
    } catch (error) {
        console.error('Mint preparation error:', error);
        throw error;
    }
};