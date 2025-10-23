# Rule34 Auto Scroll Bot

A minimal browser-based bot that lets you search Rule34 by tags and automatically scrolls through the resulting gallery every five seconds.

## Features

- Search Rule34 using tags (space separated) via its JSON API
- Displays previews with links to the original files
- Automatically scrolls through the grid of results on a five-second cadence
- Responsive layout that works on desktop and mobile sizes

## Getting Started

1. Serve the project locally (for example with Python):

   ```bash
   python3 -m http.server 8000
   ```

2. Open your browser to `http://localhost:8000`.
3. Enter one or more tags separated by spaces and press **Search**.
4. The gallery will populate with results and the viewport will scroll every five seconds.

> **Note:** The Rule34 API must support cross-origin requests from your browser. If requests fail with a CORS error, try running the page in a different browser or via an extension that enables CORS for development purposes.
