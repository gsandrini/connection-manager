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
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SaveCSV(content string) error {
    path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
        Title: "Export CSV connections",
        DefaultFilename: "connection-manager-export.csv",
        Filters: []wailsRuntime.FileFilter{
            {DisplayName: "CSV Files (*.csv)", Pattern: "*.csv"},
        },
    })
    if err != nil { return err }
    if path == "" { return nil } // utente ha annullato
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
			return fmt.Errorf("No terminal emulator found")
		}
    default:
        return fmt.Errorf("Unsupported OS: %s", runtime.GOOS)
    }

    return cmd.Start()
}
