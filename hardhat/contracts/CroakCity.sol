// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CroakCity is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 420;
    uint256 public constant MAX_PER_WALLET = 20;
    uint256 public constant MINT_PRICE = 1 ether; // 1 QUAI
    
    string private _baseTokenURI;
    uint256 private _currentTokenId;
    
    // Mapping to track free mints per wallet
    mapping(address => bool) public hasUsedFreeMint;
    // Mapping to track total mints per wallet
    mapping(address => uint256) public mintsPerWallet;

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
        
        // Check if it's a free mint
        if (!hasUsedFreeMint[msg.sender]) {
            hasUsedFreeMint[msg.sender] = true;
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

    function totalSupply() public view returns (uint256) {
        return _currentTokenId;
    }

    function maxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function hasFreeMint(address wallet) public view returns (bool) {
        return !hasUsedFreeMint[wallet];
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    address public constant TREASURY = 0x001Eb937e54b93EeF35E765c5074e8e643D3887E;

    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = TREASURY.call{value: balance}("");
        require(success, "Transfer failed");
    }
}