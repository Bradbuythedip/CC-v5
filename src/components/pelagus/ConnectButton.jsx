import { requestAccounts } from './requestAccounts';
import { useState } from 'react';

const ConnectButton = () => {
    const [account, setAccount] = useState(null);

    const handleConnect = async () => {
        try {
            const accountInfo = await requestAccounts();
            if (accountInfo) {
                setAccount(accountInfo);
            }
        } catch (error) {
            console.error('Failed to connect:', error);
        }
    };

    return (
        <button onClick={handleConnect}>
            {account ? `Connected: ${account.address.substring(0, 6)}...` : 'Connect'}
        </button>
    );
};

export default ConnectButton;