package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx  context.Context
	lang string
}

// translations holds all UI strings per language
var translations = map[string]map[string]string{
	"it": {
		"noTerminal":    "Nessun emulatore di terminale trovato.",
		"unsupportedOS": "Sistema operativo non supportato: ",
	},
	"en": {
		"noTerminal":    "No terminal emulator found.",
		"unsupportedOS": "Unsupported OS: ",
	},
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SetLanguage sets the active language for backend messages
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
	return key
}

func (a *App) SaveCSV(content string) error {
	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           "Export CSV connections",
		DefaultFilename: "connection-manager-export.csv",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "CSV Files (*.csv)", Pattern: "*.csv"},
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
			return fmt.Errorf("%s", a.t("noTerminal"))
		}
	default:
		return fmt.Errorf("%s%s", a.t("unsupportedOS"), runtime.GOOS)
	}

	return cmd.Start()
}
