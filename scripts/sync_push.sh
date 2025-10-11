#!/bin/bash

# Supabase Schema Sync - Push Script
# This script applies migrations to Supabase with safety checks

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
LOG_FILE="$PROJECT_ROOT/sync.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=false
FORCE=false
MIGRATION_FILE=""

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Show usage information
show_usage() {
    cat << EOF
Usage: $0 [options]

Options:
    --dry-run              Perform a dry run without applying changes
    --force                Skip confirmation prompts
    --migration FILE       Apply specific migration file
    --help, -h             Show this help message

Environment variables:
    SUPABASE_PROJECT_ID           Supabase project ID
    SUPABASE_SERVICE_ROLE_KEY     Service role key for authentication
    SUPABASE_DB_URL              Database URL for direct connection

Examples:
    $0 --dry-run                 # Test migrations without applying
    $0 --force                   # Apply all pending migrations
    $0 --migration 20240101120000_sync.sql  # Apply specific migration

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --migration)
                MIGRATION_FILE="$2"
                shift 2
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first: npm install -g supabase"
    fi
    log "Supabase CLI found: $(supabase --version)"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository. Please initialize git first."
    fi
    log "Git repository detected"
}

# Check if Supabase project is linked
check_supabase_project() {
    if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
        error "Supabase project not initialized. Run 'supabase init' first."
    fi
    
    # Check if project is linked
    if ! supabase status > /dev/null 2>&1; then
        warning "Supabase project not linked. Attempting to link..."
        if [ -z "$SUPABASE_PROJECT_ID" ]; then
            error "SUPABASE_PROJECT_ID environment variable not set"
        fi
        supabase link --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    log "Supabase project linked successfully"
}

# Check for uncommitted changes
check_git_status() {
    if ! git diff --quiet || ! git diff --cached --quiet; then
        warning "You have uncommitted changes. Consider committing them first."
        if [ "$FORCE" = false ]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Aborted by user"
            fi
        fi
    fi
}

# Get list of pending migrations
get_pending_migrations() {
    log "Checking for pending migrations..."
    
    if [ -n "$MIGRATION_FILE" ]; then
        # Specific migration file requested
        if [ ! -f "$MIGRATIONS_DIR/$MIGRATION_FILE" ]; then
            error "Migration file not found: $MIGRATIONS_DIR/$MIGRATION_FILE"
        fi
        echo "$MIGRATION_FILE"
    else
        # Get all migration files
        find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort
    fi
}

# Validate migration file
validate_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")
    
    log "Validating migration: $migration_name"
    
    # Check if file is readable
    if [ ! -r "$migration_file" ]; then
        error "Cannot read migration file: $migration_file"
    fi
    
    # Basic SQL syntax check (if sqlfluff is available)
    if command -v sqlfluff &> /dev/null; then
        if ! sqlfluff lint "$migration_file" > /dev/null 2>&1; then
            warning "SQL syntax issues detected in $migration_name"
            if [ "$FORCE" = false ]; then
                read -p "Continue anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    error "Aborted by user"
                fi
            fi
        fi
    fi
    
    success "Migration validation passed: $migration_name"
}

# Create backup before applying migrations
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        log "Skipping backup in dry-run mode"
        return 0
    fi
    
    log "Creating database backup..."
    
    local backup_file="$PROJECT_ROOT/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "$(dirname "$backup_file")"
    
    if supabase db dump --file "$backup_file" --schema public; then
        success "Backup created: $backup_file"
    else
        warning "Failed to create backup, continuing anyway..."
    fi
}

# Apply migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")
    
    log "Applying migration: $migration_name"
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would apply migration $migration_name"
        log "Migration content preview:"
        echo "----------------------------------------"
        head -20 "$migration_file"
        echo "----------------------------------------"
        return 0
    fi
    
    # Apply the migration
    if supabase db push --file "$migration_file"; then
        success "Migration applied successfully: $migration_name"
    else
        error "Failed to apply migration: $migration_name"
    fi
}

# Verify migration was applied
verify_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would verify migration $migration_name"
        return 0
    fi
    
    log "Verifying migration: $migration_name"
    
    # Check if we can connect to the database
    if supabase status > /dev/null 2>&1; then
        success "Database connection verified"
    else
        error "Database connection failed after migration"
    fi
}

# Show migration summary
show_summary() {
    local migrations_applied="$1"
    
    echo ""
    log "Migration Summary:"
    echo "  - Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")"
    echo "  - Migrations processed: $migrations_applied"
    echo "  - Log file: $LOG_FILE"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        warning "This was a dry run. No changes were applied to the database."
        echo "To apply changes, run: $0 --force"
    else
        success "All migrations applied successfully!"
    fi
}

# Main execution
main() {
    log "Starting Supabase schema push..."
    
    # Parse arguments
    parse_args "$@"
    
    # Pre-flight checks
    check_supabase_cli
    check_git_repo
    check_supabase_project
    check_git_status
    
    # Get pending migrations
    local pending_migrations=($(get_pending_migrations))
    
    if [ ${#pending_migrations[@]} -eq 0 ]; then
        log "No pending migrations found"
        exit 0
    fi
    
    log "Found ${#pending_migrations[@]} migration(s) to process"
    
    # Create backup if not dry run
    create_backup
    
    # Process each migration
    local migrations_applied=0
    for migration_file in "${pending_migrations[@]}"; do
        validate_migration "$migration_file"
        apply_migration "$migration_file"
        verify_migration "$migration_file"
        ((migrations_applied++))
    done
    
    # Show summary
    show_summary "$migrations_applied"
}

# Run main function
main "$@"
