// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CroakCity is ERC721, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    uint256 public constant MAX_SUPPLY = 420;
    uint256 public constant MAX_PER_WALLET = 20;
    uint256 public constant MINT_PRICE = 1 ether; // 1 QUAI
    
    string private _baseTokenURI;
    Counters.Counter private _tokenIds;
    address public immutable treasury;
    bool public mintingEnabled;
    
    // Mapping to track free mints per wallet
    mapping(address => bool) public hasUsedFreeMint;
    // Mapping to track total mints per wallet
    mapping(address => uint256) public mintsPerWallet;

    event MintEnabled(bool enabled);
    event BaseURIChanged(string baseURI);
    event NFTMinted(address indexed to, uint256 indexed tokenId, bool wasFreeMint);

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address _treasury
    ) ERC721(name, symbol) {
        require(_treasury != address(0), "Invalid treasury address");
        _baseTokenURI = baseURI;
        treasury = _treasury;
        mintingEnabled = true; // Enable minting by default
    }

    function mint() external payable {
        require(mintingEnabled, "Minting is not enabled");
        require(_tokenIds.current() < MAX_SUPPLY, "All tokens have been minted");
        require(mintsPerWallet[msg.sender] < MAX_PER_WALLET, "Max mints per wallet reached");
        
        bool isFreeMint = !hasUsedFreeMint[msg.sender];
        
        // Handle payment
        if (isFreeMint) {
            hasUsedFreeMint[msg.sender] = true;
        } else {
            require(msg.value >= MINT_PRICE, "Incorrect payment amount");
            (bool success, ) = treasury.call{value: msg.value}("");
            require(success, "Payment transfer failed");
        }

        // Mint token
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        mintsPerWallet[msg.sender]++;
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, isFreeMint);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
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
        emit BaseURIChanged(baseURI);
    }

    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintEnabled(enabled);
    }

    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = treasury.call{value: balance}("");
        require(success, "Transfer failed");
    }
}