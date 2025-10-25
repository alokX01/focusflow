#!/bin/bash

# Clean and Start Script for FocusFlow App
# This script cleans the build cache and starts the development server

echo "🧹 Cleaning build cache..."

# Remove .next directory if it exists
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Removed .next directory"
fi

# Remove node_modules if it exists (optional - uncomment if needed)
# if [ -d "node_modules" ]; then
#     rm -rf node_modules
#     echo "✅ Removed node_modules directory"
# fi

echo "🚀 Starting development server..."
npm run dev
