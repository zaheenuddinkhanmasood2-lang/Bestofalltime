# Auto Sync Script for GitHub Repository
# This script automatically syncs your local code with the GitHub repository

param(
    [switch]$Pull,
    [switch]$Push,
    [switch]$Status,
    [switch]$Auto
)

# Configuration
$GITHUB_REPO = "https://github.com/zaheenuddinkhanmasood2-lang/Allaho.git"
$SSH_REPO = "git@github.com:zaheenuddinkhanmasood2-lang/Allaho.git"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[OK] $Message" "Green"
}

function Write-ErrMsg {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Cyan"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARN] $Message" "Yellow"
}

# Check if git is installed
function Test-GitInstalled {
    try {
        $gitVersion = git --version 2>$null
        if ($LASTEXITCODE -eq 0 -or $gitVersion) {
            Write-Info "Git found: $gitVersion"
            return $true
        }
        Write-ErrMsg "Git is not installed. Please install Git first."
        return $false
    } catch {
        Write-ErrMsg "Git is not installed. Please install Git first."
        return $false
    }
}

# Check if we're in a git repository
function Test-GitRepository {
    try {
        $result = git rev-parse --git-dir 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Git repository detected"
            return $true
        }
        Write-ErrMsg "Not in a git repository. Initializing..."
        git init
        git remote add origin $GITHUB_REPO
        Write-Success "Git repository initialized"
        return $true
    } catch {
        Write-ErrMsg "Not in a git repository. Initializing..."
        git init
        git remote add origin $GITHUB_REPO
        Write-Success "Git repository initialized"
        return $true
    }
}

# Get current branch
function Get-CurrentBranch {
    $branch = git branch --show-current
    return $branch
}

# Check repository status
function Show-Status {
    Write-Info "Checking repository status..."
    
    $currentBranch = Get-CurrentBranch
    Write-Info "Current branch: $currentBranch"
    
    Write-Info "`nRemote status:"
    git remote -v
    
    Write-Info "`nLocal branch status:"
    git status --short
    
    Write-Info "`nRecent commits:"
    git log --oneline -5 2>$null
}

# Pull latest changes from GitHub
function Sync-Pull {
    Write-Info "Pulling latest changes from GitHub..."
    
    $currentBranch = Get-CurrentBranch
    
    try {
        # Fetch latest changes
        Write-Info "Fetching from origin..."
        git fetch origin $currentBranch 2>$null
        
        # Check if there are remote changes
        $localCommit = git rev-parse $currentBranch 2>$null
        $remoteCommit = git rev-parse origin/$currentBranch 2>$null
        
        if ($localCommit -eq $remoteCommit) {
            Write-Success "Already up to date with origin/$currentBranch"
            return $true
        }
        
        # Check for uncommitted local changes
        git diff --quiet
        $hasChanges = $LASTEXITCODE -ne 0
        
        if ($hasChanges) {
            Write-Warning "You have uncommitted local changes"
            
            # Stash changes before pull
            Write-Info "Stashing local changes..."
            git stash
            
            # Pull changes
            git pull origin $currentBranch
            
            # Restore stashed changes
            Write-Info "Restoring stashed changes..."
            $stashList = git stash list
            if ($stashList) {
                git stash pop
                Write-Success "Local changes restored"
            }
        } else {
            # No uncommitted changes, safe to pull
            git pull origin $currentBranch
        }
        
        Write-Success "Successfully pulled changes from GitHub"
        return $true
    } catch {
        Write-ErrMsg "Failed to pull changes: $_"
        return $false
    }
}

# Push local changes to GitHub
function Sync-Push {
    Write-Info "Pushing local changes to GitHub..."
    
    $currentBranch = Get-CurrentBranch
    
    # Check if there are changes to commit
    git diff --quiet
    $hasChanges = $LASTEXITCODE -ne 0
    
    git diff --cached --quiet
    $hasStagedChanges = $LASTEXITCODE -ne 0
    
    if ($hasChanges -or $hasStagedChanges) {
        Write-Warning "You have uncommitted changes"
        
        $response = Read-Host "Do you want to commit these changes? (y/n)"
        if ($response -eq 'y') {
            $commitMessage = Read-Host "Enter commit message"
            if ([string]::IsNullOrWhiteSpace($commitMessage)) {
                $commitMessage = "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            }
            
            git add .
            git commit -m $commitMessage
            Write-Success "Changes committed"
        } else {
            Write-Info "Skipping commit. Only pushing existing commits..."
        }
    }
    
    try {
        # Push to GitHub
        Write-Info "Pushing to origin/$currentBranch..."
        git push origin $currentBranch
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully pushed changes to GitHub"
            return $true
        } else {
            Write-ErrMsg "Failed to push changes"
            Write-Warning "You may need to set up authentication or pull first"
            return $false
        }
    } catch {
        Write-ErrMsg "Failed to push changes: $_"
        Write-Warning "You may need to set up authentication or pull first"
        return $false
    }
}

# Auto-sync: pull first, then push
function Sync-Auto {
    Write-Info "Starting auto-sync..."
    
    # Pull first
    $pullSuccess = Sync-Pull
    
    # Then push
    if ($pullSuccess) {
        Sync-Push
    } else {
        Write-Warning "Pull failed. Skipping push to avoid conflicts."
    }
}

# Main script execution
Write-ColorOutput "`n=================================================" "Cyan"
Write-ColorOutput "  GitHub Auto-Sync Tool" "White"
Write-ColorOutput "  Repo: $GITHUB_REPO" "Gray"
Write-ColorOutput "=================================================`n" "Cyan"

# Pre-flight checks
if (-not (Test-GitInstalled)) {
    exit 1
}

if (-not (Test-GitRepository)) {
    exit 1
}

# Execute based on parameters
if ($Status) {
    Show-Status
} elseif ($Pull) {
    Sync-Pull
} elseif ($Push) {
    Sync-Push
} elseif ($Auto) {
    Sync-Auto
} else {
    # Default: show status and prompt
    Show-Status
    Write-Info "`nTo sync your repository, run:"
    Write-ColorOutput "  .\sync.ps1 -Pull    # Pull changes from GitHub" "Yellow"
    Write-ColorOutput "  .\sync.ps1 -Push    # Push changes to GitHub" "Yellow"
    Write-ColorOutput "  .\sync.ps1 -Auto    # Auto sync (pull + push)" "Yellow"
    Write-ColorOutput "  .\sync.ps1 -Status  # Check status only" "Yellow"
}

Write-Host ""
