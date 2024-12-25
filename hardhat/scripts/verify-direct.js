const fetch = require('node-fetch');

async function main() {
    try {
        // Make a direct RPC call to get contract code first
        const response = await fetch("https://rpc.quai.network/cyprus1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getCode",
                params: [
                    "0x0062481f93e27cdb73ce0fa173c3251dffe40127",
                    "latest"
                ]
            })
        });

        const result = await response.json();
        console.log("\nContract code length:", (result.result.length - 2) / 2, "bytes");
        console.log("Contract exists:", result.result !== "0x");
        
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