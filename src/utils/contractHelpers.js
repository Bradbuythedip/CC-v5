import { quais } from 'quais';
import { formatContractAddress, getNetworkConfig } from './quaiAddressHelper';
import CroakCityABI from '../contracts/CroakCity.json';

export const initializeContract = async (provider) => {
    try {
        if (!provider) {
            throw new Error('Provider not found');
        }

        const contractAddress = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
        if (!contractAddress) {
            throw new Error('Contract address not found in environment variables');
        }

        // Format the contract address for Quai Network
        const formattedAddress = formatContractAddress(contractAddress);
        
        // Create contract instance
        const contract = new quais.Contract(
            formattedAddress,
            CroakCityABI.abi,
            provider
        );

        return contract;
    } catch (error) {
        console.error('Error initializing contract:', error);
        throw error;
    }
};

export const getQuaiProvider = () => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    const { rpcUrl } = getNetworkConfig();
    
    // First try with Pelagus provider
    const provider = new quais.providers.Web3Provider(window.pelagus);
    
    // Set up a fallback provider using the RPC URL
    const fallbackProvider = new quais.providers.JsonRpcProvider(rpcUrl);
    
    // Return a proxy that tries Pelagus first, then falls back to RPC
    return new Proxy(provider, {
        get: (target, prop) => {
            const original = target[prop];
            if (typeof original === 'function') {
                return async (...args) => {
                    try {
                        return await original.apply(target, args);
                    } catch (error) {
                        console.warn('Falling back to RPC provider:', error);
                        const fallback = fallbackProvider[prop];
                        return fallback.apply(fallbackProvider, args);
                    }
                };
            }
            return original;
        }
    });
};