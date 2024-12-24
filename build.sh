#!/bin/bash

# Build the project
npm run build

# Create the images directory in dist if it doesn't exist
mkdir -p dist/assets/images

# Copy all images from public to dist
cp -r public/assets/images/* dist/assets/images/

# Verify the copy
echo "Verifying image copy..."
ls -la dist/assets/images/

echo "Build complete!"