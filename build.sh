#!/bin/bash
set -e

echo "Building Procura Monolithic Deployment for Render..."

# 1. Install and Build Frontend
echo ">>> Building Frontend..."
cd frontend
yarn install
# In a monolithic setup, the frontend should hit the same origin for the API
export REACT_APP_BACKEND_URL=""
yarn build
cd ..

# 2. Install Backend Dependencies
echo ">>> Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "Build complete! Start with: cd backend && uvicorn server:app --host 0.0.0.0 --port \$PORT"
