# Development

## Project structure

```txt
/
├── app.go                         # Core application logic, external terminal
├── terminal.go                    # Embedded terminal sessions (PTY + Wails events)
├── vault.go                       # Master-password vault (Argon2id + AES-256-GCM)
├── main.go                        # Entry point
│
├── frontend/                      # UI layer
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   │
│   └── assets/
│       ├── css/
│       │   ├── tailwind.src.css  # Edit this file
│       │   ├── tailwind.min.css  # Generated (compiled)
│       │   └── xterm.css         # xterm.js styles (vendored)
│       │
│       └── js/
│           ├── app.js            # Frontend app logic (incl. terminal tabs)
│           ├── xterm.min.js      # xterm.js (vendored)
│           ├── xterm-addon-fit.min.js
│           └── alpine.min.js     # Local Alpine bundle
│
├── docs/                          # Technical documentation
│
├── .github/
│   └── workflows/
│       └── release.yml           # CI/CD pipeline
│
├── go.mod
└── wails.json
```

---

## Architecture

```txt
Frontend (Alpine.js)
    │
    │ invoke(params)
    ▼
Backend (Go / Wails)
    │
    │ business logic
    ▼
System / External Services
```

`app.go` contains the core application logic exposed to the frontend via Wails bindings.

---

## Embedded terminal

```txt
xterm.js (tab)  --keystrokes-->  App.WriteTerminal(id, data)  --> PTY --> ssh
xterm.js (tab) <--base64 bytes--  event "term:data:<id>"      <-- PTY <-- ssh
xterm.js (tab)  --cols/rows--->  App.ResizeTerminal(id, c, r) --> pty.Setsize
                <--exit code---  event "term:exit:<id>"
```

- `OpenLocalTerminal` runs the user's `$SHELL` (fallback `bash`, then `sh`) in the home
  directory inside a PTY. SSH and local sessions share the same `launch()` helper and
  the same events, so input, resize, close and reconnect work identically.
- `OpenTerminal` runs the system `ssh` inside a PTY, so `~/.ssh/config`, keys,
  `ssh-agent` and password prompts work as in a normal terminal.
- Output is base64 encoded so multi-byte UTF-8 characters are never split.
- Terminal instances are kept in a plain JS `Map` (not in Alpine state).
- vendored xterm.js files come from the `@xterm/xterm` and `@xterm/addon-fit`
  npm packages (copy `lib/*.js` and `css/xterm.css` when upgrading).
- The PTY layer is Linux/macOS only (no ConPTY on Windows).

## Password vault

```txt
master password --Argon2id(salt, t, m, p)--> 256-bit key  (memory of the Go process only)
password --AES-256-GCM(random nonce)--> blob = base64(nonce || ciphertext+tag)
```

- `VaultCreate` / `VaultUnlock` / `VaultLock` / `VaultIsUnlocked` manage the key.
  The metadata returned by `VaultCreate` (salt, KDF parameters, an encrypted
  check value) is **not secret**: the frontend keeps it in `localStorage`
  (`connection-manager-vault`). `VaultUnlock` validates the master by decrypting
  the check value and clamps the KDF parameters (they come from `localStorage`).
- `EncryptSecret` / `EncryptMany` return opaque blobs, one independent
  ciphertext per connection. The blobs live in each connection as `passwordEnc`.
  The CSV export never includes them.
- The frontend never receives a key or a plaintext password: `OpenTerminal`
  gets the blob and decrypts it in Go.
- Auto-fill (`terminal.go`): the output of the PTY is scanned for the exact
  prompt `user@host's password: ` (or `(user@host) Password: `), where `host`
  is the hostname resolved with `ssh -G` (so aliases in `~/.ssh/config` work).
  The password is sent **once per session**; other prompts (sudo, nested ssh to
  another host, a ProxyJump host) never match.
- Every connection has a stable `id` (generated at load for older data), used
  for selection, editing and deletion.
- Forgetting the master means the saved passwords are lost: the unlock dialog
  offers to delete the vault (connections are kept).

---

## Prerequisites

- [Go](https://golang.org/dl/) 1.21+
- [Node.js](https://nodejs.org/) 18+ (only needed to rebuild Tailwind CSS)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation/)

### Go

```bash
# Install Go
sudo snap install go --classic
source ~/.bashrc

# Check
go version
```

### Wails

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

```txt
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

Output is placed in `build/bin/`.

The binary is fully self-contained. On Linux `libwebkit2gtk` must be available on the target system.
