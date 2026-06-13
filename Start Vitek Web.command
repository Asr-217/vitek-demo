#!/bin/zsh
cd /Users/artyom/Documents/Masseng/Web || exit 1
clear
echo "Starting Vitëk Web..."
echo "Open http://localhost:5173"
echo "Close this window to stop the web app."
echo
/usr/bin/python3 -m http.server 5173
