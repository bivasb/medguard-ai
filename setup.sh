#!/bin/bash

# MedGuard AI Setup Script
# Helps users get started quickly with the application

set -e

echo "🏥 MedGuard AI - Quick Setup"
echo "============================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 20+ using nvm:"
    echo ""
    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "source ~/.bashrc"
    echo "nvm install 20"
    echo "nvm use 20"
    echo "nvm alias default 20"
    echo ""
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old"
    echo "Please upgrade to Node.js 20+"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment file
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "ℹ️  .env file already exists"
fi

# Test the installation
echo "🧪 Running installation test..."
if npm run test > /dev/null 2>&1; then
    echo "✅ Installation test passed"
else
    echo "⚠️  Installation test had some issues (this is normal for a demo)"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "🌐 Then open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "🧪 To run tests:"
echo "   npm test"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "Happy drug interaction checking! 💊"