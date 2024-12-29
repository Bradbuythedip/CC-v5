import { quais } from 'quais';

export const requestAccounts = async () => {
    try {
        const accounts = await window.pelagus.request({ 
            method: 'quai_requestAccounts' 
        });
        
        if (accounts && accounts[0]) {
            const zone = quais.getZoneFromAddress(accounts[0]);
            const accountInfo = {
                zone: zone,
                address: accounts[0]
            };
            console.log('Account:', accountInfo);
            return accountInfo; // Return the account info
        }
        return null;
    } catch (error) {
        if (error.code === 4001) {
            // EIP-1193 userRejectedRequest error
            console.log('User rejected request');
        } else {
            console.error('Connection error:', error);
        }
        throw error; // Re-throw the error to be handled by the component
    }
}