#!/bin/bash

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    source ../venv/bin/activate
fi

# Install requirements
pip install -r ../requirements.txt

# Set environment variables
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Run the server
python ../src/core/server.py 