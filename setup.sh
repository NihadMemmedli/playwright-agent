#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Setting up Playwright Agent...${NC}"

# 0. Prerequisite Check
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed! Please install Docker to use the database.${NC}"
    exit 1
fi
echo "Docker is installed."

# 1. Python Environment
echo -e "\n${YELLOW}Checking Python environment...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

source venv/bin/activate

# 2. Python Dependencies
echo -e "\n${YELLOW}Installing Python dependencies (including Database drivers)...${NC}"
pip install --upgrade pip
if [ -f "pyproject.toml" ]; then
    pip install -e .
elif [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo -e "${RED}pyproject.toml not found!${NC}"
    exit 1
fi

# 3. Node.js Environment (Test Runner)
echo -e "\n${YELLOW}Installing Root Dependencies (Playwright)...${NC}"
if [ -f "package.json" ]; then
    echo "Installing npm dependencies in root..."
    npm install
else
    echo -e "${RED}package.json not found in root!${NC}"
fi

# 4. Playwright Browsers
echo -e "\n${YELLOW}Installing Playwright browsers...${NC}"
npx playwright install

# 5. Node.js Environment (Frontend)
echo -e "\n${YELLOW}Setting up Frontend (Web UI)...${NC}"
if [ -d "web" ]; then
    cd web
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
    else
        echo "Node modules command already exists."
    fi
    cd ..
else
    echo -e "${RED}web directory not found!${NC}"
fi

# 6. Environment Check
echo -e "\n${YELLOW}Checking configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}.env created. Please edit it with your API keys.${NC}"
    else
        echo -e "${RED}.env.example not found!${NC}"
    fi
else
    echo ".env file exists."
fi

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "To start the application, run: ${YELLOW}make dev${NC}"
echo -e "To run a spec manually, run: ${YELLOW}make run SPEC=path/to/spec.md${NC}"
