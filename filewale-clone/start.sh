#!/bin/bash

echo "🚀 Starting FilewAle Clone..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create uploads directory if it doesn't exist
if [ ! -d "public/uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p public/uploads
fi

echo "✅ Setup complete!"
echo "🌐 Starting server on http://localhost:3000"
echo "📁 Upload directory: $(pwd)/public/uploads"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start