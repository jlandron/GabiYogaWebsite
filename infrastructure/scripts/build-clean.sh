#!/bin/bash
# This script cleans the build directory to avoid TypeScript file conflicts

echo "Cleaning up the dist directory..."

# Remove all files in the dist directory
if [ -d "dist" ]; then
  rm -rf dist/*
  echo "Dist directory cleaned successfully."
else
  mkdir -p dist
  echo "Dist directory created."
fi

# Exit successfully
exit 0
