import { useState, useEffect } from 'react';
import { connectToWallet } from '../utils/quaiNetwork';

const ConnectButton = ({ onConnect }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [accountInfo, setAccountInfo] = useState(null);

    useEffect(() => {
        // Check if already connected
        const checkConnection = async () => {
            if (window.pelagus && window.pelagus.isConnected()) {
                try {
                    const connection = await connectToWallet();
                    setAccountInfo(connection.account);
                    if (onConnect) onConnect(connection);
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

    if (error) {
        return (
            <div>
                <button 
                    onClick={handleConnect}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Error: {error}
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
                    Connected: {accountInfo.address.slice(0, 6)}...{accountInfo.address.slice(-4)}
                </button>
                <span className="text-sm text-gray-600 mt-1">
                    Zone: {accountInfo.zone}
                </span>
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