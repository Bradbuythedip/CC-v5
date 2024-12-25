import fetch from 'node-fetch';

async function main() {
    try {
        const contractAddress = "0x0062481f93e27cdb73ce0fa173c3251dffe40127";
        
        // Make a direct RPC call to get contract code first
        const response = await fetch("https://rpc.quai.network/cyprus1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getCode",
                params: [contractAddress, "latest"]
            })
        });

        const result = await response.json();
        console.log("\nVerifying contract at", contractAddress);
        console.log("Contract code length:", (result.result.length - 2) / 2, "bytes");
        console.log("Contract exists:", result.result !== "0x");

        if (result.result === "0x") {
            console.log("ERROR: No contract code found at address");
            process.exit(1);
        }

        // Now let's try to call some view functions
        const calls = [
            { method: "eth_call", name: "name()", selector: "0x06fdde03" },
            { method: "eth_call", name: "symbol()", selector: "0x95d89b41" },
            { method: "eth_call", name: "totalSupply()", selector: "0x18160ddd" },
            { method: "eth_call", name: "maxSupply()", selector: "0xd5abeb01" }
        ];

        console.log("\nQuerying contract functions:");
        for (const call of calls) {
            const response = await fetch("https://rpc.quai.network/cyprus1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: call.method,
                    params: [{
                        to: contractAddress,
                        data: call.selector
                    }, "latest"]
                })
            });

            const result = await response.json();
            if (result.error) {
                console.log(`${call.name} - Error:`, result.error.message);
            } else {
                // Decode the result based on the function
                let decoded = result.result;
                if (call.name === "name()" || call.name === "symbol()") {
                    // Decode string: skip first 32 bytes (length position) and read length from next 32 bytes
                    const lengthHex = decoded.slice(66, 130);
                    const length = parseInt(lengthHex, 16);
                    const stringHex = decoded.slice(130, 130 + (length * 2));
                    decoded = Buffer.from(stringHex, 'hex').toString();
                } else {
                    // Decode uint256
                    decoded = parseInt(decoded, 16).toString();
                }
                console.log(`${call.name} - Result:`, decoded);
            }
        }
        
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });