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
        Title:           "Esporta connessioni CSV",
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
			return fmt.Errorf("no terminal emulator found")
		}

	case "darwin":
		// AppleScript to open Terminal.app with SSH
		script := fmt.Sprintf(
			`tell application "Terminal" to do script "ssh %s -p %s"`,
			target, portStr,
		)
		cmd = exec.Command("osascript", "-e", script)

	case "windows":
		// Windows Terminal or fallback to cmd
		sshCmd := fmt.Sprintf("ssh %s -p %s", target, portStr)
		if path, err := exec.LookPath("wt"); err == nil {
			cmd = exec.Command(path, "new-tab", "--", "cmd", "/k", sshCmd)
		} else {
			cmd = exec.Command("cmd", "/c", "start", "cmd", "/k", sshCmd)
		}
	}

	return cmd.Start()
}
