#!/usr/bin/env bash
set -e

APP_NAME="connection-manager"
GITHUB_REPO="gsandrini/connection-manager"
INSTALL_DIR="$HOME/bin"
ICON_DIR="$HOME/.local/share/icons"
DESKTOP_DIR="$HOME/.local/share/applications"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing ${APP_NAME}...${NC}"

# Verifica che curl sia installato
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed.${NC}"
    exit 1
fi

# Recupera l'ultima versione disponibile
LATEST_VERSION=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" \
    | grep '"tag_name"' \
    | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    echo -e "${RED}Error: could not determine latest version.${NC}"
    exit 1
fi

echo -e "Latest version: ${BLUE}${LATEST_VERSION}${NC}"

BASE_URL="https://github.com/${GITHUB_REPO}/releases/download/${LATEST_VERSION}"

# Crea le directory necessarie
mkdir -p "$INSTALL_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$DESKTOP_DIR"

# Scarica l'eseguibile
echo "Downloading executable..."
curl -fsSL "${BASE_URL}/${APP_NAME}" -o "${INSTALL_DIR}/${APP_NAME}"
chmod +x "${INSTALL_DIR}/${APP_NAME}"

# Scarica l'icona
echo "Downloading icon..."
curl -fsSL "${BASE_URL}/appicon.png" -o "${ICON_DIR}/${APP_NAME}.png"

# Crea il file .desktop
echo "Creating .desktop entry..."
cat > "${DESKTOP_DIR}/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Connection Manager
Comment=Manage and connect to SSH hosts
Exec=${INSTALL_DIR}/${APP_NAME}
Icon=${ICON_DIR}/${APP_NAME}.png
Terminal=false
Categories=Network;RemoteAccess;
EOF

# Aggiorna il database delle applicazioni
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# Controlla che ~/bin sia nel PATH
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo ""
    echo -e "${RED}Warning: $HOME/bin is not in your PATH.${NC}"
    echo "Add the following line to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${BLUE}export PATH=\"\$HOME/bin:\$PATH\"${NC}"
    echo "Then run: source ~/.bashrc"
fi

echo ""
echo -e "${GREEN}✓ ${APP_NAME} ${LATEST_VERSION} installed successfully!${NC}"
echo -e "  Executable : ${INSTALL_DIR}/${APP_NAME}"
echo -e "  Icon       : ${ICON_DIR}/${APP_NAME}.png"
echo -e "  Desktop    : ${DESKTOP_DIR}/${APP_NAME}.desktop"
