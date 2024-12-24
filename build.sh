#!/bin/bash

echo "Starting build process..."

# Install tree for directory visualization
apt-get update && apt-get install -y tree

# Build the project
echo "Running Vite build..."
npm run build

# Create the images directory in dist if it doesn't exist
echo "Creating images directory..."
mkdir -p dist/assets/images

# Copy all images from public to dist
echo "Copying images..."
cp -rv public/assets/images/* dist/assets/images/

# Verify the copy
echo "Verifying image copy..."
echo "Number of images copied:"
find dist/assets/images -type f | wc -l
echo "Checking specific image:"
ls -la dist/assets/images/1.png

echo "Directory structure:"
tree dist/assets

echo "File permissions:"
ls -la dist/assets/images/

echo "Build complete!"