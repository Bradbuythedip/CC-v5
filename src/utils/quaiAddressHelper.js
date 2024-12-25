import { quais } from 'quais';

// Convert regular address to Quai checksum format
export const toQuaiAddress = (address) => {
    if (!address) return null;
    
    try {
        // First, ensure the address starts with '0x00' (Cyprus-1 prefix)
        const baseAddress = address.startsWith('0x00') ? address : '0x00' + address.slice(2);
        
        // Convert to checksum format using quais
        return quais.getAddress(baseAddress);
    } catch (error) {
        console.error('Error converting to Quai address:', error);
        return null;
    }
};

// Validate if an address is a valid Quai address
export const isValidQuaiAddress = (address) => {
    try {
        const checksumAddress = quais.getAddress(address);
        return checksumAddress === address;
    } catch {
        return false;
    }
};

// Get network config based on environment
export const getNetworkConfig = () => {
    // For local development
    if (import.meta.env.DEV) {
        return {
            rpcUrl: 'http://localhost:8545',
            chainId: '0x539',  // 1337 in hex
            networkName: 'Local Quai'
        };
    }
    
    // For testnet (Cyprus-1)
    return {
        rpcUrl: 'https://rpc.cyprus1.colosseum.quai.network/prime',
        chainId: '0x2328',  // 9000 in hex
        networkName: 'Cyprus-1'
    };
};

// Function to format contract addresses for Quai Network
export const formatContractAddress = (address) => {
    const contractAddress = toQuaiAddress(address);
    if (!contractAddress) {
        throw new Error('Invalid contract address format');
    }
    return contractAddress;
};