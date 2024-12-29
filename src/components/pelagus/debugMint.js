export const debugPelagus = () => {
    console.log('Checking Pelagus environment...');
    
    // Check if pelagus exists
    if (typeof window.pelagus === 'undefined') {
        console.error('Pelagus is not installed');
        return {
            installed: false,
            methods: [],
            provider: null
        };
    }

    // Log available methods
    console.log('Pelagus methods:', Object.keys(window.pelagus));
    
    // Check if request method exists
    if (typeof window.pelagus.request !== 'function') {
        console.error('Pelagus request method is not a function');
        return {
            installed: true,
            methods: Object.keys(window.pelagus),
            provider: window.pelagus,
            hasRequest: false
        };
    }

    return {
        installed: true,
        methods: Object.keys(window.pelagus),
        provider: window.pelagus,
        hasRequest: true
    };
};

export const signMintWithDebug = async (signer, nftData) => {
    console.log('Starting signMintWithDebug...');
    console.log('Signer:', signer);
    console.log('NFT Data:', nftData);

    // First, debug Pelagus environment
    const pelagusDiagnostics = debugPelagus();
    console.log('Pelagus diagnostics:', pelagusDiagnostics);

    if (!pelagusDiagnostics.installed) {
        throw new Error('Pelagus wallet is not installed');
    }

    if (!pelagusDiagnostics.hasRequest) {
        throw new Error('Pelagus request method is not available');
    }

    // Construct the typed data
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

    console.log('Constructed typedData:', JSON.stringify(typedData, null, 2));

    try {
        console.log('Attempting to sign with params:', [signer, typedData]);
        
        // Try different method names
        let signature;
        try {
            console.log('Trying quai_signTypedData_v4...');
            signature = await window.pelagus.request({
                method: 'quai_signTypedData_v4',
                params: [signer, typedData]
            });
        } catch (error) {
            console.log('quai_signTypedData_v4 failed:', error);
            
            console.log('Trying eth_signTypedData_v4...');
            signature = await window.pelagus.request({
                method: 'eth_signTypedData_v4',
                params: [signer, JSON.stringify(typedData)]
            });
        }

        console.log('Signature received:', signature);
        return {
            signature,
            typedData
        };
    } catch (error) {
        console.error('Signing failed:', error);
        throw new Error(`Signing failed: ${error.message || 'Unknown error'}`);
    }
};