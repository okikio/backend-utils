#!/bin/sh
# =============================================================================
# DevContainer Post-Create Setup Script
# =============================================================================
# This script runs AFTER the container is created and all features (mise, etc.)
# are installed. It sets up the development environment by:
# 1. Installing mise-managed tools (Node, pnpm, Python, etc.)
# 2. Setting up Python environment and Jupyter kernel
# 3. Installing JavaScript dependencies with optimized pnpm configuration
# =============================================================================

# Exit immediately if any command fails
set -e
# Exit if any variable is undefined
set -u
# Set default umask for consistent file permissions
umask 022

log()  { printf '%s: %s\n' "$1" "$2" >&2; }  # LEVEL MESSAGE
info() { log INFO "$*"; }
err()  { log ERROR "$*"; }

# The mise feature should have installed mise by now. If it's not found,
# something went wrong with the feature installation.
command -v mise >/dev/null 2>&1 || { 
  err "mise command not found - feature may not have installed correctly"
  exit 127
}

# =============================================================================
# Section 1: Install mise-managed toolchain
# =============================================================================
# mise reads mise.toml to determine which tool versions to install.
# This ensures everyone on the team uses identical versions of:
# - Node.js (for Next.js frontend)
# - pnpm (package manager)
# - Python (for Blazegraph seeding scripts)
# - uv (fast Python package installer)
# - Deno (for Supabase edge functions)
# =============================================================================

info "Trusting mise configuration..."
# mise won't automatically use config files from untrusted sources (security).
# This command explicitly trusts the mise.toml in this repo and any parent configs.
# The -y flag makes it non-interactive (safe for automated scripts).
# The -a flag trusts all configs (repo + system-level).
mise -y trust -a

info "Installing toolchain from mise.toml..."
# Downloads and installs all tools specified in mise.toml.
# This might take a few minutes on first run but is cached for rebuilds.
# Tools are installed to ~/.local/share/mise/ and shimmed for PATH access.
mise -y install

# =============================================================================
# Section 2: Python Environment Setup
# =============================================================================
# We need a Jupyter kernel that uses the mise-managed Python. This allows
# notebooks to use the correct Python version with all project dependencies.
# =============================================================================

info "Installing Python packages..."
# Use mise exec to run commands with the correct Python version.
# mise exec <tool> -- <command> ensures we use the mise-managed version,
# not any system-installed version.

# Install ipykernel using uv (much faster than pip)
# --system: Install to the Python installation, not a virtual env
# --upgrade: Update if already installed
mise exec uv -- uv pip install --system --upgrade ipykernel

# Register the kernel with Jupyter
# This creates ~/.local/share/jupyter/kernels/py-mise/kernel.json with an
# absolute path to the mise-managed Python binary.
# --sys-prefix: Install relative to the Python installation (not user-global)
# --name: Internal kernel identifier
# --display-name: What users see in Jupyter UI
mise exec python -- python -m ipykernel install --sys-prefix \
  --name py-mise --display-name "Python (mise)"

# Install Blazegraph dependencies if the requirements file exists
# This is for the graph database seeding scripts in infra/blazegraph/
if [ -f infra/blazegraph/requirements.txt ]; then
  info "Installing Blazegraph Python dependencies..."
  mise exec uv -- uv pip install --system -r infra/blazegraph/requirements.txt
fi

info "Python environment setup complete (kernel: py-mise)"

# =============================================================================
# Section 3: JavaScript Dependencies Installation
# =============================================================================
# This is where the pnpm performance optimization happens!
#
# BACKGROUND:
# The onCreateCommand already configured pnpm to use store-dir=node_modules/.pnpm-store
# by writing to ~/.npmrc. This ensures the pnpm store is on the SAME filesystem
# as node_modules (both in the Docker volume), enabling fast hard links.
#
# PERFORMANCE COMPARISON:
# Without optimization (store on different filesystem):
# - First install: ~30s (downloads)
# - Rebuild: ~30s (copies everything again)
# - Terminal `pnpm install`: ~28s (copies everything again)
#
# With optimization (store in node_modules volume):
# - First install: ~30s (downloads)
# - Rebuild: ~2-3s (hard links from persisted store)
# - Terminal `pnpm install`: ~2-3s (hard links from persisted store)
#
# WHY THE CHECK?
# We only run pnpm install if:
# 1. node_modules doesn't have a .pnpm/lock.yaml (never installed), OR
# 2. The lockfile changed since last install
#
# This saves time on container rebuilds when dependencies haven't changed.
# =============================================================================

if [ ! -f "node_modules/.pnpm/lock.yaml" ] || ! cmp -s "pnpm-lock.yaml" "node_modules/.pnpm/lock.yaml"; then
  info "Installing JavaScript dependencies..."
  info "  Store location: node_modules/.pnpm-store (configured via ~/.npmrc)"
  info "  This enables fast hard-link installs instead of copying files"
  
  # Run pnpm install using the mise-managed pnpm version.
  mise exec pnpm -- pnpm install
  
  info "JavaScript dependencies installed"
  info "  Subsequent 'pnpm install' commands will use hard links (~2-3s)"
else
  info "JavaScript dependencies up to date (lockfiles match)"
  info "  Skipping pnpm install to save time"
fi

info "Post-create setup complete!"
info ""
info "Next steps:"
info "  - Start Supabase: pnpm supabase start"
info "  - Start Blazegraph: cd infra/blazegraph && docker compose up"
info "  - Start frontend: pnpm dev"
info ""
info "Performance tip:"
info "  Running 'pnpm install' in a terminal should now take ~2-3 seconds"
info "  instead of ~30 seconds thanks to hard-link optimization!"