package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"runtime"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx   context.Context
	lang  string
	terms *termManager
	vault *vault
}

// Errors that can reach the user. Errors stay language-agnostic: the
// frontend maps these exact messages to translated text (BACKEND_ERRORS in
// app.js) and falls back to the raw message for anything it does not know.
var (
	errInvalidTarget = errors.New("invalid username or server")
	errNoSSH         = errors.New("ssh command not found in PATH")
	errNoShell       = errors.New("no shell found")
)

// translations holds the strings the backend shows by itself (native dialogs)
var translations = map[string]map[string]string{
	"it": {
		"exportCSVTitle": "Esporta connessioni in CSV",
		"csvFiles":       "File CSV (*.csv)",
	},
	"en": {
		"exportCSVTitle": "Export CSV connections",
		"csvFiles":       "CSV Files (*.csv)",
	},
}

// SetLanguage sets the active language for backend dialogs
func (a *App) SetLanguage(lang string) {
	if _, ok := translations[lang]; ok {
		a.lang = lang
	}
}

// t is a helper that returns the translated string for a key
func (a *App) t(key string) string {
	if msgs, ok := translations[a.lang]; ok {
		if val, ok := msgs[key]; ok {
			return val
		}
	}
	// fallback to italian
	if msgs, ok := translations["it"]; ok {
		if val, ok := msgs[key]; ok {
			return val
		}
	}
	return key
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{lang: "it", terms: newTermManager(), vault: newVault()}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SaveCSV(content string) error {
	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           a.t("exportCSVTitle"),
		DefaultFilename: "connection-manager-export.csv",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: a.t("csvFiles"), Pattern: "*.csv"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	} // utente ha annullato
	return os.WriteFile(path, []byte(content), 0644)
}

// OpenSSH opens a native terminal with an SSH connection
func (a *App) OpenSSH(username, server string, port int) error {
	target := fmt.Sprintf("%s@%s", username, server)
	portStr := fmt.Sprintf("%d", port)

	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "linux":
		// Try common terminal emulators in order of preference
		terminals := []struct {
			bin  string
			args []string
		}{
			{"gnome-terminal", []string{"--", "ssh", target, "-p", portStr}},
			{"konsole", []string{"-e", "ssh", target, "-p", portStr}},
			{"xfce4-terminal", []string{"-e", fmt.Sprintf("ssh %s -p %s", target, portStr)}},
			{"xterm", []string{"-e", fmt.Sprintf("ssh %s -p %s", target, portStr)}},
		}
		for _, t := range terminals {
			if path, err := exec.LookPath(t.bin); err == nil {
				cmd = exec.Command(path, t.args...)
				break
			}
		}
		if cmd == nil {
			return errors.New("no terminal emulator found")
		}
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	return cmd.Start()
}
