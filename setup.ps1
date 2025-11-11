# Supabase MCP Integration Setup Script
# Windows PowerShell version

Write-Host "🚀 Setting up Supabase MCP Integration..." -ForegroundColor Green

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repository. Please initialize git first." -ForegroundColor Red
    Write-Host "Run: git init" -ForegroundColor Yellow
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating directory structure..." -ForegroundColor Blue
$directories = @(
    "supabase/migrations",
    "scripts",
    ".github/workflows",
    "backups"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Exists: $dir" -ForegroundColor Yellow
    }
}

# Check if Supabase CLI is installed
Write-Host "🔧 Checking Supabase CLI..." -ForegroundColor Blue
try {
    $supabaseVersion = supabase --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
    } else {
        throw "Supabase CLI not found"
    }
} catch {
    Write-Host "  ❌ Supabase CLI not found" -ForegroundColor Red
    Write-Host "  📥 Install with: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "  📥 Or: winget install Supabase.CLI" -ForegroundColor Yellow
}

# Check if Node.js is installed
Write-Host "🔧 Checking Node.js..." -ForegroundColor Blue
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "  ❌ Node.js not found" -ForegroundColor Red
    Write-Host "  📥 Install from: https://nodejs.org/" -ForegroundColor Yellow
}

# Initialize Supabase if not already done
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "🔧 Initializing Supabase..." -ForegroundColor Blue
    try {
        supabase init
        Write-Host "  ✅ Supabase initialized" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to initialize Supabase" -ForegroundColor Red
        Write-Host "  💡 Run manually: supabase init" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ️  Supabase already initialized" -ForegroundColor Yellow
}

# Create .gitignore if it doesn't exist
if (-not (Test-Path ".gitignore")) {
    Write-Host "📝 Creating .gitignore..." -ForegroundColor Blue
    @"
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
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "  ✅ Created .gitignore" -ForegroundColor Green
}

# Create environment template
if (-not (Test-Path ".env.example")) {
    Write-Host "📝 Creating environment template..." -ForegroundColor Blue
    @"
# Supabase Configuration
SUPABASE_URL='https://dbpmgzgeevgotfxsldjh.supabase.co'
SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU'
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'
SUPABASE_PROJECT_ID='your-project-id-here'
SUPABASE_DB_URL='postgres://user:pass@host:port/dbname'

"@ | Out-File -FilePath ".env.example" -Encoding UTF8
    Write-Host "  ✅ Created .env.example" -ForegroundColor Green
}

Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.example to .env and fill in your credentials" -ForegroundColor White
Write-Host "2. Add GitHub secrets (see README.md)" -ForegroundColor White
Write-Host "3. Configure Cursor MCP (see CURSOR_MCP_SETUP.md)" -ForegroundColor White
Write-Host "4. Run tests (see TEST.md)" -ForegroundColor White
Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "- README.md - Main documentation" -ForegroundColor White
Write-Host "- CURSOR_MCP_SETUP.md - Cursor configuration" -ForegroundColor White
Write-Host "- TEST.md - Testing procedures" -ForegroundColor White
Write-Host "- SECURITY.md - Security checklist" -ForegroundColor White
