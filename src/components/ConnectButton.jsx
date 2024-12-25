import { useState, useEffect } from 'react';
import { connectToWallet, requestAccounts } from '../utils/quaiNetwork';
import { quais } from 'quais';

const ConnectButton = ({ onConnect }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [accountInfo, setAccountInfo] = useState(null);

    useEffect(() => {
        // Check if already connected
        const checkConnection = async () => {
            if (window.pelagus) {
                try {
                    const accounts = await window.pelagus.request({ method: 'quai_accounts' });
                    if (accounts && accounts.length > 0) {
                        const connection = await connectToWallet();
                        setAccountInfo(connection.account);
                        if (onConnect) onConnect(connection);
                    }
                } catch (err) {
                    console.error('Initial connection check failed:', err);
                }
            }
        };

        checkConnection();
    }, [onConnect]);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            const connection = await connectToWallet();
            setAccountInfo(connection.account);
            if (onConnect) onConnect(connection);
        } catch (err) {
            console.error('Connection failed:', err);
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const formatBalance = (balance) => {
        if (!balance) return '0';
        return quais.formatUnits(balance, 18);
    };

    if (error) {
        return (
            <div>
                <button 
                    onClick={handleConnect}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    {error.includes('Please connect to Cyprus-1') ? 'Switch to Cyprus-1' : error}
                </button>
            </div>
        );
    }

    if (isConnecting) {
        return (
            <button 
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded"
            >
                Connecting...
            </button>
        );
    }

    if (accountInfo) {
        return (
            <div className="flex flex-col items-center">
                <button 
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                    {accountInfo.address.slice(0, 6)}...{accountInfo.address.slice(-4)}
                </button>
                <div className="flex flex-col items-center text-sm text-gray-600 mt-1">
                    <span>Zone: {accountInfo.zone}</span>
                    <span>Balance: {formatBalance(accountInfo.balance)} QUAI</span>
                </div>
            </div>
        );
    }

    return (
        <button 
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
            Connect Wallet
        </button>
    );
};

export default ConnectButton;