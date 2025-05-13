#!/bin/bash

# Exit on error
set -e

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads
mkdir -p data/metadata

# Set environment variables
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Start the server using gunicorn for production
gunicorn src.core.server:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 