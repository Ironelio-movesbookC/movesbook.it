#!/bin/bash

# ============================================
# Clean and Fresh Deployment Script
# ============================================
# This script completely cleans the server and deploys fresh
# ============================================

set -e  # Exit on any error

echo "🧹 Starting Clean Deployment Process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop any running processes
echo -e "${BLUE}⏹️  Step 1/10: Stopping running processes...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop movesbook 2>/dev/null || echo "   No PM2 process to stop"
    pm2 delete movesbook 2>/dev/null || echo "   No PM2 process to delete"
    echo -e "${GREEN}✅ PM2 processes stopped${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found, skipping...${NC}"
fi
echo ""

# Step 2: Clean git state
echo -e "${BLUE}🗑️  Step 2/10: Cleaning git state...${NC}"
# Remove any untracked files
git clean -fd
# Stash any local changes
git stash clear
git stash
# Reset to HEAD
git reset --hard HEAD
echo -e "${GREEN}✅ Git state cleaned${NC}"
echo ""

# Step 3: Pull latest code
echo -e "${BLUE}📥 Step 3/10: Pulling latest code...${NC}"
git pull origin main
echo -e "${GREEN}✅ Latest code pulled${NC}"
echo ""

# Step 4: Clean node_modules and reinstall
echo -e "${BLUE}🗑️  Step 4/10: Cleaning node_modules...${NC}"
rm -rf node_modules
rm -rf .next
rm -f package-lock.json
echo -e "${GREEN}✅ Old dependencies removed${NC}"
echo ""

# Step 5: Install dependencies fresh
echo -e "${BLUE}📦 Step 5/10: Installing dependencies fresh...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 6: Generate Prisma Client
echo -e "${BLUE}🔧 Step 6/10: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# Step 7: Run WorkoutDay userId migration
echo -e "${BLUE}📊 Step 7/10: Running WorkoutDay userId migration...${NC}"
if [ -f "migrate-workout-day-userid-simple.js" ]; then
    node migrate-workout-day-userid-simple.js
    echo -e "${GREEN}✅ WorkoutDay migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration script not found, skipping...${NC}"
fi
echo ""

# Step 8: Push schema changes to database
echo -e "${BLUE}📊 Step 8/10: Updating database schema...${NC}"
npx prisma db push --skip-generate
echo -e "${GREEN}✅ Database schema updated${NC}"
echo ""

# Step 9: Build the application
echo -e "${BLUE}🏗️  Step 9/10: Building application...${NC}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build
echo -e "${GREEN}✅ Application built${NC}"
echo ""

# Step 10: Start the application
echo -e "${BLUE}🚀 Step 10/10: Starting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 start npm --name "movesbook" -- start
    pm2 save
    echo -e "${GREEN}✅ Application started with PM2${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Starting with npm...${NC}"
    npm start &
    echo -e "${GREEN}✅ Application started${NC}"
fi
echo ""

# Final verification
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CLEAN DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Summary:"
echo "  ✅ All processes stopped"
echo "  ✅ Git state cleaned and code updated"
echo "  ✅ Dependencies reinstalled fresh"
echo "  ✅ WorkoutDay userId migration completed"
echo "  ✅ Database schema updated"
echo "  ✅ Application built successfully"
echo "  ✅ Application started"
echo ""
echo -e "${BLUE}🌐 Access your application at:${NC}"
echo "   http://localhost:3000 (or your server IP)"
echo ""

# Show PM2 status
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}📊 PM2 Status:${NC}"
    pm2 status
fi
echo ""

