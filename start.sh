#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${PORT:-3000}"
DB_NAME="repairshop"

echo "=========================================="
echo "  RepairShop Pro - AI Repair Management  "
echo "=========================================="
echo ""

# Load .env file first if it exists
if [ -f ".env" ]; then
  echo "==> Loading environment from .env file..."
  set -a
  source .env
  set +a
fi

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  # Use current system username for PostgreSQL connection (common on macOS)
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"

# Set other required environment variables with defaults (only if not already set)
export JWT_SECRET="${JWT_SECRET:-repairshop-dev-secret-change-in-production}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:${APP_PORT}}"
export OPENROUTER_MODEL="${OPENROUTER_MODEL:-anthropic/claude-3-haiku}"
# Note: OPENROUTER_API_KEY should be set in .env file, not defaulted to empty

echo "NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server (not specific database)
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on the app port
echo ""
echo "==> Cleaning up processes on port ${APP_PORT}..."
if lsof -ti tcp:"${APP_PORT}" >/dev/null 2>&1; then
  echo "Found processes on port ${APP_PORT}, killing them..."
  lsof -ti tcp:"${APP_PORT}" | xargs kill -9 || true
  sleep 1
  echo "Processes on port ${APP_PORT} have been terminated."
else
  echo "No processes found on port ${APP_PORT}."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo ""
  echo "==> Installing dependencies..."
  npm install
fi

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating .env file..."
if [ -f ".env" ]; then
  # Update DATABASE_URL in .env if it exists, otherwise append
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  echo "DATABASE_URL=\"${DATABASE_URL}\"" > .env
  echo "JWT_SECRET=\"${JWT_SECRET}\"" >> .env
  echo "NEXT_PUBLIC_APP_URL=\"${NEXT_PUBLIC_APP_URL}\"" >> .env
  echo "OPENROUTER_API_KEY=" >> .env
  echo "OPENROUTER_MODEL=\"${OPENROUTER_MODEL}\"" >> .env
  echo ""
  echo "NOTE: Please add your OPENROUTER_API_KEY to .env file for AI features"
fi
echo ".env file updated."

# Seed database with comprehensive demo data
echo ""
echo "==> Seeding database with demo data..."
echo "   (15+ items for each feature including:"
echo "    - Customers, Tickets, Quotes, Orders"
echo "    - Warranty Claims, Auto-Order Rules"
echo "    - AI Diagnostic Sessions, Quote Approvals)"
DATABASE_URL="${DATABASE_URL}" npm run db:seed

# Start the application
echo ""
echo "=========================================="
echo "  Starting RepairShop Pro on port ${APP_PORT}"
echo "=========================================="
echo ""
echo "Access the application at: http://localhost:${APP_PORT}"
echo ""
echo "Test credentials:"
echo "  Admin:      admin@techfixpro.com / password123"
echo "  Manager:    manager@techfixpro.com / password123"
echo "  Technician: mike@techfixpro.com / password123"
echo ""
echo "TIP: Click 'Fill Demo Credentials' on login page!"
echo ""
echo "Features included:"
echo "  - AI Diagnostic Assistant (Conversational)"
echo "  - Photo Upload & AI Damage Assessment"
echo "  - Auto-Ordering with Approval Workflow"
echo "  - Customer Quote Approval (Email Links)"
echo "  - Repair Timeline Estimates with AI"
echo "  - Warranty Claim Tracking"
echo ""

# For development
if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "Running in PRODUCTION mode..."
  npm run build
  npm start
else
  echo "Running in DEVELOPMENT mode..."
  npm run dev
fi
