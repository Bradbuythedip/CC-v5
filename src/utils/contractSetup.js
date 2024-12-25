import { quais } from 'quais';

// Contract ABI - you'll need to import your actual ABI
const CONTRACT_ABI = [
    "function mint() public payable",
    "function hasFreeMint(address) public view returns (bool)",
    "function mintingEnabled() public view returns (bool)",
    "function MINT_PRICE() public view returns (uint256)"
];

export class ContractSetup {
    constructor() {
        this.contractAddress = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
        this.rpcUrl = import.meta.env.VITE_QUAI_RPC_URL;
        
        if (!this.contractAddress) {
            throw new Error('Contract address not found in environment variables');
        }
        if (!this.rpcUrl) {
            throw new Error('RPC URL not found in environment variables');
        }
    }

    async initialize() {
        try {
            if (!window.pelagus) {
                throw new Error('Pelagus wallet not found');
            }

            // Create Web3Provider
            this.provider = new quais.providers.Web3Provider(window.pelagus, {
                name: 'Cyprus-1',
                chainId: 9000,
            });

            // Create JsonRpcProvider as fallback
            this.fallbackProvider = new quais.providers.JsonRpcProvider(this.rpcUrl);

            // Get signer
            this.signer = this.provider.getSigner();
            
            // Create contract instance with signer
            this.contract = new quais.Contract(
                this.contractAddress,
                CONTRACT_ABI,
                this.signer
            );

            // Also create a read-only contract instance with fallback provider
            this.readContract = new quais.Contract(
                this.contractAddress,
                CONTRACT_ABI,
                this.fallbackProvider
            );

            return this.contract;
        } catch (error) {
            console.error('Error initializing contract:', error);
            throw error;
        }
    }

    async mint(userAddress) {
        try {
            if (!this.contract) {
                await this.initialize();
            }

            // Use read-only contract for view functions to avoid wallet prompts
            const mintingEnabled = await this.readContract.mintingEnabled();
            if (!mintingEnabled) {
                throw new Error('Minting is not enabled');
            }

            const hasFreeMint = await this.readContract.hasFreeMint(userAddress);
            
            // Get mint price if not free mint
            let value = '0';
            if (!hasFreeMint) {
                const mintPrice = await this.readContract.MINT_PRICE();
                value = mintPrice.toString();
            }

            // Now use the signer contract for the actual mint
            const tx = await this.contract.mint({
                value: value,
                gasLimit: 500000
            });

            // Wait for transaction
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error('Mint error:', error);
            throw error;
        }
    }
}

export const setupContract = async () => {
    const setup = new ContractSetup();
    await setup.initialize();
    return setup;
};