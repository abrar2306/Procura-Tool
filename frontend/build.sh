#!/bin/bash
# Build script for Render (Frontend)
# This will be executed from the `frontend` root directory based on render.yaml

set -e

# Install dependencies using yarn
yarn install

# Build the frontend (React/Craco)
yarn build
