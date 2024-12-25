const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers;

describe("CroakCity", function () {
  let CroakCity;
  let croakCity;
  let owner;
  let addr1;
  let addr2;
  let treasury;
  const name = "Croak City";
  const symbol = "CROAK";
  const baseURI = "ipfs://QmYourBaseURI/";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    treasury = "0x001Eb937e54b93EeF35E765c5074e8e643D3887E";
    
    CroakCity = await ethers.getContractFactory("CroakCity");
    croakCity = await CroakCity.deploy(name, symbol, baseURI);
    await croakCity.setMintingEnabled(true);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await croakCity.owner()).to.equal(owner.address);
    });

    it("Should set the right name and symbol", async function () {
      expect(await croakCity.name()).to.equal(name);
      expect(await croakCity.symbol()).to.equal(symbol);
    });

    it("Should set the right base URI", async function () {
      const tokenId = 1;
      await croakCity.connect(addr1).mint({ value: parseEther("0") }); // Free mint
      expect(await croakCity.tokenURI(tokenId)).to.equal(baseURI + tokenId.toString());
    });
  });

  describe("Minting", function () {
    it("Should allow free mint for first mint per wallet", async function () {
      await expect(croakCity.connect(addr1).mint())
        .to.not.be.reverted;
      
      expect(await croakCity.hasFreeMint(addr1.address)).to.equal(false);
      expect(await croakCity.totalSupply()).to.equal(1);
      expect(await croakCity.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should require payment for subsequent mints", async function () {
      // First mint (free)
      await croakCity.connect(addr1).mint();
      
      // Second mint (should require payment)
      await expect(croakCity.connect(addr1).mint())
        .to.be.revertedWith("Incorrect payment amount");

      // Second mint with correct payment
      await expect(croakCity.connect(addr1).mint({ value: parseEther("1") }))
        .to.not.be.reverted;
    });

    it("Should enforce max mints per wallet", async function () {
      // Do free mint first
      await croakCity.connect(addr1).mint();

      // Do remaining mints up to MAX_PER_WALLET
      for(let i = 1; i < 20; i++) {
        await croakCity.connect(addr1).mint({ value: parseEther("1") });
      }

      // Try to mint one more
      await expect(croakCity.connect(addr1).mint({ value: parseEther("1") }))
        .to.be.revertedWith("Max mints per wallet reached");
    });

    it("Should not allow minting when disabled", async function () {
      await croakCity.setMintingEnabled(false);
      await expect(croakCity.connect(addr1).mint())
        .to.be.revertedWith("Minting is not enabled");
    });

    it("Should not allow minting beyond max supply", async function () {
      // Enable minting
      await croakCity.setMintingEnabled(true);

      // We need at least 21 different addresses to mint all 420 tokens
      // (since each address can mint 20 tokens max)
      const requiredSigners = Math.ceil(420 / 20);
      
      // Get the default signers
      const signers = await ethers.getSigners();
      
      // Create additional signers if needed
      const allSigners = [...signers];
      while (allSigners.length < requiredSigners) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        // Fund the wallet with enough ETH for minting
        await owner.sendTransaction({
          to: wallet.address,
          value: parseEther("21") // Enough for 20 mints plus gas
        });
        allSigners.push(wallet);
      }
      
      // Mint up to MAX_SUPPLY using different wallets
      for(let i = 0; i < 420; i++) {
        const signerIndex = Math.floor(i / 20); // Use a new signer for each batch of 20
        const signer = allSigners[signerIndex];
        
        if (await croakCity.hasFreeMint(signer.address)) {
          await croakCity.connect(signer).mint();
        } else {
          await croakCity.connect(signer).mint({ value: parseEther("1") });
        }
      }

      // Try to mint one more
      await expect(croakCity.connect(addr1).mint({ value: parseEther("1") }))
        .to.be.revertedWith("All tokens have been minted");
    });

    it("Should forward payments to treasury", async function () {
      // Get initial treasury balance
      const initialBalance = await ethers.provider.getBalance(treasury);

      // Do a paid mint
      await croakCity.connect(addr1).mint(); // Free mint first
      await croakCity.connect(addr1).mint({ value: parseEther("1") }); // Paid mint

      // Check treasury balance increased
      const finalBalance = await ethers.provider.getBalance(treasury);
      expect(finalBalance - initialBalance).to.equal(parseEther("1"));
    });
  });

  describe("URI Handling", function () {
    it("Should allow owner to update base URI", async function () {
      const newBaseURI = "ipfs://QmNewBaseURI/";
      await croakCity.setBaseURI(newBaseURI);
      
      // Mint a token to test URI
      await croakCity.connect(addr1).mint();
      expect(await croakCity.tokenURI(1)).to.equal(newBaseURI + "1");
    });
  });
});