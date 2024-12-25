import { quais } from 'quais';

export const CYPRUS_1_CHAIN_ID = '0x2328'; // 9000 in hex
export const CYPRUS_1_RPC = 'https://rpc.cyprus1.colosseum.quai.network';

export const getZoneFromAddress = (address) => {
    return quais.getZoneFromAddress(address);
};

export const isCorrectNetwork = async () => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        const chainId = await window.pelagus.request({ method: 'quai_chainId' });
        return chainId === CYPRUS_1_CHAIN_ID;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
};

export const getBalance = async (address) => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        const balance = await window.pelagus.request({
            method: 'quai_getBalance',
            params: [address, 'latest']
        });
        return balance;
    } catch (error) {
        console.error('Error getting balance:', error);
        throw error;
    }
};

export const requestAccounts = async () => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        // Check if we already have access to accounts
        let accounts = await window.pelagus.request({ method: 'quai_accounts' });
        
        // If no accounts or empty array, request access
        if (!accounts || accounts.length === 0) {
            accounts = await window.pelagus.request({ method: 'quai_requestAccounts' });
        }

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
        }

        // Check if we're on the correct network
        const isCorrectNet = await isCorrectNetwork();
        if (!isCorrectNet) {
            throw new Error('Please connect to Cyprus-1 network in Pelagus');
        }

        const address = accounts[0];
        const zone = getZoneFromAddress(address);
        const balance = await getBalance(address);

        return {
            address,
            zone,
            balance
        };
    } catch (error) {
        console.error('Error requesting accounts:', error);
        throw error;
    }
};

export const sendTransaction = async ({ to, value, data }) => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        const accounts = await window.pelagus.request({ method: 'quai_accounts' });
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
        }

        const from = accounts[0];
        const txParams = {
            from,
            to,
            value: value ? `0x${value.toString(16)}` : '0x0',
            data: data || '0x'
        };

        const txHash = await window.pelagus.request({
            method: 'quai_sendTransaction',
            params: [txParams]
        });

        return txHash;
    } catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
    }
};

export const connectToWallet = async () => {
    try {
        if (!window.pelagus) {
            throw new Error('Please install Pelagus wallet');
        }

        const account = await requestAccounts();
        return {
            account,
            sendTransaction,
        };
    } catch (error) {
        console.error('Wallet connection error:', error);
        throw error;
    }
};