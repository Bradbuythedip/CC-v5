export const NFT_ABI = [
  // View Functions
  "function totalSupply() public view returns (uint256)",
  "function maxSupply() public view returns (uint256)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function tokenURI(uint256) public view returns (string)",
  "function hasFreeMint(address) public view returns (bool)",
  "function mintsPerWallet(address) public view returns (uint256)",
  "function isWhitelisted(address) public view returns (bool)",
  "function MINT_PRICE() public view returns (uint256)",
  
  // State-Changing Functions
  "function mint() public payable",
  "function batchMint(uint256 quantity) public payable",
  "function burn(uint256 tokenId) public",
  
  // Owner Functions
  "function updateMintPrice(uint256 _price) public",
  "function updateMaxSupply(uint256 _supply) public",
  "function setWhitelist(address[] calldata accounts, bool status) public",
  "function setTokenURI(uint256 tokenId, string memory _tokenURI) public",
  "function withdraw() public",
  
  // Events
  "event MintPriceUpdated(uint256 newPrice)",
  "event MaxSupplyUpdated(uint256 newSupply)",
  "event TokenBurned(uint256 tokenId, address burner)",
  "event WhitelistUpdated(address account, bool status)"
] as const;

export interface NFTContractType {
  totalSupply: () => Promise<bigint>;
  maxSupply: () => Promise<bigint>;
  name: () => Promise<string>;
  symbol: () => Promise<string>;
  tokenURI: (tokenId: bigint) => Promise<string>;
  hasFreeMint: (address: string) => Promise<boolean>;
  mintsPerWallet: (address: string) => Promise<bigint>;
  isWhitelisted: (address: string) => Promise<boolean>;
  MINT_PRICE: () => Promise<bigint>;
  mint: (overrides?: { value?: bigint }) => Promise<any>;
  batchMint: (quantity: bigint, overrides?: { value?: bigint }) => Promise<any>;
  burn: (tokenId: bigint) => Promise<any>;
  updateMintPrice: (price: bigint) => Promise<any>;
  updateMaxSupply: (supply: bigint) => Promise<any>;
  setWhitelist: (accounts: string[], status: boolean) => Promise<any>;
  setTokenURI: (tokenId: bigint, tokenURI: string) => Promise<any>;
  withdraw: () => Promise<any>;
}