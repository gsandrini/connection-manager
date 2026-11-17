package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// termSession is one embedded SSH session running inside a PTY.
type termSession struct {
	id     string
	cmd    *exec.Cmd
	ptmx   *os.File
	closed bool // set under App.termMu when the user closes the tab

	// Auto-fill of a saved password (see pumpTerminal). Only touched by the
	// pump goroutine, so it needs no locking.
	autoPw  []byte   // decrypted password, nil once sent (or if none)
	prompts [][]byte // exact password prompts ssh is expected to print
}

// termManager keeps track of all the live terminal sessions.
type termManager struct {
	mu       sync.Mutex
	sessions map[string]*termSession
}

func newTermManager() *termManager {
	return &termManager{sessions: make(map[string]*termSession)}
}

// validSSHField rejects empty values and anything that ssh could interpret
// as an option (leading "-") or that contains whitespace/control chars.
func validSSHField(v string) bool {
	if v == "" || strings.HasPrefix(v, "-") {
		return false
	}
	for _, r := range v {
		if r <= ' ' || r == 0x7f {
			return false
		}
	}
	return true
}

// OpenTerminal starts `ssh user@server -p port` inside a PTY and streams its
// output to the frontend through Wails events:
//
//	term:data:<id>  base64 encoded bytes read from the PTY
//	term:exit:<id>  exit code (int) when the process ends
//
// passwordEnc is an optional vault blob. If the vault is unlocked, the
// password is typed ONCE, only when ssh prints its own password prompt for
// this very user@host. It never reaches the frontend.
func (a *App) OpenTerminal(id, username, server string, port, cols, rows int, passwordEnc string) error {
	if !validSSHField(id) || !validSSHField(username) || !validSSHField(server) {
		return errors.New(a.t("invalidTarget"))
	}
	if port <= 0 || port > 65535 {
		port = 22
	}
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	sshBin, err := exec.LookPath("ssh")
	if err != nil {
		return errors.New(a.t("noSSH"))
	}

	a.terms.mu.Lock()
	if _, exists := a.terms.sessions[id]; exists {
		a.terms.mu.Unlock()
		return fmt.Errorf("session %s already exists", id)
	}
	a.terms.mu.Unlock()

	cmd := exec.Command(sshBin, "-p", strconv.Itoa(port), "--", fmt.Sprintf("%s@%s", username, server))
	cmd.Env = append(os.Environ(), "TERM=xterm-256color", "COLORTERM=truecolor")

	return a.launch(id, cmd, cols, rows, func(s *termSession) {
		if passwordEnc == "" {
			return
		}
		if pw, err := a.vault.decrypt(passwordEnc); err == nil {
			s.autoPw = pw
			s.prompts = expectedPrompts(sshBin, username, server, port)
		}
		// vault locked or blob unreadable: no auto-fill, the user types it
	})
}

// OpenLocalTerminal starts the user's own shell ($SHELL) inside a PTY, in the
// home directory. It uses the same events and the same WriteTerminal /
// ResizeTerminal / CloseTerminal calls as the ssh sessions.
func (a *App) OpenLocalTerminal(id string, cols, rows int) error {
	if !validSSHField(id) {
		return errors.New(a.t("invalidTarget"))
	}
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	shell := ""
	for _, c := range []string{os.Getenv("SHELL"), "bash", "sh"} {
		if c == "" {
			continue
		}
		if p, err := exec.LookPath(c); err == nil {
			shell = p
			break
		}
	}
	if shell == "" {
		return errors.New(a.t("noShell"))
	}

	var args []string
	if runtime.GOOS == "darwin" {
		args = []string{"-l"} // macOS terminals start login shells
	}
	cmd := exec.Command(shell, args...)
	if home, err := os.UserHomeDir(); err == nil {
		cmd.Dir = home
	}
	cmd.Env = append(os.Environ(), "TERM=xterm-256color", "COLORTERM=truecolor")

	return a.launch(id, cmd, cols, rows, nil)
}

// launch runs cmd in a new PTY, registers the session and starts pumping its
// output. setup (optional) runs before the pump starts.
func (a *App) launch(id string, cmd *exec.Cmd, cols, rows int, setup func(*termSession)) error {
	a.terms.mu.Lock()
	if _, exists := a.terms.sessions[id]; exists {
		a.terms.mu.Unlock()
		return fmt.Errorf("session %s already exists", id)
	}
	a.terms.mu.Unlock()

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
	if err != nil {
		return err
	}

	s := &termSession{id: id, cmd: cmd, ptmx: ptmx}
	if setup != nil {
		setup(s)
	}
	a.terms.mu.Lock()
	a.terms.sessions[id] = s
	a.terms.mu.Unlock()

	go a.pumpTerminal(s)
	return nil
}

// pumpTerminal copies PTY output to the frontend until the process exits.
func (a *App) pumpTerminal(s *termSession) {
	buf := make([]byte, 32*1024)
	var tail []byte // last bytes of output, used to spot the password prompt
	for {
		n, err := s.ptmx.Read(buf)
		if n > 0 {
			wailsRuntime.EventsEmit(a.ctx, "term:data:"+s.id, base64.StdEncoding.EncodeToString(buf[:n]))
			if s.autoPw != nil {
				tail = append(tail, buf[:n]...)
				if len(tail) > 512 {
					tail = tail[len(tail)-512:]
				}
				if endsWithAny(tail, s.prompts) {
					// Once per session: if the password is wrong ssh asks
					// again and the user types it by hand (no lock-outs).
					_, _ = s.ptmx.Write(append(append([]byte{}, s.autoPw...), '\r'))
					zero(s.autoPw)
					s.autoPw = nil
					tail = nil
				}
			}
		}
		if err != nil {
			break
		}
	}
	zero(s.autoPw)
	s.autoPw = nil

	exitCode := 0
	if err := s.cmd.Wait(); err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			exitCode = ee.ExitCode()
		} else {
			exitCode = -1
		}
	}
	_ = s.ptmx.Close()

	a.terms.mu.Lock()
	wasClosed := s.closed
	delete(a.terms.sessions, s.id)
	a.terms.mu.Unlock()

	// If the user closed the tab there is nobody listening anymore.
	if !wasClosed {
		wailsRuntime.EventsEmit(a.ctx, "term:exit:"+s.id, exitCode)
	}
}

// WriteTerminal sends keyboard input to a session.
func (a *App) WriteTerminal(id, data string) {
	a.terms.mu.Lock()
	s := a.terms.sessions[id]
	a.terms.mu.Unlock()
	if s == nil {
		return
	}
	_, _ = s.ptmx.Write([]byte(data))
}

// PasteSavedPassword writes the saved password of a connection into a running
// session, on demand (context menu "Paste password"). Unlike the automatic
// fill it does not wait for ssh's prompt and it does not press Enter: the
// user decides where it goes and confirms it. The plaintext stays inside this
// process, it is never returned to the frontend.
func (a *App) PasteSavedPassword(id, passwordEnc string) error {
	if passwordEnc == "" {
		return errors.New("no saved password")
	}
	a.terms.mu.Lock()
	s := a.terms.sessions[id]
	a.terms.mu.Unlock()
	if s == nil {
		return errors.New("session not found")
	}
	pw, err := a.vault.decrypt(passwordEnc)
	if err != nil {
		return err // vault locked or blob unreadable
	}
	defer zero(pw)
	_, err = s.ptmx.Write(pw)
	return err
}

// ResizeTerminal updates the PTY window size (SIGWINCH is sent by the kernel).
func (a *App) ResizeTerminal(id string, cols, rows int) {
	if cols <= 0 || rows <= 0 {
		return
	}
	a.terms.mu.Lock()
	s := a.terms.sessions[id]
	a.terms.mu.Unlock()
	if s == nil {
		return
	}
	_ = pty.Setsize(s.ptmx, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
}

// CloseTerminal terminates a session (called when the tab is closed).
func (a *App) CloseTerminal(id string) {
	a.terms.mu.Lock()
	s := a.terms.sessions[id]
	if s != nil {
		s.closed = true
	}
	a.terms.mu.Unlock()
	if s != nil {
		killSession(s)
	}
}

// shutdown is called by Wails when the window is closing.
func (a *App) shutdown(_ context.Context) {
	a.terms.mu.Lock()
	all := make([]*termSession, 0, len(a.terms.sessions))
	for _, s := range a.terms.sessions {
		s.closed = true
		all = append(all, s)
	}
	a.terms.mu.Unlock()
	for _, s := range all {
		killSession(s)
	}
}

// killSession asks ssh to quit (SIGHUP, like closing a terminal) and closes
// the PTY. The pump goroutine reaps the process.
func killSession(s *termSession) {
	if s.cmd.Process != nil {
		_ = s.cmd.Process.Signal(syscall.SIGHUP)
	}
	_ = s.ptmx.Close()
}

// endsWithAny reports whether b ends with any of the given prompts.
func endsWithAny(b []byte, prompts [][]byte) bool {
	for _, p := range prompts {
		if bytes.HasSuffix(b, p) {
			return true
		}
	}
	return false
}

// expectedPrompts returns the exact prompts OpenSSH prints when it asks for
// the password of user@host. The host shown by ssh is the *resolved*
// hostname (after ~/.ssh/config), so it is looked up with `ssh -G`.
// Anything else (sudo, a nested ssh to another host, a ProxyJump host...)
// does not match and never receives the saved password.
func expectedPrompts(sshBin, username, server string, port int) [][]byte {
	hosts := []string{server}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, sshBin, "-G", "-p", strconv.Itoa(port), "--",
		fmt.Sprintf("%s@%s", username, server)).Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if f := strings.Fields(line); len(f) == 2 && f[0] == "hostname" && f[1] != server {
				hosts = append(hosts, f[1])
				break
			}
		}
	}
	var prompts [][]byte
	for _, h := range hosts {
		// password authentication / keyboard-interactive
		prompts = append(prompts,
			[]byte(fmt.Sprintf("%s@%s's password: ", username, h)),
			[]byte(fmt.Sprintf("(%s@%s) Password: ", username, h)))
	}
	return prompts
}
