# Rule34 Auto Scroll Bot

A minimal browser-based bot that lets you search Rule34 by tags and automatically scrolls through the resulting gallery every five seconds.

## Features

- Search Rule34 using tags (space separated) via its JSON API
- Displays previews with links to the original files
- Automatically scrolls through the grid of results on a five-second cadence
- Responsive layout that works on desktop and mobile sizes

## Getting Started

1. Serve the project locally with the bundled helper server (requires Python 3.8+):

   ```bash
   python server.py
   ```

   Use `python3 server.py` if your operating system still defaults `python` to Python 2.

   On Windows you can double-click `serve.bat`, which runs the same command.

2. Open your browser to `http://localhost:8000` (or another port if you passed `--port`).
3. Enter one or more tags separated by spaces and press **Search**.
4. The gallery will populate with results and the viewport will scroll every five seconds.

> **Note:** The local server exposes `/rule34-proxy`, keeping API requests on the same origin so browsers are not blocked by CORS. If results still fail to load, confirm that `server.py` is running and that your network can reach `https://api.rule34.xxx`.
