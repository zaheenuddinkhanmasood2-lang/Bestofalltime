# GitHub Auto-Sync Guide

This guide explains how to keep your local code automatically synced with your GitHub repository.

## Repository Information

- **GitHub URL (HTTPS):** https://github.com/zaheenuddinkhanmasood2-lang/Allaho.git
- **GitHub CLI:** `gh repo clone zaheenuddinkhanmasood2-lang/Allaho`
- **SSH URL:** git@github.com:zaheenuddinkhanmasood2-lang/Allaho.git

## Quick Start

### Method 1: Using npm scripts (Recommended)

```bash
# Check repository status
npm run git:status

# Pull latest changes from GitHub
npm run git:pull

# Push your local changes to GitHub
npm run git:push

# Auto-sync (pull + push)
npm run git:sync
# Or simply:
npm run sync
```

### Method 2: Using PowerShell script directly

```powershell
# Check status
.\sync.ps1 -Status

# Pull changes
.\sync.ps1 -Pull

# Push changes
.\sync.ps1 -Push

# Auto-sync
.\sync.ps1 -Auto
```

## What Each Command Does

### `git:status` / `-Status`
- Shows current branch
- Lists remote repositories
- Shows uncommitted changes
- Displays recent commit history

### `git:pull` / `-Pull`
- Fetches latest changes from GitHub
- Automatically handles local uncommitted changes (uses stash)
- Updates your working directory
- Shows any merge conflicts if they occur

### `git:push` / `-Push`
- Commits local changes (after asking for confirmation)
- Pushes commits to GitHub
- Handles authentication automatically

### `git:sync` / `-Auto`
- Performs a complete sync cycle:
  1. Pulls latest changes from GitHub
  2. Pushes your local changes to GitHub
- Safest option to keep everything in sync

## Setting Up Auto-Sync

While we can't automatically sync every time you save a file (this would slow down your workflow), you can set up semi-automatic sync by running:

```bash
npm run sync
```

This command will:
1. Pull any new changes from GitHub
2. Check for your local changes
3. Ask if you want to commit and push them

## Best Practices

### Daily Workflow

1. **Start of day:** Always pull latest changes
   ```bash
   npm run git:pull
   ```

2. **During work:** Make your changes as usual

3. **End of day or before switching tasks:** Push your changes
   ```bash
   npm run git:push
   ```

4. **Quick sync anytime:**
   ```bash
   npm run sync
   ```

### Handling Conflicts

If there are merge conflicts:
1. The sync script will pause
2. Manually resolve conflicts in the affected files
3. Mark resolved files: `git add <filename>`
4. Complete merge: `git commit`
5. Retry pushing: `npm run git:push`

### Authentication

If you haven't set up GitHub authentication yet, you may see errors when pushing. Set up authentication using one of these methods:

#### Option 1: GitHub CLI (Recommended)
```bash
gh auth login
```

#### Option 2: SSH Keys
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys → New SSH key
3. Test: `ssh -T git@github.com`

#### Option 3: Personal Access Token
1. Create token: GitHub → Settings → Developer settings → Personal access tokens
2. Use token as password when prompted

## Troubleshooting

### "Permission denied" error
- Set up authentication (see above)
- Check your Git credentials: `git config --global user.name` and `git config --global user.email`

### "Not a git repository" error
- The sync script will auto-initialize if needed
- Or manually: `git init` and `git remote add origin https://github.com/zaheenuddinkhanmasood2-lang/Allaho.git`

### PowerShell execution policy error
- The npm scripts use `-ExecutionPolicy Bypass` to avoid this
- If running directly, open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Branch issues
- Check current branch: `git branch`
- Switch branches: `git checkout <branch-name>`
- Create new branch: `git checkout -b <new-branch>`

## Advanced Usage

### Check what's different
```bash
# See unstaged changes
git diff

# See staged changes
git diff --cached

# Compare with remote
git diff origin/main
```

### Undo changes
```bash
# Discard all uncommitted changes
git checkout .

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

### View history
```bash
# See recent commits
git log --oneline -10

# See commits with file changes
git log --stat -5

# See visual graph
git log --graph --oneline --all
```

## Continuous Sync (Optional)

For truly automatic syncing, you could set up a Git hook, but this is NOT recommended as it:
- Slows down file saving
- Creates too many commits
- Makes history messy
- Can cause performance issues

Instead, use `npm run sync` when you finish a feature or at regular intervals.

## Need Help?

- Check Git status: `npm run git:status`
- View this guide: Open `GIT_SYNC_GUIDE.md`
- Git documentation: https://git-scm.com/docs
- GitHub docs: https://docs.github.com/en

## Current Setup

✅ Repository connected to: https://github.com/zaheenuddinkhanmasood2-lang/Allaho.git
✅ Sync scripts configured in `package.json`
✅ PowerShell sync script created: `sync.ps1`
✅ All npm scripts ready to use

You're all set! Use `npm run sync` to keep your code synced with GitHub.

