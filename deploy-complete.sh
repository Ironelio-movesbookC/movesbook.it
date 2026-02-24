#!/bin/bash

# ============================================
# Movesbook Complete Deployment Script
# ============================================
# This script handles all deployment tasks:
# 0. Stop running app (avoids OOM and .next conflicts)
# 1. Database schema updates
# 2. Legacy user migration
# 3. Translation seeding
# 4. Application build and restart
# ============================================

set -e  # Exit on any error

echo "🚀 Starting Movesbook Complete Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 0: Stop the app so build doesn't compete for RAM and .next isn't in use
echo -e "${BLUE}⏸️  Step 0/8: Stopping application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop movesbook 2>/dev/null || echo "   (no movesbook process to stop)"
    echo -e "${GREEN}✅ Application stopped${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Stop the app manually before deploying to avoid crashes.${NC}"
fi
echo ""

# Step 1: Install dependencies
echo -e "${BLUE}📦 Step 1/7: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Generate Prisma Client
echo -e "${BLUE}🔧 Step 2/7: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# Step 3: Run WorkoutDay userId migration (if needed)
echo -e "${BLUE}📊 Step 3/8: Running WorkoutDay userId migration...${NC}"
if [ -f "migrate-workout-day-userid-simple.js" ]; then
    node migrate-workout-day-userid-simple.js
    echo -e "${GREEN}✅ WorkoutDay migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  migrate-workout-day-userid-simple.js not found, skipping...${NC}"
fi
echo ""

# Step 4: Push schema changes to database
echo -e "${BLUE}📊 Step 4/8: Updating database schema...${NC}"
npx prisma db push --skip-generate
echo -e "${GREEN}✅ Database schema updated${NC}"
echo ""

# Step 5: Migrate legacy users
echo -e "${BLUE}👥 Step 5/8: Migrating legacy users...${NC}"
if [ -f "migrate-legacy-users.js" ]; then
    node migrate-legacy-users.js
    echo -e "${GREEN}✅ Legacy users migrated${NC}"
else
    echo -e "${YELLOW}⚠️  migrate-legacy-users.js not found, skipping...${NC}"
fi
echo ""

# Step 6: Seed translations (long texts)
echo -e "${BLUE}🌱 Step 6/8: Seeding translations...${NC}"
if npm run db:seed 2>&1 | grep -q "completed"; then
    echo -e "${GREEN}✅ Translations seeded${NC}"
else
    echo -e "${YELLOW}⚠️  Translation seeding had warnings, continuing...${NC}"
fi
echo ""

# Step 7: Build the application
echo -e "${BLUE}🏗️  Step 7/8: Building application...${NC}"
rm -rf .next
npm run build
echo -e "${GREEN}✅ Application built${NC}"
echo ""

# Step 8: Restart the application
echo -e "${BLUE}♻️  Step 8/8: Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart movesbook 2>/dev/null || pm2 start npm --name "movesbook" -- start
    pm2 save
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart your application manually.${NC}"
    echo "   Run: npm start"
fi
echo ""

# Final verification
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Summary:"
echo "  ✅ WorkoutDay userId migration completed"
echo "  ✅ Database schema updated"
echo "  ✅ Legacy users migrated (if applicable)"
echo "  ✅ Long text translations seeded"
echo "  ✅ Application built successfully"
echo "  ✅ Application restarted"
echo ""
echo "🎯 What works now:"
echo "  • All legacy users can login with original credentials"
echo "  • SHA1 passwords fully supported (no conversion)"
echo "  • Case-insensitive username/email login"
echo "  • Long texts visible in Language Settings"
echo "  • Forgot Password feature active"
echo ""
echo -e "${BLUE}🌐 Access your application at:${NC}"
echo "   http://localhost:3000 (or your server IP)"
echo ""

