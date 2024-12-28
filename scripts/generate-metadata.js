import fs from 'fs';
import path from 'path';

const TOTAL_SUPPLY = 420;
const BASE_DIR = path.join(process.cwd(), 'public/assets/json');

// Create the directory if it doesn't exist
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Generate metadata for each token
for (let i = 1; i <= TOTAL_SUPPLY; i++) {
  const metadata = {
    name: `Croak City #${i}`,
    description: "A unique Croak City NFT collection on Quai Network",
    image: `https://www.croakcity.com/assets/images/${i}.jpg`,
    attributes: [
      {
        trait_type: "Edition",
        value: i.toString()
      }
    ]
  };

  // Write the metadata file
  fs.writeFileSync(
    path.join(BASE_DIR, i.toString()),
    JSON.stringify(metadata, null, 2)
  );
}

console.log(`Generated metadata for ${TOTAL_SUPPLY} tokens`);