# Connection Manager

Connection Manager keeps all SSH connections organized in one place. Browse them in tree or table view, filter by any field in real time, import and export via CSV, and connect instantly: every session opens in its own **tab with an embedded terminal**, so you never end up with a pile of terminal windows. Passwords can be saved encrypted behind a master password.

---

## Screenshot

### Connection Manager
![image](./assets/screenshots/connection-manager.png)

### Tiled Terminals
![image](assets/screenshots/connection-manager-tiled-terminals.png)

---

## Features

**Connections**

- Manage SSH connections with name, server, port, username and group
- Tree view grouped by environment and group
- Table view with sortable columns
- Real-time search across name, server, username, group and labels
- Import connections from CSV / export connections to CSV (passwords are never exported), under **Preferences > Data**, next to **Delete all**

**Terminal tabs**

- Embedded SSH terminal in tabs (xterm.js + PTY): many sessions, one window
- Uses your system `ssh`, so keys, `ssh-agent` and `~/.ssh/config` work as usual
- Press Enter on an ended session to reconnect
- Local shell in a tab: your own `$SHELL`, opened in your home directory ("Local" button, the `+` in the tab bar, or `Ctrl+Shift+T`)
- Terminal font size (8–32 px) set from the Preferences panel (gear icon on the home page): global, applied instantly to every open tab and remembered across restarts
- **SSH keep-alive** (Preferences > Connection parameters, on by default): sets `ServerAliveInterval` (default 30 s) and `ServerAliveCountMax` (default 3) so firewalls and NATs do not drop idle sessions. Global, remembered across restarts, applied to the sessions opened from then on; when on it takes precedence over `~/.ssh/config`, when off `ssh` behaves as usual
- Optional copy-on-select (Preferences, off by default): the selected text is copied to the clipboard when you release the mouse button
- **Tiles**: turn on the **Open in tiles** switch at the bottom right of the connection list and new terminals open side by side in a single **Tiles** tab (2x2 grid, up to 4 terminals) instead of one tab each. With it unticked (default) every terminal gets its own tab. The choice is remembered across restarts; when the grid is full a red message says so and nothing is opened
- **Broadcast input** (Tiles tab): tick it to send what you type or paste in the focused tile to every tile. It always starts off, and while it is on the tiles and the bar turn red. A password typed by hand also goes to every terminal

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+T` | New local shell tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+Shift+W` or middle-click | Close the current tab (in Tiles: the focused tile; middle-click or the ✕ on the Tiles tab closes all its terminals) |
| `Ctrl+Shift+←` / `Ctrl+Shift+→` | Move focus between tiles |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste |
| `Ctrl +` / `Ctrl -` / `Ctrl+0` (or `Ctrl` + mouse wheel) | Terminal font larger / smaller / default |
| Right-click in the terminal | Menu: Copy, Paste, Paste password, Select all, Clear screen |

**Saved passwords** (optional)

- Protected by a master password asked at startup, like KeePass
- Encrypted with AES-256-GCM, key derived with Argon2id and kept only in the backend's memory
- Typed automatically, once, only at the `user@host's password:` prompt of the right server
- On demand: right-click in an SSH terminal > **Paste password** types the saved password into the session (e.g. for `sudo`), without pressing Enter. It is decrypted and typed by the backend and never reaches the UI or the clipboard
- Bulk password change: search (e.g. by username and group), tick rows or whole groups, set the new password

---

## Requirements

- Linux (the embedded terminal also works on macOS; Windows is not supported)
- The `ssh` command available in your `PATH`

---

## Security notes

- Passwords are stored encrypted in the app's local storage; the master password and the key are never saved.
- If you forget the master password the saved passwords cannot be recovered. You can reset the vault (connections are kept).
- Whoever can use your unlocked session can use the saved passwords, as with any password manager.
- Prefer SSH keys when you can: they need no password at all.

---

## Install

```bash
curl -fsSL https://github.com/gsandrini/connection-manager/releases/latest/download/install.sh | bash
```

---

### Uninstall

```bash
curl -fsSL https://github.com/gsandrini/connection-manager/releases/latest/download/install.sh | bash -s -- --uninstall
```

---

## Tech stack

- [Wails](https://wails.io) - Desktop framework (Go + WebView)
- [Go](https://golang.org) - Backend logic
- [xterm.js](https://xtermjs.org) - Embedded terminal (bundled locally)
- [golang.org/x/crypto](https://pkg.go.dev/golang.org/x/crypto) - Argon2id key derivation for the password vault
- [creack/pty](https://github.com/creack/pty) - PTY for the SSH sessions
- [Alpine.js](https://alpinejs.dev) - Reactive UI (bundled locally)
- [Tailwind CSS](https://tailwindcss.com) - Styling (compiled locally)
- [Google Fonts](https://fonts.google.com) - Inter and JetBrains Mono typography (loaded from CDN)

---

## Built with

This project was built with the support of AI.

---

## Contributing

This repository is published for personal use / GitHub Pages only.
Pull requests and issues will not be reviewed or accepted.

---

## License

This project is licensed under the **GNU General Public License v3.0**.
See the [LICENSE](LICENSE) file for details.
