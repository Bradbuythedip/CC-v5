import { quais } from 'quais';

export const CYPRUS_1_CHAIN_ID = '0x2328'; // 9000 in hex
export const CYPRUS_1_RPC = 'https://rpc.cyprus1.colosseum.quai.network';

export const getZoneFromAddress = (address) => {
    return quais.getZoneFromAddress(address);
};

export const isCorrectNetwork = async (provider) => {
    try {
        const network = await provider.getNetwork();
        return network.chainId.toString(16) === CYPRUS_1_CHAIN_ID.replace('0x', '');
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
};

export const switchToCyprus1 = async () => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CYPRUS_1_CHAIN_ID }],
        });
    } catch (error) {
        if (error.code === 4902) {
            await window.pelagus.request({
                method: 'wallet_addEthereumChain',
                params: [
                    {
                        chainId: CYPRUS_1_CHAIN_ID,
                        chainName: 'Cyprus-1',
                        nativeCurrency: {
                            name: 'QUAI',
                            symbol: 'QUAI',
                            decimals: 18,
                        },
                        rpcUrls: [CYPRUS_1_RPC],
                    },
                ],
            });
        } else {
            throw error;
        }
    }
};

export const requestAccounts = async () => {
    if (!window.pelagus) {
        throw new Error('Pelagus wallet not found');
    }

    try {
        // First ensure we're on the correct network
        const provider = new quais.providers.Web3Provider(window.pelagus);
        const isCorrectNet = await isCorrectNetwork(provider);
        
        if (!isCorrectNet) {
            await switchToCyprus1();
        }

        const accounts = await window.pelagus.request({ method: 'quai_requestAccounts' });
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }

        const zone = getZoneFromAddress(accounts[0]);
        return {
            address: accounts[0],
            zone,
        };
    } catch (error) {
        console.error('Error requesting accounts:', error);
        throw error;
    }
};

export const connectToWallet = async () => {
    try {
        if (!window.pelagus) {
            throw new Error('Please install Pelagus wallet');
        }

        const account = await requestAccounts();
        const provider = new quais.providers.Web3Provider(window.pelagus);
        const signer = provider.getSigner();

        return {
            account,
            provider,
            signer,
        };
    } catch (error) {
        console.error('Wallet connection error:', error);
        throw error;
    }
};