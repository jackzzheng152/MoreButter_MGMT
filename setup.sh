#!/bin/bash

setup_venv() {
    # 1. Create virtual environment in .venv
    python3 -m venv .venv

    # 2. Activate it
    source .venv/bin/activate

    # 3. Upgrade pip (good practice)
    pip install --upgrade pip

    # 4. Install dependencies from requirements.txt
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt
    else
        echo "requirements.txt not found!"
    fi
}

# Run the setup function
setup_venv

echo "Virtual environment setup complete!"
echo "To activate in the future, run: source .venv/bin/activate"
