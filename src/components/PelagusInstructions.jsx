import React from 'react';

const PelagusInstructions = () => {
    return (
        <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Getting Started with Pelagus</h2>
            
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold mb-2">1. Install Pelagus Wallet</h3>
                    <p className="text-gray-600">
                        Install the Pelagus wallet extension from the{' '}
                        <a 
                            href="https://chrome.google.com/webstore/detail/pelagus/gaegollnpijhedifeeeepdoffkgfcmbc"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Chrome Web Store
                        </a>
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold mb-2">2. Connect to Cyprus-1 Network</h3>
                    <p className="text-gray-600">
                        Once installed, open Pelagus and ensure you're connected to the Cyprus-1 network.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold mb-2">3. Create or Import an Account</h3>
                    <p className="text-gray-600">
                        If you haven't already, create a new account or import an existing one in Pelagus.
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold mb-2">4. Connect to Application</h3>
                    <p className="text-gray-600">
                        Click the "Connect Wallet" button above and approve the connection request in Pelagus.
                    </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-semibold mb-2">Note about Sharding</h3>
                    <p className="text-gray-600">
                        Quai Network uses a sharded address space. Your account's address determines which shard (zone) 
                        you're interacting with. Make sure you're using an address in the correct zone for the 
                        intended transaction.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PelagusInstructions;