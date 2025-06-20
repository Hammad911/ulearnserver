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
mkdir -p logs

# Set environment variables
export PYTHONPATH=$PYTHONPATH:$(pwd)/..
export ENVIRONMENT=production

# Check if Redis is installed and running
if ! command -v redis-cli &> /dev/null; then
    echo "Redis is not installed. Installing Redis..."
    if [ "$(uname)" == "Darwin" ]; then
        brew install redis
    elif [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y redis-server
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y redis
    fi
fi

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo "Starting Redis server..."
    if [ "$(uname)" == "Darwin" ]; then
        brew services start redis
    else
        sudo systemctl start redis
    fi
fi

# Start the server using gunicorn for production with increased workers
gunicorn src.core.server:app \
    --workers 8 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log \
    --log-level info \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 