import { useState, useEffect } from 'react';
import { signMintWithDebug, debugPelagus } from './debugMint';

const MintButtonDebug = ({ contractAddress, tokenId, uri }) => {
    const [minting, setMinting] = useState(false);
    const [error, setError] = useState(null);
    const [pelagusDiagnostics, setPelagusDiagnostics] = useState(null);

    useEffect(() => {
        // Run Pelagus diagnostics on component mount
        const diagnostics = debugPelagus();
        setPelagusDiagnostics(diagnostics);
        console.log('Initial Pelagus diagnostics:', diagnostics);
    }, []);

    const handleMint = async () => {
        console.log('Starting mint process...');
        setMinting(true);
        setError(null);

        try {
            // Check Pelagus status first
            if (!window.pelagus) {
                throw new Error('Pelagus not found. Please install Pelagus wallet.');
            }

            console.log('Requesting accounts...');
            const accounts = await window.pelagus.request({
                method: 'quai_requestAccounts'
            }).catch(e => {
                console.error('Account request error:', e);
                throw new Error('Failed to get accounts: ' + (e.message || 'Unknown error'));
            });

            console.log('Accounts received:', accounts);

            if (!accounts || accounts.length === 0) {
                throw new Error('No account connected');
            }

            const signer = accounts[0];
            console.log('Using signer:', signer);
            
            const nftData = {
                contractAddress,
                tokenId,
                uri
            };

            console.log('Preparing NFT data:', nftData);

            // Attempt to sign with debug logging
            const { signature, typedData } = await signMintWithDebug(signer, nftData);

            console.log('Mint successful!', {
                signature,
                typedData,
                signer
            });

        } catch (err) {
            console.error('Mint error:', err);
            setError(err.message || 'Failed to mint NFT');
        } finally {
            setMinting(false);
        }
    };

    return (
        <div>
            {pelagusDiagnostics && (
                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                    <div>Pelagus Status: {pelagusDiagnostics.installed ? 'Installed' : 'Not Installed'}</div>
                    <div>Request Method: {pelagusDiagnostics.hasRequest ? 'Available' : 'Not Available'}</div>
                    <div>Available Methods: {pelagusDiagnostics.methods.join(', ')}</div>
                </div>
            )}
            <button 
                onClick={handleMint}
                disabled={minting || !pelagusDiagnostics?.installed}
            >
                {minting ? 'Minting...' : 'Mint NFT (Debug)'}
            </button>
            {error && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                    Error: {error}
                </div>
            )}
        </div>
    );
};

export default MintButtonDebug;