import { useState, useEffect } from 'react';
import { quais } from 'quais';
import { toQuaiChecksumAddress, formatAddress, ensureZonePrefix } from '../utils/addressHelpers';

const PELAGUS_DOWNLOAD_URL = 'https://chrome.google.com/webstore/detail/pelagus/gaegollnpijhedifeeeepdoffkgfcmbc';

const PelagusConnect = ({ onConnect }) => {
    const [account, setAccount] = useState(null);
    const [isPelagusInstalled, setIsPelagusInstalled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Check if Pelagus is installed
    useEffect(() => {
        const checkPelagus = () => {
            const installed = typeof window !== 'undefined' && Boolean(window.pelagus);
            setIsPelagusInstalled(installed);
        };

        checkPelagus();
        // Check again if window.pelagus becomes available
        window.addEventListener('pelagus#initialized', checkPelagus);
        return () => {
            window.removeEventListener('pelagus#initialized', checkPelagus);
        };
    }, []);

    // Request accounts from Pelagus
    const requestAccounts = async () => {
        if (!window.pelagus) {
            throw new Error('Pelagus wallet is not installed');
        }

        try {
            const accounts = await window.pelagus.request({
                method: 'quai_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            const address = accounts[0];
            const zone = quais.getZoneFromAddress(address);

            return {
                address,
                zone,
                shard: zone // for backwards compatibility
            };
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('Connection rejected by user');
            }
            throw error;
        }
    };

    const handleConnect = async () => {
        if (!isPelagusInstalled) {
            window.open(PELAGUS_DOWNLOAD_URL, '_blank');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const accountInfo = await requestAccounts();
            setAccount(accountInfo);
            if (onConnect) {
                onConnect(accountInfo);
            }
        } catch (err) {
            console.error('Connection error:', err);
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    // Render installation prompt if Pelagus is not installed
    if (!isPelagusInstalled) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Install Pelagus Wallet
                </button>
                <p className="text-sm text-gray-600">
                    Pelagus wallet is required to interact with this application
                </p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    {error}
                </button>
                <p className="text-sm text-gray-600">
                    Click to try again
                </p>
            </div>
        );
    }

    // Show connecting state
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

    // Show connected state
    if (account) {
        return (
            <div className="flex flex-col items-center gap-2">
                <div className="px-4 py-2 bg-green-600 text-white rounded">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </div>
                <p className="text-sm text-gray-600">
                    Zone: {account.zone}
                </p>
            </div>
        );
    }

    // Show connect button
    return (
        <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
            Connect Wallet
        </button>
    );
};

export default PelagusConnect;