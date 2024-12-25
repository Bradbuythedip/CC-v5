import { useState, useEffect } from 'react';
import { setupContract } from '../utils/contractSetup';

export const useQuaiContract = (account) => {
    const [contractSetup, setContractSetup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const initContract = async () => {
            if (!window.pelagus || !account) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const setup = await setupContract();
                
                if (mounted) {
                    setContractSetup(setup);
                }
            } catch (err) {
                console.error('Contract initialization error:', err);
                if (mounted) {
                    setError(err.message || 'Failed to initialize contract');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initContract();

        return () => {
            mounted = false;
            setContractSetup(null);
        };
    }, [account]);

    const mint = async () => {
        if (!contractSetup || !account) {
            throw new Error('Contract not initialized or no account connected');
        }

        try {
            return await contractSetup.mint(account.address);
        } catch (error) {
            console.error('Mint error:', error);
            throw error;
        }
    };

    return {
        contract: contractSetup?.contract,
        loading,
        error,
        mint
    };
};