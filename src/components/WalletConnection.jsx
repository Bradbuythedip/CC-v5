import React, { useState } from 'react';
import PelagusConnect from './PelagusConnect';
import PelagusInstructions from './PelagusInstructions';

const WalletConnection = ({ onConnect }) => {
    const [showInstructions, setShowInstructions] = useState(false);

    const handleConnect = (accountInfo) => {
        if (onConnect) {
            onConnect(accountInfo);
        }
        setShowInstructions(false);
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <div className="flex flex-col items-center gap-4">
                <PelagusConnect onConnect={handleConnect} />
                
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-blue-600 hover:underline text-sm"
                >
                    {showInstructions ? 'Hide Instructions' : 'Need help getting started?'}
                </button>
                
                {showInstructions && <PelagusInstructions />}
            </div>
        </div>
    );
};

export default WalletConnection;