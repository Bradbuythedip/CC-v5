// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CroakCityV2 is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public MAX_SUPPLY = 420;
    uint256 public constant MAX_PER_WALLET = 20;
    uint256 public MINT_PRICE = 1 ether; // 1 QUAI
    
    string private _baseTokenURI;
    uint256 private _currentTokenId;
    
    // Mapping to track free mints per wallet
    mapping(address => bool) public hasUsedFreeMint;
    // Mapping to track total mints per wallet
    mapping(address => uint256) public mintsPerWallet;
    // Mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;
    // Whitelist mapping
    mapping(address => bool) public isWhitelisted;

    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newSupply);
    event TokenBurned(uint256 tokenId, address burner);
    event WhitelistUpdated(address account, bool status);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function mint() external payable {
        require(_currentTokenId < MAX_SUPPLY, "All tokens have been minted");
        require(mintsPerWallet[msg.sender] < MAX_PER_WALLET, "Max mints per wallet reached");
        
        // Check if it's a free mint or whitelisted
        if (!hasUsedFreeMint[msg.sender] || isWhitelisted[msg.sender]) {
            if (!hasUsedFreeMint[msg.sender]) {
                hasUsedFreeMint[msg.sender] = true;
            }
        } else {
            require(msg.value >= MINT_PRICE, "Incorrect payment amount");
            // Forward payment directly to treasury
            (bool success, ) = TREASURY.call{value: msg.value}("");
            require(success, "Payment transfer failed");
        }

        _currentTokenId++;
        mintsPerWallet[msg.sender]++;
        _safeMint(msg.sender, _currentTokenId);
    }

    function batchMint(uint256 quantity) external payable {
        require(_currentTokenId + quantity <= MAX_SUPPLY, "Would exceed max supply");
        require(mintsPerWallet[msg.sender] + quantity <= MAX_PER_WALLET, "Would exceed max per wallet");
        
        uint256 totalCost = 0;
        if (!isWhitelisted[msg.sender]) {
            if (!hasUsedFreeMint[msg.sender]) {
                hasUsedFreeMint[msg.sender] = true;
                totalCost = MINT_PRICE * (quantity - 1);
            } else {
                totalCost = MINT_PRICE * quantity;
            }
        }
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        for(uint256 i = 0; i < quantity; i++) {
            _currentTokenId++;
            mintsPerWallet[msg.sender]++;
            _safeMint(msg.sender, _currentTokenId);
        }
        
        if (totalCost > 0) {
            (bool success, ) = TREASURY.call{value: totalCost}("");
            require(success, "Payment transfer failed");
        }
        
        // Return excess payment if any
        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Only token owner can burn");
        _burn(tokenId);
        emit TokenBurned(tokenId, msg.sender);
    }

    function totalSupply() public view returns (uint256) {
        return _currentTokenId;
    }

    function maxSupply() public view returns (uint256) {
        return MAX_SUPPLY;
    }

    function hasFreeMint(address wallet) public view returns (bool) {
        return !hasUsedFreeMint[wallet];
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Owner functions
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function updateMintPrice(uint256 _price) external onlyOwner {
        MINT_PRICE = _price;
        emit MintPriceUpdated(_price);
    }

    function updateMaxSupply(uint256 _supply) external onlyOwner {
        require(_supply > _currentTokenId, "New supply must be greater than current minted supply");
        MAX_SUPPLY = _supply;
        emit MaxSupplyUpdated(_supply);
    }

    function setWhitelist(address[] calldata accounts, bool status) external onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            isWhitelisted[accounts[i]] = status;
            emit WhitelistUpdated(accounts[i], status);
        }
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) external onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    address public constant TREASURY = 0x001Eb937e54b93EeF35E765c5074e8e643D3887E;

    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = TREASURY.call{value: balance}("");
        require(success, "Transfer failed");
    }

    // Override ERC721URIStorage functions
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }
}