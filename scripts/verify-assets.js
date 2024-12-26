import fetch from 'node-fetch';

const BASE_URL = 'https://www.croakcity.com';
const TOTAL_NFTS = 5; // Testing first 5 NFTs

async function verifyAssets() {
    console.log('Starting asset verification...');
    
    const results = {
        json: { success: 0, failed: [] },
        images: { success: 0, failed: [] }
    };

    for (let i = 1; i <= TOTAL_NFTS; i++) {
        // Verify JSON
        try {
            const jsonRes = await fetch(`${BASE_URL}/assets/json/${i}.json`);
            if (jsonRes.ok) {
                results.json.success++;
            } else {
                results.json.failed.push(i);
            }
        } catch (err) {
            results.json.failed.push(i);
        }

        // Verify Image
        try {
            const imageRes = await fetch(`${BASE_URL}/assets/images/${i}.png`);
            if (imageRes.ok) {
                results.images.success++;
            } else {
                results.images.failed.push(i);
            }
        } catch (err) {
            results.images.failed.push(i);
        }

        if (i % 50 === 0) {
            console.log(`Verified ${i}/${TOTAL_NFTS} assets...`);
        }
    }

    console.log('\nVerification Results:');
    console.log('JSON Files:');
    console.log(`- Successfully verified: ${results.json.success}`);
    console.log(`- Failed to verify: ${results.json.failed.length}`);
    if (results.json.failed.length > 0) {
        console.log(`- Failed IDs: ${results.json.failed.join(', ')}`);
    }

    console.log('\nImage Files:');
    console.log(`- Successfully verified: ${results.images.success}`);
    console.log(`- Failed to verify: ${results.images.failed.length}`);
    if (results.images.failed.length > 0) {
        console.log(`- Failed IDs: ${results.images.failed.join(', ')}`);
    }
}

verifyAssets().catch(console.error);