import { useState, useEffect } from 'react';
import { quais } from 'quais';
import { setupContract } from '../utils/contractSetup';

export const useQuaiContract = (account) => {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initContract = async () => {
            if (!window.pelagus || !account) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const provider = new quais.providers.Web3Provider(window.pelagus);
                const contractInstance = await setupContract(provider);
                
                setContract(contractInstance);
            } catch (err) {
                console.error('Contract initialization error:', err);
                setError(err.message || 'Failed to initialize contract');
            } finally {
                setLoading(false);
            }
        };

        initContract();

        // Cleanup function
        return () => {
            setContract(null);
        };
    }, [account]);

    const mint = async () => {
        if (!contract || !account) {
            throw new Error('Contract not initialized or no account connected');
        }

        try {
            return await contract.mint(account.address);
        } catch (error) {
            console.error('Mint error:', error);
            throw error;
        }
    };

    return {
        contract,
        loading,
        error,
        mint
    };
};