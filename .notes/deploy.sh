#!/bin/bash
set -e

echo "=== MedEdPrep Inst — Production Setup ==="

# 1. Create 2GB swap so builds/heavy operations never OOM again
echo "[1/7] Creating swap space..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "  Swap created and enabled"
else
  echo "  Swap already exists"
fi
free -h | grep Swap

# 2. Install PostgreSQL
echo "[2/7] Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql postgresql-contrib
  echo "  PostgreSQL installed"
else
  echo "  PostgreSQL already installed"
fi
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 3. Create database and user
echo "[3/7] Setting up database..."
DB_PASS="e68f162e7851223c0d3d130eb7bfdf2d"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='mededprep'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER mededprep WITH PASSWORD '${DB_PASS}' CREATEDB;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='mededprep_inst'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE mededprep_inst OWNER mededprep;"
echo "  Database ready"

# 4. Upgrade Node.js to v22 LTS
echo "[4/7] Ensuring Node.js v22..."
CURRENT_NODE=$(node -v 2>/dev/null || echo "none")
if [[ "$CURRENT_NODE" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "  Upgraded to $(node -v)"
else
  echo "  Already on $CURRENT_NODE"
fi

# 5. Install dependencies
echo "[5/7] Installing npm dependencies..."
cd ~/mededprep-inst
npm install --legacy-peer-deps --production 2>&1 | tail -3
npx prisma generate
echo "  Dependencies installed"

# 6. Create .env
echo "[6/7] Writing production .env..."
JWT_SECRET="25d86e59cea6cee6e3d3b01f853d051c5290c6e403a94060d4be60206a849122"
cat > ~/mededprep-inst/.env << EOF
NODE_ENV=production
PORT=9001
DATABASE_URL=postgresql://mededprep:${DB_PASS}@localhost:5432/mededprep_inst
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://inst.mededprep.app
APP_BASE_URL=https://inst.mededprep.app
LOG_LEVEL=info
EOF
echo "  .env written"

# 7. Push schema to database
echo "[7/7] Pushing Prisma schema..."
cd ~/mededprep-inst
npx prisma db push --accept-data-loss 2>&1 | tail -5
echo "  Schema applied"

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  1. Run: cd ~/mededprep-inst && npm run create-admin"
echo "     (create your org with slug 'inst' and your admin account)"
echo "  2. The deploy script will set up Apache + PM2 next"
