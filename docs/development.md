# Development

## Project structure

```
connection-manager/
├── app.go                  ← Go backend (OpenSSH command)
├── main.go                 ← Wails entry point
├── go.mod
├── wails.json
├── frontend/
│   ├── index.html
│   ├── tailwind.config.js         ← Tailwind configuration (content paths, theme)
│   ├── package.json
│   └── assets/
│       ├── css/
│       │   ├── tailwind.src.css   ← source CSS (edit this)
│       │   └── tailwind.min.css   ← compiled output (committed)
│       └── js/
│           ├── app.js             ← Alpine.js application logic
│           └── alpine.min.js      ← Alpine.js (bundled locally)
├── docs/                   ← technical documentation
└── .github/
    └── workflows/
        └── release.yml     ← GitHub Actions release pipeline
```

---

## Architecture

```
frontend (Alpine.js)          backend (Go)
        │                           │
        │  window.go.main.App       │
        │  .OpenSSH(user,host,port) │
        │ ────────────────────────► │
        │                           │  exec.Command(terminal, ssh ...)
        │                           │ ──────────────────────────────►
        │                           │               native terminal
```

`app.go` detects the OS at runtime and picks the right terminal:

| OS      | Terminal tried (in order)                          |
|---------|----------------------------------------------------|
| Linux   | gnome-terminal, konsole, xfce4-terminal, xterm     |
| macOS   | Terminal.app (via osascript)                       |
| Windows | Windows Terminal (`wt`), fallback to `cmd`         |

Connections are stored in `localStorage` by the frontend.
No data is written to disk by the Go backend.

---

## Prerequisites

### All platforms
- [Go](https://golang.org/dl/) 1.21+
- [Node.js](https://nodejs.org/) 18+ (only needed to rebuild Tailwind CSS)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation/)

#### Go
```bash
# Install Go
sudo snap install go --classic
source ~/.bashrc

# Check
go version
```

#### Wails
```bash
# Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Add Go bin to the PATH
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
source ~/.bashrc

# Check
wails version
```

### Linux
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
  libgtk-3-dev librsvg2-dev
```

### macOS

Xcode Command Line Tools:

```bash
xcode-select --install
```

### Windows

WebView2 is already included in Windows 10 (1803+) and Windows 11.
No additional dependencies required.

---

## Run in development

```bash
# Install Go dependencies
go mod tidy

# Run wails
wails dev -tags webkit2_41
```

Wails automatically runs `npm install` and starts the Tailwind watcher
(`npm run watch`) as a background process, as configured in `wails.json`:

```json
"frontend:install": "npm install",
"frontend:build": "npm run build",
"frontend:dev:watcher": "npm run watch"
```

Hot reload is active: changes to `frontend/` are reflected instantly
without restarting. Changes to `app.go` require a recompile (Wails
handles this automatically).

---

## Rebuild Tailwind CSS

Only needed if you want to manage Tailwind manually, outside of `wails dev`.

```bash
cd frontend
npm install

# One-shot build (minified output)
npm run build

# Watch mode (rebuilds on every file change)
npm run watch
```

---

## Build

```bash
wails build
```

Output is placed in `build/bin/`:

| Platform | Output                                |
|----------|---------------------------------------|
| Linux    | `connection-manager` (ELF) + `.AppImage`     |
| macOS    | `connection-manager.app` + `.dmg`            |
| Windows  | `connection-manager.exe`                     |

The binary is fully self-contained — no runtime, no dependencies
required on the end-user's machine (except `libwebkit2gtk` on Linux,
which is present by default on most desktop distributions).
