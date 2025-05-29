#!/bin/bash
# AutoCut CEP Plugin Installer for macOS/Linux

echo "Installing AutoCut CEP Plugin for Adobe Premiere Pro..."
echo

# Get user's extensions directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CEP_EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
else
    # Linux
    CEP_EXTENSIONS_DIR="$HOME/.config/Adobe/CEP/extensions"
fi

# Create extensions directory if it doesn't exist
mkdir -p "$CEP_EXTENSIONS_DIR"

# Create AutoCut directory
PLUGIN_DIR="$CEP_EXTENSIONS_DIR/com.autocut.panel"
if [ -d "$PLUGIN_DIR" ]; then
    echo "Removing existing AutoCut installation..."
    rm -rf "$PLUGIN_DIR"
fi

echo "Creating plugin directory: $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Copy plugin files
echo "Copying plugin files..."
cp -r "$SCRIPT_DIR/CSXS" "$PLUGIN_DIR/"
cp -r "$SCRIPT_DIR/css" "$PLUGIN_DIR/"
cp -r "$SCRIPT_DIR/js" "$PLUGIN_DIR/"
cp -r "$SCRIPT_DIR/jsx" "$PLUGIN_DIR/"
cp "$SCRIPT_DIR/index.html" "$PLUGIN_DIR/"

# Install Python dependencies
echo
echo "Installing Python dependencies for Whisper service..."
pip3 install -r "$SCRIPT_DIR/python/requirements.txt"

# Copy Python service
PYTHON_DIR="$PLUGIN_DIR/python"
mkdir -p "$PYTHON_DIR"
cp "$SCRIPT_DIR/python/"*.py "$PYTHON_DIR/"
cp "$SCRIPT_DIR/python/requirements.txt" "$PYTHON_DIR/"

# Enable CEP debugging (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo
    echo "Enabling CEP debugging..."
    defaults write com.adobe.CSXS.9 PlayerDebugMode 1
    defaults write com.adobe.CSXS.10 PlayerDebugMode 1
    defaults write com.adobe.CSXS.11 PlayerDebugMode 1
fi

echo
echo "Installation complete!"
echo
echo "To use AutoCut:"
echo "1. Restart Adobe Premiere Pro"
echo "2. Go to Window > Extensions > AutoCut - Silence Detection"
echo "3. Run the Whisper service by executing: ./start_whisper_service.sh"
echo
echo "Note: Make sure Python 3 is installed and accessible from command line."
echo

# Make scripts executable
chmod +x "$SCRIPT_DIR/start_whisper_service.sh"