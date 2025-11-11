#!/bin/bash

# Supabase MCP Integration Setup Script
# Unix/Linux/macOS version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Supabase MCP Integration...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository. Please initialize git first.${NC}"
    echo -e "${YELLOW}Run: git init${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating directory structure...${NC}"
directories=(
    "supabase/migrations"
    "scripts"
    ".github/workflows"
    "backups"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "  ${GREEN}✅ Created: $dir${NC}"
    else
        echo -e "  ${YELLOW}ℹ️  Exists: $dir${NC}"
    fi
done

# Check if Supabase CLI is installed
echo -e "${BLUE}🔧 Checking Supabase CLI...${NC}"
if command -v supabase &> /dev/null; then
    version=$(supabase --version)
    echo -e "  ${GREEN}✅ Supabase CLI found: $version${NC}"
else
    echo -e "  ${RED}❌ Supabase CLI not found${NC}"
    echo -e "  ${YELLOW}📥 Install with: npm install -g supabase${NC}"
    echo -e "  ${YELLOW}📥 Or: brew install supabase/tap/supabase${NC}"
fi

# Check if Node.js is installed
echo -e "${BLUE}🔧 Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    version=$(node --version)
    echo -e "  ${GREEN}✅ Node.js found: $version${NC}"
else
    echo -e "  ${RED}❌ Node.js not found${NC}"
    echo -e "  ${YELLOW}📥 Install from: https://nodejs.org/${NC}"
fi

# Initialize Supabase if not already done
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${BLUE}🔧 Initializing Supabase...${NC}"
    if supabase init; then
        echo -e "  ${GREEN}✅ Supabase initialized${NC}"
    else
        echo -e "  ${RED}❌ Failed to initialize Supabase${NC}"
        echo -e "  ${YELLOW}💡 Run manually: supabase init${NC}"
    fi
else
    echo -e "  ${YELLOW}ℹ️  Supabase already initialized${NC}"
fi

# Make scripts executable
echo -e "${BLUE}🔧 Making scripts executable...${NC}"
chmod +x scripts/sync_pull.sh
chmod +x scripts/sync_push.sh
echo -e "  ${GREEN}✅ Scripts made executable${NC}"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo -e "${BLUE}📝 Creating .gitignore...${NC}"
    cat > .gitignore << 'EOF'
# Supabase
supabase/.branches
supabase/.temp
supabase/logs
supabase/seed.sql

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
sync.log

# Backups
backups/
*.sql

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Dependencies
node_modules/
EOF
    echo -e "  ${GREEN}✅ Created .gitignore${NC}"
fi

# Create environment template
if [ ! -f ".env.example" ]; then
    echo -e "${BLUE}📝 Creating environment template...${NC}"
    cat > .env.example << 'EOF'
# Supabase Configuration
SUPABASE_URL='https://dbpmgzgeevgotfxsldjh.supabase.co'
SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU'
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_PROJECT_ID=your-project-id-here
SUPABASE_DB_URL=postgres://user:pass@host:port/dbname

# MCP Configuration
MCP_ENDPOINT=https://your-mcp-server.com/api/mcp
MCP_TOKEN=your-mcp-token-here

# GitHub Configuration
GITHUB_REPO=git@github.com:username/repository.git
EOF
    echo -e "  ${GREEN}✅ Created .env.example${NC}"
fi

echo -e "\n${GREEN}🎉 Setup completed!${NC}"
echo -e "\n${YELLOW}📋 Next steps:${NC}"
echo -e "1. Copy .env.example to .env and fill in your credentials"
echo -e "2. Add GitHub secrets (see README.md)"
echo -e "3. Configure Cursor MCP (see CURSOR_MCP_SETUP.md)"
echo -e "4. Run tests (see TEST.md)"
echo -e "\n${YELLOW}📚 Documentation:${NC}"
echo -e "- README.md - Main documentation"
echo -e "- CURSOR_MCP_SETUP.md - Cursor configuration"
echo -e "- TEST.md - Testing procedures"
echo -e "- SECURITY.md - Security checklist"
