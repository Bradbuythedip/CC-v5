import { quais } from 'quais';

// Contract ABI - you'll need to import your actual ABI
const CONTRACT_ABI = [
    "function mint() public payable",
    "function hasFreeMint(address) public view returns (bool)",
    "function mintingEnabled() public view returns (bool)",
    "function MINT_PRICE() public view returns (uint256)"
];

export class ContractSetup {
    constructor(provider) {
        this.provider = provider;
        this.contractAddress = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
        if (!this.contractAddress) {
            throw new Error('Contract address not found in environment variables');
        }
    }

    async initialize() {
        try {
            // Get signer
            this.signer = this.provider.getSigner();
            
            // Create contract instance
            this.contract = new quais.Contract(
                this.contractAddress,
                CONTRACT_ABI,
                this.signer
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

            // Check if minting is enabled
            const mintingEnabled = await this.contract.mintingEnabled();
            if (!mintingEnabled) {
                throw new Error('Minting is not enabled');
            }

            // Check if user has free mint
            const hasFreeMint = await this.contract.hasFreeMint(userAddress);
            
            // Get mint price if not free mint
            let value = '0';
            if (!hasFreeMint) {
                const mintPrice = await this.contract.MINT_PRICE();
                value = mintPrice.toString();
            }

            // Prepare transaction
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

export const setupContract = async (provider) => {
    const setup = new ContractSetup(provider);
    await setup.initialize();
    return setup;
};