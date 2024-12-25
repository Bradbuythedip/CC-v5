const { ethers } = require('ethers');

function generateNonZeroAddress() {
    let wallet;
    do {
        wallet = ethers.Wallet.createRandom();
        // Check if address starts with 0x00
    } while (wallet.address.toLowerCase().startsWith('0x00'));
    
    console.log('Private Key:', wallet.privateKey);
    console.log('Address:', wallet.address);
    console.log('Address (lowercase):', wallet.address.toLowerCase());
}

generateNonZeroAddress();