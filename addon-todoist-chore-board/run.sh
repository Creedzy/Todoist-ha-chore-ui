#!/usr/bin/env bash
set -e

# Get sensors from options.json and format as a JS array string
SENSORS=$(jq -c '.sensors' /data/options.json)
echo "Configured sensors: $SENSORS"

# The target directory for the web UI files
UI_DIR="/usr/share/nginx/html"
INDEX_FILE="$UI_DIR/index.html"

# Create the config script to be injected
CONFIG_SCRIPT="<script>window.ADDON_CONFIG = { sensors: ${SENSORS:-[]} };</script>"

# Inject the config script into index.html right before the closing </head> tag.
sed -i "s#</head>#${CONFIG_SCRIPT}</head>#" "${INDEX_FILE}"

echo "Injected config into index.html"

# Start nginx
echo "Starting nginx..."
nginx -g "daemon off;"
