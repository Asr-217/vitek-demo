#!/bin/zsh
cd /Users/artyom/Documents/Masseng || exit 1
clear
echo "Starting Vitëk local server..."
echo "Close this window to stop the server."
echo
HOST=0.0.0.0 PORT=8081 /usr/bin/python3 Server/server.py
