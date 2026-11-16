package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"sync"

	"golang.org/x/crypto/argon2"
)

/*
 * Password vault.
 *
 * - The master password is turned into a 256-bit key with Argon2id.
 * - Every secret is sealed with AES-256-GCM using a fresh random nonce:
 *   blob = base64(nonce || ciphertext+tag)
 * - The key lives ONLY in this process' memory while the vault is unlocked.
 *   The frontend never sees the key nor any plaintext password: it just
 *   stores the opaque blobs (in localStorage) and hands them back to Go
 *   when a terminal session needs them.
 * - "meta" (salt, KDF params, encrypted check value) is not secret and is
 *   kept by the frontend, next to the blobs.
 */

const (
	vaultVersion   = 1
	vaultCheckText = "connection-manager-vault-v1"
	minMasterLen   = 8

	defaultArgonTime    uint32 = 3
	defaultArgonMemory  uint32 = 64 * 1024 // KiB = 64 MiB
	defaultArgonThreads uint8  = 4
)

var (
	errVaultLocked = errors.New("vault is locked")
	errBadMaster   = errors.New("invalid master password")
	errBadMeta     = errors.New("invalid vault metadata")
	errShortMaster = errors.New("master password too short")
)

type vaultMeta struct {
	V       int    `json:"v"`
	KDF     string `json:"kdf"`
	Salt    string `json:"salt"`
	Time    uint32 `json:"t"`
	Memory  uint32 `json:"m"` // KiB
	Threads uint8  `json:"p"`
	Check   string `json:"check"`
}

type vault struct {
	mu  sync.RWMutex
	key []byte // nil while locked
}

func newVault() *vault { return &vault{} }

func deriveKey(master string, salt []byte, t, m uint32, p uint8) []byte {
	return argon2.IDKey([]byte(master), salt, t, m, p, 32)
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

func seal(key, plain []byte) (string, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	out := gcm.Seal(nonce, nonce, plain, nil) // nonce || ct || tag
	return base64.StdEncoding.EncodeToString(out), nil
}

func open(key []byte, blob string) ([]byte, error) {
	raw, err := base64.StdEncoding.DecodeString(blob)
	if err != nil {
		return nil, err
	}
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	if len(raw) < gcm.NonceSize()+gcm.Overhead() {
		return nil, errors.New("blob too short")
	}
	nonce, ct := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ct, nil)
}

func zero(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

// ---- internal helpers used by the terminal code ----

func (v *vault) currentKey() []byte {
	v.mu.RLock()
	defer v.mu.RUnlock()
	if v.key == nil {
		return nil
	}
	k := make([]byte, len(v.key))
	copy(k, v.key)
	return k
}

// decrypt returns the plaintext of a blob (caller must zero it after use).
func (v *vault) decrypt(blob string) ([]byte, error) {
	k := v.currentKey()
	if k == nil {
		return nil, errVaultLocked
	}
	defer zero(k)
	return open(k, blob)
}

// ---- methods exposed to the frontend through Wails ----

// VaultCreate sets up a new vault protected by `master`, unlocks it and
// returns the metadata (JSON) that the frontend must persist.
func (a *App) VaultCreate(master string) (string, error) {
	if len([]rune(master)) < minMasterLen {
		return "", errShortMaster
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := deriveKey(master, salt, defaultArgonTime, defaultArgonMemory, defaultArgonThreads)
	check, err := seal(key, []byte(vaultCheckText))
	if err != nil {
		zero(key)
		return "", err
	}
	meta := vaultMeta{
		V: vaultVersion, KDF: "argon2id",
		Salt: base64.StdEncoding.EncodeToString(salt),
		Time: defaultArgonTime, Memory: defaultArgonMemory, Threads: defaultArgonThreads,
		Check: check,
	}
	out, err := json.Marshal(meta)
	if err != nil {
		zero(key)
		return "", err
	}
	a.vault.mu.Lock()
	zero(a.vault.key)
	a.vault.key = key
	a.vault.mu.Unlock()
	return string(out), nil
}

// VaultUnlock derives the key from `master` and checks it against the
// encrypted check value stored in the metadata.
func (a *App) VaultUnlock(master, metaJSON string) error {
	var meta vaultMeta
	if err := json.Unmarshal([]byte(metaJSON), &meta); err != nil {
		return errBadMeta
	}
	salt, err := base64.StdEncoding.DecodeString(meta.Salt)
	// The metadata comes from localStorage: clamp the parameters so a
	// tampered value cannot make us allocate gigabytes.
	if err != nil || meta.V != vaultVersion || meta.KDF != "argon2id" ||
		len(salt) < 16 || len(salt) > 64 ||
		meta.Time < 1 || meta.Time > 10 ||
		meta.Memory < 8*1024 || meta.Memory > 256*1024 ||
		meta.Threads < 1 || meta.Threads > 16 {
		return errBadMeta
	}
	key := deriveKey(master, salt, meta.Time, meta.Memory, meta.Threads)
	plain, err := open(key, meta.Check)
	if err != nil || subtle.ConstantTimeCompare(plain, []byte(vaultCheckText)) != 1 {
		zero(key)
		return errBadMaster
	}
	a.vault.mu.Lock()
	zero(a.vault.key)
	a.vault.key = key
	a.vault.mu.Unlock()
	return nil
}

// VaultLock wipes the key from memory.
func (a *App) VaultLock() {
	a.vault.mu.Lock()
	zero(a.vault.key)
	a.vault.key = nil
	a.vault.mu.Unlock()
}

// VaultIsUnlocked tells whether the key is currently in memory
// (useful after a frontend reload in `wails dev`).
func (a *App) VaultIsUnlocked() bool {
	a.vault.mu.RLock()
	defer a.vault.mu.RUnlock()
	return a.vault.key != nil
}

// EncryptSecret seals one password and returns the opaque blob.
func (a *App) EncryptSecret(plain string) (string, error) {
	blobs, err := a.EncryptMany(plain, 1)
	if err != nil {
		return "", err
	}
	return blobs[0], nil
}

// EncryptMany seals the same password n times, each with its own random
// nonce, so that two connections never share the same ciphertext.
func (a *App) EncryptMany(plain string, n int) ([]string, error) {
	if n < 0 || n > 100000 {
		return nil, errors.New("invalid count")
	}
	key := a.vault.currentKey()
	if key == nil {
		return nil, errVaultLocked
	}
	defer zero(key)
	out := make([]string, n)
	pb := []byte(plain)
	defer zero(pb)
	for i := range out {
		b, err := seal(key, pb)
		if err != nil {
			return nil, err
		}
		out[i] = b
	}
	return out, nil
}
