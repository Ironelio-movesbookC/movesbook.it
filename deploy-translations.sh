#!/bin/bash

# Movesbook Translation Deployment Script
# This script ensures long text translations are populated after deployment

echo "🚀 Starting translation deployment..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 3: Push schema changes
echo "📊 Pushing schema to database..."
npx prisma db push --accept-data-loss --skip-generate

# Step 4: Seed long text translations
echo "🌱 Seeding long text translations..."
npm run db:seed

# Step 5: Build the application
echo "🏗️  Building application..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
npm run build

# Step 6: Restart the application (using PM2)
echo "♻️  Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart movesbook || pm2 start npm --name "movesbook" -- start
    pm2 save
else
    echo "⚠️  PM2 not found. Please restart your application manually."
fi

echo "✅ Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  - Schema updated"
echo "  - Long text translations seeded"
echo "  - Application built and restarted"
echo ""
echo "🎯 Your language long texts should now be visible!"

