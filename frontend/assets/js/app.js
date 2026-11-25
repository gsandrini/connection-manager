'use strict';

const STORAGE_KEY = 'connection-manager-connections';
const VAULT_KEY = 'connection-manager-vault';
const PREF_KEYS = {
  language: 'language',
  theme: 'theme',
  fontSize: 'terminalFontSize',
  autoCopy: 'terminalCopyOnSelect',
};
const THEME_COLORS = { light: '#f7f7f4', dark: '#181a1f' };

// Terminal font size (px): global preference, applied to every terminal tab
const TERM_FONT = { min: 8, max: 32, def: 13 };

function clampFontSize(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return TERM_FONT.def;
  return Math.min(TERM_FONT.max, Math.max(TERM_FONT.min, n));
}

function loadFontSize() {
  try {
    const raw = localStorage.getItem(PREF_KEYS.fontSize);
    if (raw !== null) return clampFontSize(raw);
  } catch (_) { /* storage unavailable: use the default */ }
  return TERM_FONT.def;
}

// Copy-on-select is opt-in: off unless the user enabled it
function loadAutoCopy() {
  try { return localStorage.getItem(PREF_KEYS.autoCopy) === '1'; } catch (_) { return false; }
}

// Ctrl + / Ctrl - / Ctrl 0  ->  +1 / -1 / 0 (reset). null when it is not a font-size shortcut.
function fontShortcut(ev) {
  if (!ev.ctrlKey || ev.altKey || ev.metaKey) return null;
  if (ev.key === '+' || ev.key === '=') return 1;
  if (ev.key === '-' || ev.key === '_') return -1;
  if (ev.key === '0') return 0;
  return null;
}

// Stable identifier for a connection (name+server is not unique)
function newId() {
  if (window.crypto && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* insecure context */ }
  }
  const a = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

const TRANSLATIONS = {
  it: {
    title: 'Connection Manager',
    search: 'Cerca per nome, server, username, gruppo, label…',
    treeView: 'Albero',
    tableView: 'Tabella',
    expandAll: 'Espandi tutto',
    collapseAll: 'Chiudi tutto',
    addConnection: 'Aggiungi',
    importCsv: 'Importa CSV',
    help: 'Aiuto',
    connect: 'Connetti',
    edit: 'Modifica',
    delete: 'Elimina',
    deleteAll: 'Elimina tutto',
    confirmDeleteAllTitle: 'Elimina tutte le connessioni',
    confirmDeleteAllMsg: (n) => `Eliminare tutte le ${n} connessioni? L'operazione non è reversibile.`,
    selectHost: 'Seleziona un host per vedere i dettagli',
    noConnections: 'Nessuna connessione. Aggiungi la prima con il pulsante "Aggiungi".',
    noResults: 'Nessun risultato per la ricerca.',
    addConnectionTitle: 'Aggiungi connessione',
    editConnectionTitle: 'Modifica connessione',
    fieldName: 'Nome',
    fieldServer: 'Server',
    fieldPort: 'Porta',
    fieldUsername: 'Username',
    fieldGroup: 'Gruppo',
    fieldGroupHint: 'es. prod/web',
    fieldLabels: 'Labels',
    save: 'Salva',
    cancel: 'Annulla',
    requiredField: 'Campo obbligatorio.',
    invalidPort: 'La porta deve essere un numero.',
    confirmDeleteTitle: 'Elimina connessione',
    confirmDeleteMsg: (name) => `Eliminare "${name}"?`,
    confirmYes: 'Elimina',
    confirmNo: 'Annulla',
    helpTitle: 'Aiuto',
    helpClose: 'Chiudi',
    csvImportSuccess: (n) => `${n} connessioni importate.`,
    csvImportError: 'Errore durante l\'importazione del CSV.',
    exportCsv: 'Esporta CSV',
    csvExportSuccess: (n) => `${n} connessioni esportate.`,
    csvExportError: 'Errore durante l\'esportazione del CSV.',
    connectError: 'Impossibile aprire il terminale.',
    errInvalidTarget: 'Utente o server non validi.',
    errNoSSH: 'Comando ssh non trovato nel PATH.',
    errNoShell: 'Nessuna shell trovata.',
    tabHome: 'Connessioni',
    localTab: 'Locale',
    connectLocal: 'Locale',
    connectLocalHint: 'Apri una shell locale in una nuova scheda (Ctrl+Shift+T)',
    closeTab: 'Chiudi scheda',
    connectExternal: 'Esterno',
    connectExternalHint: 'Apri in un terminale esterno',
    terminalError: 'Impossibile avviare la sessione SSH.',
    ctxCopy: 'Copia',
    ctxPaste: 'Incolla',
    ctxPastePw: 'Incolla password',
    ctxSelectAll: 'Seleziona tutto',
    ctxClear: 'Pulisci schermo',
    ctxPwLocked: 'Vault bloccato',
    ctxPwNone: 'Non salvata',
    pastePwError: 'Impossibile incollare la password (vault bloccato o sessione chiusa).',
    sessionEnded: (code) => `[Sessione terminata (codice ${code}) - premi Invio per riconnetterti]`,
    thName: 'Nome', thServer: 'Server', thPort: 'Porta',
    thUsername: 'Username', thGroup: 'Gruppo', thLabels: 'Labels',
    madeWith: 'Developed with AI assistance',
    // vault
    vaultNone: 'Password', vaultLocked: 'Bloccato', vaultUnlocked: 'Sbloccato',
    vaultBtnNone: 'Configura il salvataggio delle password',
    vaultBtnLocked: 'Sblocca le password salvate',
    vaultBtnUnlocked: 'Blocca le password salvate',
    vaultCreateTitle: 'Crea la master password',
    vaultUnlockTitle: 'Sblocca le password',
    vaultCreateHint: 'Le password salvate vengono cifrate (AES-256) con questa master password, che ti verrà chiesta a ogni avvio. Se la dimentichi, le password salvate non sono recuperabili.',
    vaultUnlockHint: 'Inserisci la master password per usare le password salvate.',
    masterPassword: 'Master password', masterConfirm: 'Ripeti la master password',
    vaultCreateBtn: 'Crea', vaultUnlockBtn: 'Sblocca', vaultSkip: 'Salta',
    vaultTooShort: 'La master password deve avere almeno 8 caratteri.',
    vaultMismatch: 'Le due password non coincidono.',
    vaultWrong: 'Master password errata.',
    vaultError: 'Errore del vault.',
    vaultForgot: 'Master dimenticata?',
    vaultResetMsg: 'Eliminando il vault verranno cancellate TUTTE le password salvate (le connessioni restano).',
    vaultResetBtn: 'Elimina vault e password',
    vaultResetDone: 'Vault eliminato.',
    vaultLockedErr: 'Sblocca il vault per salvare password.',
    fieldPassword: 'Password',
    passwordKeepPlaceholder: 'Salvata - lascia vuoto per non cambiarla',
    passwordOptional: 'Opzionale. Salvata cifrata.',
    passwordRemove: 'Rimuovi la password salvata',
    passwordNeedsCreate: 'Per salvare una password devi creare una master password.',
    passwordNeedsUnlock: 'Per salvare una password devi sbloccare il vault.',
    passwordSaved: 'password salvata',
    autofillLocked: 'Vault bloccato: la password salvata non verrà inviata.',
    // bulk
    selectAll: 'Seleziona tutti', deselectAll: 'Deseleziona tutti',
    bulkSelected: (n) => `${n} selezionate`,
    bulkChange: 'Cambia password', bulkClear: 'Deseleziona',
    bulkTitle: (n) => `Cambia password a ${n} connessioni`,
    bulkSummary: (n, users, groups) => `Connessioni: ${n}  ·  Utenti: ${users}  ·  Gruppi: ${groups}`,
    bulkNew: 'Nuova password', bulkConfirm: 'Ripeti la password',
    bulkShow: 'Mostra', bulkHide: 'Nascondi',
    bulkApply: 'Applica', bulkRemove: 'Rimuovi password salvata',
    bulkEmpty: 'Inserisci una password.', bulkMismatch: 'Le due password non coincidono.',
    bulkDone: (n) => `Password aggiornata per ${n} connessioni.`,
    bulkRemoved: (n) => `Password rimossa da ${n} connessioni.`,
    bulkNote: 'Cambia solo la password salvata nell\'app, non quella sul server.',
    switchToItalian: 'Passa a italiano',
    switchToEnglish: 'Passa a inglese',
    activateLightTheme: 'Attiva tema chiaro',
    activateDarkTheme: 'Attiva tema scuro',
    settingsAutoCopy: 'Copia automaticamente la selezione',
    settingsAutoCopyHint: 'Il testo selezionato nel terminale viene copiato negli appunti al rilascio del mouse.',
    settings: 'Preferenze',
    settingsTitle: 'Preferenze',
    settingsClose: 'Chiudi',
    settingsTerminal: 'Terminale',
    settingsFontSize: 'Dimensione del font',
    settingsFontSizeHint: 'Si applica subito a tutti i terminali aperti. Scorciatoie nel terminale: Ctrl + / Ctrl − / Ctrl 0, oppure Ctrl + rotella.',
    settingsReset: 'Ripristina',
    fontSmaller: 'Riduci il font',
    fontLarger: 'Aumenta il font',
  },
  en: {
    title: 'Connection Manager',
    search: 'Search by name, server, username, group, label…',
    treeView: 'Tree',
    tableView: 'Table',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    addConnection: 'Add',
    importCsv: 'Import CSV',
    help: 'Help',
    connect: 'Connect',
    edit: 'Edit',
    delete: 'Delete',
    deleteAll: 'Delete all',
    confirmDeleteAllTitle: 'Delete all connections',
    confirmDeleteAllMsg: (n) => `Delete all ${n} connections? This cannot be undone.`,
    selectHost: 'Select a host to see details',
    noConnections: 'No connections yet. Add the first one with the "Add" button.',
    noResults: 'No results for this search.',
    addConnectionTitle: 'Add connection',
    editConnectionTitle: 'Edit connection',
    fieldName: 'Name', fieldServer: 'Server', fieldPort: 'Port',
    fieldUsername: 'Username', fieldGroup: 'Group',
    fieldGroupHint: 'e.g. prod/web',
    fieldLabels: 'Labels',
    save: 'Save',
    cancel: 'Cancel',
    requiredField: 'Required field.',
    invalidPort: 'Port must be a number.',
    confirmDeleteTitle: 'Delete connection',
    confirmDeleteMsg: (name) => `Delete "${name}"?`,
    confirmYes: 'Delete',
    confirmNo: 'Cancel',
    helpTitle: 'Help',
    helpClose: 'Close',
    csvImportSuccess: (n) => `${n} connections imported.`,
    csvImportError: 'Error importing CSV.',
    exportCsv: 'Export CSV',
    csvExportSuccess: (n) => `${n} connections exported.`,
    csvExportError: 'Error exporting CSV.',
    connectError: 'Could not open terminal.',
    errInvalidTarget: 'Invalid username or server.',
    errNoSSH: 'ssh command not found in PATH.',
    errNoShell: 'No shell found.',
    tabHome: 'Connections',
    localTab: 'Local',
    connectLocal: 'Local',
    connectLocalHint: 'Open a local shell in a new tab (Ctrl+Shift+T)',
    closeTab: 'Close tab',
    connectExternal: 'External',
    connectExternalHint: 'Open in an external terminal',
    terminalError: 'Could not start the SSH session.',
    ctxCopy: 'Copy',
    ctxPaste: 'Paste',
    ctxPastePw: 'Paste password',
    ctxSelectAll: 'Select all',
    ctxClear: 'Clear screen',
    ctxPwLocked: 'Vault locked',
    ctxPwNone: 'Not saved',
    pastePwError: 'Could not paste the password (vault locked or session closed).',
    sessionEnded: (code) => `[Session ended (code ${code}) - press Enter to reconnect]`,
    thName: 'Name', thServer: 'Server', thPort: 'Port',
    thUsername: 'Username', thGroup: 'Group', thLabels: 'Labels',
    madeWith: 'Developed with AI assistance',
    // vault
    vaultNone: 'Passwords', vaultLocked: 'Locked', vaultUnlocked: 'Unlocked',
    vaultBtnNone: 'Set up password saving',
    vaultBtnLocked: 'Unlock saved passwords',
    vaultBtnUnlocked: 'Lock saved passwords',
    vaultCreateTitle: 'Create the master password',
    vaultUnlockTitle: 'Unlock passwords',
    vaultCreateHint: 'Saved passwords are encrypted (AES-256) with this master password, which will be asked at every start. If you forget it, saved passwords cannot be recovered.',
    vaultUnlockHint: 'Enter the master password to use saved passwords.',
    masterPassword: 'Master password', masterConfirm: 'Repeat the master password',
    vaultCreateBtn: 'Create', vaultUnlockBtn: 'Unlock', vaultSkip: 'Skip',
    vaultTooShort: 'The master password must be at least 8 characters.',
    vaultMismatch: 'The two passwords do not match.',
    vaultWrong: 'Wrong master password.',
    vaultError: 'Vault error.',
    vaultForgot: 'Forgot the master?',
    vaultResetMsg: 'Deleting the vault erases ALL saved passwords (connections are kept).',
    vaultResetBtn: 'Delete vault and passwords',
    vaultResetDone: 'Vault deleted.',
    vaultLockedErr: 'Unlock the vault to save passwords.',
    fieldPassword: 'Password',
    passwordKeepPlaceholder: 'Saved - leave empty to keep it',
    passwordOptional: 'Optional. Stored encrypted.',
    passwordRemove: 'Remove the saved password',
    passwordNeedsCreate: 'To save a password you need to create a master password.',
    passwordNeedsUnlock: 'To save a password you need to unlock the vault.',
    passwordSaved: 'password saved',
    autofillLocked: 'Vault locked: the saved password will not be sent.',
    // bulk
    selectAll: 'Select all', deselectAll: 'Deselect all',
    bulkSelected: (n) => `${n} selected`,
    bulkChange: 'Change password', bulkClear: 'Deselect',
    bulkTitle: (n) => `Change password for ${n} connections`,
    bulkSummary: (n, users, groups) => `Connections: ${n}  ·  Users: ${users}  ·  Groups: ${groups}`,
    bulkNew: 'New password', bulkConfirm: 'Repeat the password',
    bulkShow: 'Show', bulkHide: 'Hide',
    bulkApply: 'Apply', bulkRemove: 'Remove saved password',
    bulkEmpty: 'Enter a password.', bulkMismatch: 'The two passwords do not match.',
    bulkDone: (n) => `Password updated for ${n} connections.`,
    bulkRemoved: (n) => `Password removed from ${n} connections.`,
    bulkNote: 'Only changes the password saved in the app, not the one on the server.',
    switchToItalian: 'Switch to Italian',
    switchToEnglish: 'Switch to English',
    activateLightTheme: 'Activate light theme',
    activateDarkTheme: 'Activate dark theme',
    settingsAutoCopy: 'Copy selection automatically',
    settingsAutoCopyHint: 'Text selected in the terminal is copied to the clipboard when you release the mouse button.',
    settings: 'Preferences',
    settingsTitle: 'Preferences',
    settingsClose: 'Close',
    settingsTerminal: 'Terminal',
    settingsFontSize: 'Font size',
    settingsFontSizeHint: 'Applies immediately to all open terminals. Shortcuts in the terminal: Ctrl + / Ctrl − / Ctrl 0, or Ctrl + mouse wheel.',
    settingsReset: 'Reset',
    fontSmaller: 'Decrease font size',
    fontLarger: 'Increase font size',
  },
};

const HELP_TEXT = {
  it: `Connection Manager - Guida rapida

GESTIONE CONNESSIONI
  Aggiungi   : premi "Aggiungi" e compila il form
  Modifica   : doppio clic su una riga
  Elimina    : seleziona e premi "Elimina"
  Connetti   : doppio clic o seleziona + "Connetti"
               (si apre in una scheda con terminale integrato)
  Esterno    : apre la connessione in un terminale di sistema
  Locale     : apre la tua shell locale in una scheda

SCHEDE TERMINALE
  Ctrl+Shift+T              : nuova shell locale
  Ctrl+Tab / Ctrl+Shift+Tab : scheda successiva / precedente
  Ctrl+Shift+W              : chiudi la scheda corrente
  Ctrl+Shift+C / Ctrl+Shift+V : copia / incolla
  Ctrl + / Ctrl - / Ctrl 0  : font del terminale più grande / più piccolo / predefinito
  Clic destro nel terminale  : menu Copia / Incolla / Incolla password /
                               Seleziona tutto / Pulisci schermo
  Clic centrale sulla scheda : chiudi
  Invio a sessione terminata : riconnetti

RICERCA
  La barra di ricerca filtra per nome, server,
  gruppo e labels in tempo reale.

VISTE
  Albero   : connessioni raggruppate in gerarchia per gruppo
  Tabella  : vista piatta con ordinamento per colonna

GRUPPI GERARCHICI
  Il campo Gruppo supporta percorsi separati da "/".
  Esempio: prod/web

IMPORTA CSV
  Colonne: name, server, port, username, group, labels

  Esempio:
  name,server,port,username,group,labels  
  frontend,192.168.10.10,22,ubuntu,dev/web,nginx frontend
  db,192.168.10.20,22,ubuntu,dev/db,postgres database
  redis,192.168.10.30,22,ubuntu,dev/cache,redis cache
  frontend,172.16.10.10,22,ubuntu,qa/web,nginx frontend
  db,172.16.10.20,22,ubuntu,qa/db,postgres database
  redis,172.16.10.30,22,ubuntu,qa/cache,redis cache
  frontend,10.100.10.10,22,ubuntu,prod/web,nginx frontend
  db,10.100.10.20,22,ubuntu,prod/db,postgres database
  redis,10.100.10.30,22,ubuntu,prod/cache,redis cache

PASSWORD SALVATE
  Il pulsante in alto a destra crea/sblocca/blocca il vault.
  Le password sono cifrate (AES-256-GCM, chiave Argon2id
  derivata dalla master password, chiesta a ogni avvio).
  Vengono inviate al terminale solo davanti al prompt
  "utente@host's password:" del server corretto, una volta.
  Clic destro > "Incolla password" la scrive nel terminale
  quando serve (es. sudo), senza premere Invio.

CAMBIO PASSWORD MASSIVO
  Cerca (es. per username e gruppo), spunta le righe o un
  gruppo, poi "Cambia password". Non modifica il server.

ARCHIVIAZIONE
  Le connessioni (e le password cifrate) sono salvate
  nel localStorage. L'export CSV non contiene password.`,
  en: `Connection Manager - Quick Guide

MANAGING CONNECTIONS
  Add      : press "Add" and fill in the form
  Edit     : double-click a row
  Delete   : select and press "Delete"
  Connect  : double-click or select + "Connect"
             (opens in a tab with an embedded terminal)
  External : opens the connection in a system terminal
  Local    : opens your local shell in a tab

TERMINAL TABS
  Ctrl+Shift+T              : new local shell
  Ctrl+Tab / Ctrl+Shift+Tab : next / previous tab
  Ctrl+Shift+W              : close current tab
  Ctrl+Shift+C / Ctrl+Shift+V : copy / paste
  Ctrl + / Ctrl - / Ctrl 0  : terminal font larger / smaller / default
  Right-click in the terminal: Copy / Paste / Paste password /
                               Select all / Clear screen menu
  Middle-click on a tab     : close
  Enter on an ended session : reconnect

SEARCH
  The search bar filters by name, server,
  group and labels in real time.

VIEWS
  Tree   : connections grouped hierarchically by group path
  Table  : flat view with sortable columns

HIERARCHICAL GROUPS
  The Group field supports slash-separated paths.
  Example: prod/web

IMPORT CSV
  Columns: name, server, port, username, group, labels

  Example:
  name,server,port,username,group,labels  
  frontend,192.168.10.10,22,ubuntu,dev/web,nginx frontend
  db,192.168.10.20,22,ubuntu,dev/db,postgres database
  redis,192.168.10.30,22,ubuntu,dev/cache,redis cache
  frontend,172.16.10.10,22,ubuntu,qa/web,nginx frontend
  db,172.16.10.20,22,ubuntu,qa/db,postgres database
  redis,172.16.10.30,22,ubuntu,qa/cache,redis cache
  frontend,10.100.10.10,22,ubuntu,prod/web,nginx frontend
  db,10.100.10.20,22,ubuntu,prod/db,postgres database
  redis,10.100.10.30,22,ubuntu,prod/cache,redis cache

SAVED PASSWORDS
  The button at the top right creates/unlocks/locks the vault.
  Passwords are encrypted (AES-256-GCM, Argon2id key derived
  from the master password, asked at every start).
  They are typed into the terminal only at the
  "user@host's password:" prompt of the right server, once.
  Right-click > "Paste password" types it into the terminal
  on demand (e.g. sudo), without pressing Enter.

BULK PASSWORD CHANGE
  Search (e.g. by username and group), tick rows or a group,
  then "Change password". It does not change the server.

STORAGE
  Connections (and encrypted passwords) are saved in
  localStorage. CSV export never contains passwords.`,
};

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? '';
    });
    // support old format (env + group) by merging into group path
    const group = obj.group
      ? (obj.env ? obj.env + '/' + obj.group : obj.group)
      : (obj.env || '');
    return {
      name: obj.name || '', server: obj.server || '',
      port: parseInt(obj.port) || 22, username: obj.username || '',
      group, labels: obj.labels || '',
    };
  }).filter(c => c.name && c.server);
}

/**
 * Build a nested tree from a flat list of connections.
 * Each connection has a group path like "prod/web".
 * Returns a recursive structure:
 *   { name, path, children: [...nodes], hosts: [...conns] }
 */
function buildTree(connections) {
  const root = { name: '', path: '', children: {}, hosts: [] };

  for (const conn of connections) {
    const parts = (conn.group || '').split('/').map(p => p.trim()).filter(Boolean);
    let node = root;
    let pathSoFar = '';
    for (const part of parts) {
      pathSoFar = pathSoFar ? pathSoFar + '/' + part : part;
      if (!node.children[part]) {
        node.children[part] = { name: part, path: pathSoFar, children: {}, hosts: [] };
      }
      node = node.children[part];
    }
    node.hosts.push(conn);
  }

  // Convert children objects to sorted arrays recursively
  function toArray(node) {
    return {
      ...node,
      children: Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name)).map(toArray),
    };
  }

  return toArray(root);
}

/*
 * Terminal instances live OUTSIDE Alpine's reactive state on purpose:
 * wrapping an xterm.js Terminal in a reactive Proxy breaks it.
 * id -> { term, fit, unsubs: [] }
 */
const TERMS = new Map();

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Error messages returned by the Go backend (see app.go) -> translation key.
// Anything not listed is shown as-is.
const BACKEND_ERRORS = {
  'invalid username or server': 'errInvalidTarget',
  'ssh command not found in PATH': 'errNoSSH',
  'no shell found': 'errNoShell',
};

const TERM_THEME = {
  background: '#0f0f0f', foreground: '#e6e6e3', cursor: '#f7f7f5',
  selectionBackground: 'rgba(255,255,255,0.25)',
};

// Clipboard used by the right-click menu: Wails' native clipboard first
// (navigator.clipboard is unreliable in some webviews), browser API as fallback.
async function clipWrite(text) {
  try {
    if (window.runtime && window.runtime.ClipboardSetText) {
      if (await window.runtime.ClipboardSetText(text)) return true;
    }
  } catch { /* fall through */ }
  try { await navigator.clipboard.writeText(text); return true; } catch { /* ignore */ }
  return false;
}

async function clipRead() {
  try {
    if (window.runtime && window.runtime.ClipboardGetText) {
      return (await window.runtime.ClipboardGetText()) || '';
    }
  } catch { /* fall through */ }
  try { return await navigator.clipboard.readText(); } catch { /* ignore */ }
  return '';
}

/* >>> context menu (single shared element) */
let TERM_MENU = null;

function hideTermMenu() {
  if (TERM_MENU) TERM_MENU.style.display = 'none';
}

/*
 * items: [{ label, hint?, disabled?, action }] or the string 'sep'.
 * Opens the menu at the given viewport position, kept inside the window.
 */
function showTermMenu(x, y, items) {
  if (!TERM_MENU) {
    TERM_MENU = document.createElement('div');
    TERM_MENU.className = 'ctx-menu';
    TERM_MENU.setAttribute('role', 'menu');
    // keep the terminal focused / selection intact while clicking the menu
    TERM_MENU.addEventListener('mousedown', (ev) => ev.preventDefault());
    TERM_MENU.addEventListener('contextmenu', (ev) => ev.preventDefault());
    document.body.appendChild(TERM_MENU);
    // dismiss: click elsewhere, Esc, wheel, resize, window blur
    window.addEventListener('mousedown', (ev) => {
      if (TERM_MENU.style.display !== 'none' && !TERM_MENU.contains(ev.target)) hideTermMenu();
    }, true);
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && TERM_MENU.style.display !== 'none') {
        ev.preventDefault();
        ev.stopPropagation();
        hideTermMenu();
      }
    }, true);
    window.addEventListener('wheel', hideTermMenu, { passive: true });
    window.addEventListener('resize', hideTermMenu);
    window.addEventListener('blur', hideTermMenu);
  }

  TERM_MENU.textContent = '';
  for (const it of items) {
    if (it === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      TERM_MENU.appendChild(sep);
      continue;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ctx-item';
    b.setAttribute('role', 'menuitem');
    b.disabled = !!it.disabled;
    const l = document.createElement('span');
    l.textContent = it.label;
    b.appendChild(l);
    if (it.hint) {
      const h = document.createElement('span');
      h.className = 'ctx-hint';
      h.textContent = it.hint;
      b.appendChild(h);
    }
    b.addEventListener('click', () => {
      hideTermMenu();
      it.action();
    });
    TERM_MENU.appendChild(b);
  }

  TERM_MENU.style.display = 'block';
  const w = TERM_MENU.offsetWidth, h = TERM_MENU.offsetHeight;
  TERM_MENU.style.left = Math.max(0, Math.min(x, window.innerWidth - w - 4)) + 'px';
  TERM_MENU.style.top = Math.max(0, Math.min(y, window.innerHeight - h - 4)) + 'px';
}
/* <<< context menu */

function ConnectionManagerApp() {
  return {
    // Initial values are resolved once by the inline script in index.html
    // (before first paint) and read back here.
    lang: document.documentElement.lang === 'it' ? 'it' : 'en',
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',

    // Preferences panel (global settings; more sections can be added later)
    showSettings: false,
    termFontSize: loadFontSize(),
    autoCopySelection: loadAutoCopy(),
    fontMin: TERM_FONT.min,
    fontMax: TERM_FONT.max,
    fontDefault: TERM_FONT.def,
    get t() {
      return TRANSLATIONS[this.lang];
    },

    setLanguage(nextLanguage) {
      if (!Object.prototype.hasOwnProperty.call(TRANSLATIONS, nextLanguage)) return;
      this.lang = nextLanguage;
      document.documentElement.lang = nextLanguage;
      try { localStorage.setItem(PREF_KEYS.language, nextLanguage); } catch (_) {}
      this.syncBackendLanguage();
    },

    // Native dialogs shown by the backend (e.g. the CSV export dialog) follow the UI language
    syncBackendLanguage() {
      window.go?.main?.App?.SetLanguage(this.lang);
    },

    toggleLang() {
      this.setLanguage(this.lang === 'it' ? 'en' : 'it');
    },

    setTheme(nextTheme) {
      if (nextTheme !== 'light' && nextTheme !== 'dark') return;
      this.theme = nextTheme;
      document.documentElement.dataset.theme = nextTheme;
      document.querySelector('meta[name="theme-color"]').content = THEME_COLORS[nextTheme];
      try { localStorage.setItem(PREF_KEYS.theme, nextTheme); } catch (_) {}
    },

    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },

    // Copy-on-select: global, read by every terminal at the moment the selection settles
    setAutoCopySelection(on) {
      this.autoCopySelection = !!on;
      try { localStorage.setItem(PREF_KEYS.autoCopy, on ? '1' : '0'); } catch (_) {}
    },

    // Global terminal font size: saved, then applied to every open terminal
    setTermFontSize(v) {
      const n = clampFontSize(v);
      this.termFontSize = n;
      try { localStorage.setItem(PREF_KEYS.fontSize, String(n)); } catch (_) {}
      for (const e of TERMS.values()) {
        e.term.options.fontSize = n;
        // a hidden tab can't be measured: it is refitted when selected (selectTab)
        try { e.fit.fit(); } catch { /* ignore */ }
      }
    },
    // Translate a backend error (a plain string coming from a rejected Wails call)
    errText(err) {
      const msg = String(err);
      return this.t[BACKEND_ERRORS[msg]] || msg;
    },

    connections: [],
    selectedConn: null,
    view: 'tree',
    searchText: '',
    sortCol: 'name',
    sortAsc: true,
    expandedNodes: {},   // keyed by node path
    allExpanded: false,

    showAddModal: false,
    showConfirmDelete: false,
    showConfirmDeleteAll: false,
    showHelp: false,

    isEditing: false,
    formErrors: {},
    form: { name: '', server: '', port: '22', username: '', group: '', labels: '' },

    toast: null,
    toastTimer: null,

    // password vault: 'none' (not created) | 'locked' | 'unlocked'
    vaultState: 'none',
    showVaultModal: false,
    vaultMode: 'create',
    vaultForm: { master: '', confirm: '' },
    vaultError: '',
    vaultBusy: false,
    vaultResetStep: 0,
    afterUnlock: null,

    // bulk selection / bulk password change
    checked: {},         // id -> true
    showBulkModal: false,
    bulkForm: { password: '', confirm: '', show: false },
    bulkError: '',
    bulkBusy: false,

    tabs: [],            // terminal sessions (plain metadata only)
    activeTab: 'home',   // 'home' or a tab id
    tabSeq: 0,

    init() {
      // lang/theme were already applied by the inline script in index.html;
      // don't persist them here, so an unset preference keeps following the system
      this.syncBackendLanguage();
      this.loadConnections();
      this.$watch('searchText', () => {
        this.selectedConn = null;
        this.checked = {};   // selection only ever applies to what is visible
      });
      this.initVault();

      // Refit the active terminal whenever the available area changes size
      const area = document.querySelector('.term-area');
      if (area && 'ResizeObserver' in window) {
        let raf = 0;
        new ResizeObserver(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => this.fitActive(false));
        }).observe(area);
      }

      // Ctrl + mouse wheel changes the terminal font size (only while a terminal tab is shown)
      let wheelAcc = 0;
      window.addEventListener('wheel', (ev) => {
        if (!ev.ctrlKey || this.tabs.length === 0 || this.activeTab === 'home') return;
        ev.preventDefault();
        ev.stopPropagation();
        hideTermMenu();
        wheelAcc += ev.deltaY;
        if (Math.abs(wheelAcc) < 50) return;   // accumulate, so trackpads don't jump
        this.setTermFontSize(this.termFontSize + (wheelAcc < 0 ? 1 : -1));
        wheelAcc = 0;
      }, { passive: false, capture: true });

      // Tab shortcuts (work from anywhere, including inside a terminal)
      window.addEventListener('keydown', (ev) => {
        if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 't') {
          ev.preventDefault();
          this.openLocalTab();
          return;
        }
        if (this.tabs.length === 0) return;
        if (this.activeTab !== 'home') {
          const step = fontShortcut(ev);
          if (step !== null) {
            ev.preventDefault();
            this.setTermFontSize(step === 0 ? TERM_FONT.def : this.termFontSize + step);
            return;
          }
        }
        const order = ['home', ...this.tabs.map(t => t.id)];
        if (ev.ctrlKey && ev.key === 'Tab') {
          ev.preventDefault();
          const i = order.indexOf(this.activeTab);
          const step = ev.shiftKey ? -1 : 1;
          this.selectTab(order[(i + step + order.length) % order.length]);
        } else if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === 'w' && this.activeTab !== 'home') {
          ev.preventDefault();
          this.closeTab(this.activeTab);
        }
      });
    },

    /*
     * Storage
     */
    loadConnections() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : [];
        // Migrate old format: if a connection has `env` field, merge into group
        this.connections = data.map(c => {
          if ('env' in c) {
            const group = c.env ? c.env + (c.group ? '/' + c.group : '') : (c.group || '');
            const { env, ...rest } = c;
            return { ...rest, group };
          }
          return c;
        });
        // give every connection a stable id (older data has none)
        let changed = false;
        this.connections = this.connections.map(c => {
          if (c.id) return c;
          changed = true;
          return { ...c, id: newId() };
        });
        if (changed) this.saveConnections();
      } catch {
        this.connections = [];
      }
    },
    saveConnections() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.connections));
    },

    /*
     * Filter
     */
    get filteredConnections() {
      const q = this.searchText.toLowerCase();
      if (!q) return this.connections;
      return this.connections.filter(c =>
        c.name.toLowerCase().includes(q) || c.server.toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) || c.labels.toLowerCase().includes(q)
      );
    },

    /*
     * Tree
     */
    get treeData() {
      return buildTree(this.filteredConnections);
    },
    toggleNode(path) {
      this.expandedNodes[path] = !this.isNodeExpanded(path);
    },
    isNodeExpanded(path) {
      // default collapsed
      return this.expandedNodes[path] === true;
    },
    getAllNodePaths(node, paths = []) {
      for (const child of node.children) {
        paths.push(child.path);
        this.getAllNodePaths(child, paths);
      }
      return paths;
    },
    toggleAll() {
      if (this.allExpanded) {
        this.expandedNodes = {};
        this.allExpanded = false;
      } else {
        const paths = this.getAllNodePaths(this.treeData);
        const next = {};
        paths.forEach(p => {
          next[p] = true;
        });
        this.expandedNodes = next;
        this.allExpanded = true;
      }
    },

    /*
     * Table sort
     */
    get sortedConnections() {
      const list = [...this.filteredConnections];
      list.sort((a, b) => {
        const av = String(a[this.sortCol] ?? '').toLowerCase();
        const bv = String(b[this.sortCol] ?? '').toLowerCase();
        return this.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      return list;
    },
    sortBy(col) {
      if (this.sortCol === col) this.sortAsc = !this.sortAsc;
      else {
        this.sortCol = col;
        this.sortAsc = true;
      }
    },
    sortIcon(col) {
      if (this.sortCol !== col) return '↕';
      return this.sortAsc ? '↑' : '↓';
    },

    /*
     * Selection
     */
    selectConn(conn) {
      this.selectedConn = conn;
    },
    isSelected(conn) {
      return !!this.selectedConn && this.selectedConn.id === conn.id;
    },
    get detailsText() {
      if (!this.selectedConn) return this.t.selectHost;
      const c = this.selectedConn;
      return `${c.name}  ·  ${c.username}@${c.server}:${c.port}  ·  ${c.group}${c.labels ? '  ·  ' + c.labels : ''}${c.passwordEnc ? '  ·  ' + this.t.passwordSaved : ''}`;
    },

    /*
     * Add / Edit
     */
    openAddModal() {
      this.isEditing = false;
      this.form = { name: '', server: '', port: '22', username: '', group: '', labels: '', password: '', removePassword: false };
      this.formErrors = {};
      this.showAddModal = true;
    },
    openEditModal(conn) {
      this.isEditing = true;
      this.form = { ...conn, port: String(conn.port), password: '', removePassword: false };
      this.formErrors = {};
      this.showAddModal = true;
    },
    closeAddModal() {
      this.showAddModal = false;
      this.form.password = '';
    },
    validateForm() {
      const errors = {};
      ['name', 'server', 'port', 'username', 'group'].forEach(f => {
        if (!this.form[f].toString().trim()) errors[f] = this.t.requiredField;
      });
      if (!errors.port && isNaN(parseInt(this.form.port))) errors.port = this.t.invalidPort;
      this.formErrors = errors;
      return Object.keys(errors).length === 0;
    },
    async saveForm() {
      if (!this.validateForm()) return;
      // saved password: keep, replace (encrypted by the backend) or remove
      let passwordEnc = this.isEditing ? (this.selectedConn.passwordEnc || '') : '';
      if (this.form.removePassword) passwordEnc = '';
      if (this.form.password) {
        try {
          passwordEnc = await window.go.main.App.EncryptSecret(this.form.password);
        } catch (err) {
          console.error('EncryptSecret error:', err);
          this.showToast(this.t.vaultLockedErr, true);
          return;
        }
      }
      const conn = {
        id: this.isEditing ? this.selectedConn.id : newId(),
        name: this.form.name.trim(), server: this.form.server.trim(),
        port: parseInt(this.form.port), username: this.form.username.trim(),
        group: this.form.group.trim(), labels: this.form.labels.trim(),
      };
      if (passwordEnc) conn.passwordEnc = passwordEnc;
      if (this.isEditing) {
        const idx = this.connections.findIndex(c => c.id === this.selectedConn.id);
        if (idx !== -1) this.connections[idx] = conn;
        this.selectedConn = conn;
      } else {
        this.connections.push(conn);
      }
      this.saveConnections();
      this.form.password = '';
      this.showAddModal = false;
    },

    /*
     * Delete All
     */
    deleteAll() {
      if (this.connections.length > 0) this.showConfirmDeleteAll = true;
    },
    confirmDeleteAll() {
      this.connections = [];
      this.saveConnections();
      this.selectedConn = null;
      this.checked = {};
      this.showConfirmDeleteAll = false;
    },

    /*
     * Delete
     */
    deleteSelected() {
      if (this.selectedConn) this.showConfirmDelete = true;
    },
    confirmDelete() {
      this.connections = this.connections.filter(c => c.id !== this.selectedConn.id);
      this.saveConnections();
      this.selectedConn = null;
      this.showConfirmDelete = false;
    },

    /*
     * Connect
     */
    // Default: open the connection in a new tab with an embedded terminal
    connectConn(conn) {
      return this.openTab(conn);
    },
    // Local shell in a new tab (no ssh involved)
    openLocalTab() {
      return this.openTab({ id: 'local', name: this.t.localTab, local: true });
    },
    // Old behaviour: spawn a system terminal window
    async connectExternal(conn) {
      try {
        await window.go.main.App.OpenSSH(conn.username, conn.server, conn.port);
      } catch (err) {
        this.showToast(this.t.connectError, true);
        console.error('OpenSSH error:', err);
      }
    },
    connectSelected() {
      if (this.selectedConn) this.connectConn(this.selectedConn);
    },
    connectExternalSelected() {
      if (this.selectedConn) this.connectExternal(this.selectedConn);
    },

    /*
     * Password vault (all crypto happens in the Go backend)
     */
    async initVault() {
      const hasVault = !!localStorage.getItem(VAULT_KEY);
      this.vaultState = hasVault ? 'locked' : 'none';
      try {
        // `wails dev` reloads the page but the backend may still be unlocked
        if (hasVault && await window.go.main.App.VaultIsUnlocked()) this.vaultState = 'unlocked';
      } catch { /* ignore */ }
      if (this.vaultState === 'locked') this.openVaultModal();
    },
    get vaultLabel() {
      return this.vaultState === 'none' ? this.t.vaultNone
        : this.vaultState === 'locked' ? this.t.vaultLocked : this.t.vaultUnlocked;
    },
    get vaultTitle() {
      return this.vaultState === 'none' ? this.t.vaultBtnNone
        : this.vaultState === 'locked' ? this.t.vaultBtnLocked : this.t.vaultBtnUnlocked;
    },
    vaultButton() {
      if (this.vaultState === 'unlocked') this.lockVault();
      else this.openVaultModal();
    },
    openVaultModal(after = null) {
      this.vaultMode = localStorage.getItem(VAULT_KEY) ? 'unlock' : 'create';
      this.vaultForm = { master: '', confirm: '' };
      this.vaultError = '';
      this.vaultResetStep = 0;
      this.afterUnlock = after;
      this.showVaultModal = true;
      this.$nextTick(() => this.$refs.vaultMaster && this.$refs.vaultMaster.focus());
    },
    closeVaultModal() {
      this.showVaultModal = false;
      this.vaultForm = { master: '', confirm: '' };
      this.afterUnlock = null;
    },
    async submitVault() {
      if (this.vaultBusy) return;
      const master = this.vaultForm.master;
      this.vaultError = '';
      const App = window.go.main.App;
      if (this.vaultMode === 'create') {
        if ([...master].length < 8) { this.vaultError = this.t.vaultTooShort; return; }
        if (master !== this.vaultForm.confirm) { this.vaultError = this.t.vaultMismatch; return; }
        this.vaultBusy = true;
        try {
          const meta = await App.VaultCreate(master);
          localStorage.setItem(VAULT_KEY, meta);
          this.vaultState = 'unlocked';
        } catch (err) {
          console.error('VaultCreate error:', err);
          this.vaultError = this.t.vaultError;
          return;
        } finally {
          this.vaultBusy = false;
        }
      } else {
        this.vaultBusy = true;
        try {
          await App.VaultUnlock(master, localStorage.getItem(VAULT_KEY) || '');
          this.vaultState = 'unlocked';
        } catch (err) {
          console.error('VaultUnlock error:', err);
          this.vaultError = this.t.vaultWrong;
          return;
        } finally {
          this.vaultBusy = false;
        }
      }
      const next = this.afterUnlock;
      this.closeVaultModal();
      if (next) next();
    },
    async lockVault() {
      try { await window.go.main.App.VaultLock(); } catch (e) { console.error(e); }
      this.vaultState = 'locked';
    },
    async resetVault() {
      // forgotten master: drop the vault and every saved password
      try { await window.go.main.App.VaultLock(); } catch { /* ignore */ }
      localStorage.removeItem(VAULT_KEY);
      this.connections = this.connections.map(c => {
        const { passwordEnc, ...rest } = c;
        return rest;
      });
      this.saveConnections();
      if (this.selectedConn) this.selectedConn = this.connections.find(c => c.id === this.selectedConn.id) || null;
      this.vaultState = 'none';
      this.closeVaultModal();
      this.showToast(this.t.vaultResetDone);
    },
    openVaultFromForm() {
      this.openVaultModal();
    },

    /*
     * Bulk selection and bulk password change
     */
    get checkedConns() {
      return this.connections.filter(c => this.checked[c.id]);
    },
    get checkedCount() {
      return this.checkedConns.length;
    },
    isChecked(c) {
      return !!this.checked[c.id];
    },
    toggleChecked(c) {
      const next = { ...this.checked };
      if (next[c.id]) delete next[c.id]; else next[c.id] = true;
      this.checked = next;
    },
    nodeHosts(node) {
      return [...node.hosts, ...node.children.flatMap(ch => this.nodeHosts(ch))];
    },
    nodeCheck(node) {
      const hosts = this.nodeHosts(node);
      const n = hosts.filter(h => this.checked[h.id]).length;
      return n === 0 ? 'none' : (n === hosts.length ? 'all' : 'some');
    },
    toggleNodeCheck(node) {
      const all = this.nodeCheck(node) === 'all';
      const next = { ...this.checked };
      this.nodeHosts(node).forEach(h => { if (all) delete next[h.id]; else next[h.id] = true; });
      this.checked = next;
    },
    get allCheck() {
      const list = this.filteredConnections;
      const n = list.filter(c => this.checked[c.id]).length;
      return n === 0 ? 'none' : (n === list.length ? 'all' : 'some');
    },
    toggleCheckAll() {
      const all = this.allCheck === 'all';
      const next = { ...this.checked };
      this.filteredConnections.forEach(c => { if (all) delete next[c.id]; else next[c.id] = true; });
      this.checked = next;
    },
    clearChecked() {
      this.checked = {};
    },
    openBulk() {
      if (this.checkedCount === 0) return;
      if (this.vaultState !== 'unlocked') {
        this.openVaultModal(() => this.openBulk());
        return;
      }
      this.bulkForm = { password: '', confirm: '', show: false };
      this.bulkError = '';
      this.showBulkModal = true;
    },
    closeBulk() {
      this.showBulkModal = false;
      this.bulkForm = { password: '', confirm: '', show: false };
    },
    get bulkSummary() {
      const list = this.checkedConns;
      const users = [...new Set(list.map(c => c.username))].sort();
      const groups = new Set(list.map(c => c.group));
      const u = users.length > 4 ? users.slice(0, 4).join(', ') + '…' : users.join(', ');
      return this.t.bulkSummary(list.length, u, groups.size);
    },
    async applyBulk() {
      if (this.bulkBusy) return;
      const pw = this.bulkForm.password;
      if (!pw) { this.bulkError = this.t.bulkEmpty; return; }
      if (pw !== this.bulkForm.confirm) { this.bulkError = this.t.bulkMismatch; return; }
      const targets = this.checkedConns;
      this.bulkBusy = true;
      try {
        // one independent ciphertext per connection
        const blobs = await window.go.main.App.EncryptMany(pw, targets.length);
        const byId = {};
        targets.forEach((c, i) => { byId[c.id] = blobs[i]; });
        this.connections = this.connections.map(c => byId[c.id] ? { ...c, passwordEnc: byId[c.id] } : c);
        this.afterBulk(this.t.bulkDone(targets.length));
      } catch (err) {
        console.error('EncryptMany error:', err);
        this.bulkError = this.t.vaultLockedErr;
      } finally {
        this.bulkBusy = false;
      }
    },
    removeBulk() {
      const ids = new Set(this.checkedConns.map(c => c.id));
      this.connections = this.connections.map(c => {
        if (!ids.has(c.id)) return c;
        const { passwordEnc, ...rest } = c;
        return rest;
      });
      this.afterBulk(this.t.bulkRemoved(ids.size));
    },
    afterBulk(msg) {
      this.saveConnections();
      if (this.selectedConn) {
        this.selectedConn = this.connections.find(c => c.id === this.selectedConn.id) || null;
      }
      this.closeBulk();
      this.checked = {};
      this.showToast(msg);
    },

    /*
     * Terminal tabs
     */
    tabById(id) {
      return this.tabs.find(t => t.id === id);
    },
    async openTab(conn) {
      const same = this.tabs.filter(t => t.connName === conn.name).length;
      const id = 't' + (++this.tabSeq) + Math.random().toString(36).slice(2, 7);
      this.tabs.push({
        id, connName: conn.name, connId: conn.id,
        label: same ? `${conn.name} (${same + 1})` : conn.name,
        title: conn.local ? 'shell' : `${conn.username}@${conn.server}:${conn.port}`,
        status: 'connecting', exitCode: null,
      });
      this.activeTab = id;
      await this.$nextTick();
      // Measure characters with the real font, not the fallback
      try { await document.fonts.ready; } catch { /* ignore */ }

      const el = document.getElementById('term-' + id);
      if (!el || !this.tabById(id)) return;   // closed in the meantime

      const term = new Terminal({
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: this.termFontSize,
        cursorBlink: true,
        scrollback: 10000,
        allowProposedApi: true,
        theme: TERM_THEME,
      });
      const fit = new FitAddon.FitAddon();
      term.loadAddon(fit);
      term.open(el);
      try { fit.fit(); } catch { /* ignore */ }

      term.attachCustomKeyEventHandler((ev) => {
        if (ev.type !== 'keydown') return true;
        if (ev.ctrlKey && ev.key === 'Tab') return false;       // tab switching
        if (fontShortcut(ev) !== null) return false;            // font size (handled globally)
        if (ev.ctrlKey && ev.shiftKey) {
          const k = ev.key.toLowerCase();
          if (k === 'w' || k === 't') return false;             // close tab / new local tab
          if (k === 'v') return false;                          // native paste event
          if (k === 'c') {                                      // copy selection
            const sel = term.getSelection();
            if (sel && navigator.clipboard) navigator.clipboard.writeText(sel).catch(() => {});
            return false;
          }
        }
        return true;
      });

      // Right-click menu: Copy / Paste / Paste saved password / Select all / Clear screen
      const copySel = () => {
        const sel = term.getSelection();
        if (sel) clipWrite(sel);
      };
      // term.paste() honours bracketed-paste mode and converts newlines
      const pasteClip = async () => {
        const text = await clipRead();
        if (text) term.paste(text);
        term.focus();
      };
      el.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const items = [
          { label: this.t.ctxCopy, hint: 'Ctrl+Shift+C', disabled: !term.hasSelection(),
            action: () => { copySel(); term.focus(); } },
          { label: this.t.ctxPaste, hint: 'Ctrl+Shift+V', action: pasteClip },
        ];
        if (!conn.local) {
          // up-to-date record: the password may have changed since the tab opened
          const cur = this.connections.find(c => c.id === conn.id) || conn;
          const noPw = !cur.passwordEnc;
          const locked = !noPw && this.vaultState !== 'unlocked';
          items.push('sep', {
            label: this.t.ctxPastePw,
            hint: noPw ? this.t.ctxPwNone : (locked ? this.t.ctxPwLocked : ''),
            disabled: noPw || locked,
            action: () => this.pasteSavedPassword(id, cur.passwordEnc),
          });
        }
        items.push(
          'sep',
          { label: this.t.ctxSelectAll, action: () => { term.selectAll(); term.focus(); } },
          // clears the on-screen buffer and scrollback, the shell is not touched
          { label: this.t.ctxClear, action: () => { term.clear(); term.focus(); } },
        );
        showTermMenu(ev.clientX, ev.clientY, items);
      });

      const App = window.go.main.App;
      const unsubs = [
        window.runtime.EventsOn('term:data:' + id, (b64) => term.write(b64ToBytes(b64))),
        window.runtime.EventsOn('term:exit:' + id, (code) => {
          const tab = this.tabById(id);
          if (!tab) return;
          tab.status = 'exited';
          tab.exitCode = code;
          term.write('\r\n\x1b[2m' + this.t.sessionEnded(code) + '\x1b[0m\r\n');
        }),
      ];
      // Copy on select (optional): copy once the selection has settled, not while dragging,
      // so the clipboard never holds half-made selections. An empty selection never
      // touches the clipboard.
      let dragging = false;
      let selTimer = null;
      const autoCopy = () => {
        clearTimeout(selTimer);
        if (!this.autoCopySelection) return;
        const sel = term.getSelection();
        if (sel) clipWrite(sel);                    // '' (e.g. double-click on blank cells) is ignored
      };
      const onMouseUp = () => {
        if (!dragging) return;
        dragging = false;
        autoCopy();
      };
      el.addEventListener('mousedown', (ev) => { if (ev.button === 0) dragging = true; });
      window.addEventListener('mouseup', onMouseUp);
      const selSub = term.onSelectionChange(() => {
        if (dragging) return;                       // mouse still down: wait for the release
        clearTimeout(selTimer);
        selTimer = setTimeout(autoCopy, 200);       // keyboard / programmatic selections
      });
      unsubs.push(() => {
        clearTimeout(selTimer);
        window.removeEventListener('mouseup', onMouseUp);
        selSub.dispose();
      });
      term.onData((d) => {
        const tab = this.tabById(id);
        if (tab && tab.status === 'exited') {
          if (d === '\r') this.startSession(id, conn, term);   // Enter = reconnect
          return;
        }
        App.WriteTerminal(id, d);
      });
      term.onResize(({ cols, rows }) => App.ResizeTerminal(id, cols, rows));

      TERMS.set(id, { term, fit, unsubs });
      term.focus();
      if (conn.passwordEnc && this.vaultState !== 'unlocked') {
        this.showToast(this.t.autofillLocked, true);
      }
      this.startSession(id, conn, term);
    },
    async startSession(id, conn, term) {
      const tab = this.tabById(id);
      if (!tab) return;
      tab.status = 'connecting';
      // use the up-to-date record (password may have changed since the tab opened)
      const cur = this.connections.find(c => c.id === conn.id) || conn;
      try {
        if (cur.local) {
          await window.go.main.App.OpenLocalTerminal(id, term.cols, term.rows);
        } else {
          await window.go.main.App.OpenTerminal(
            id, cur.username, cur.server, cur.port, term.cols, term.rows, cur.passwordEnc || '');
        }
        tab.status = 'running';
      } catch (err) {
        tab.status = 'exited';
        term.write('\r\n\x1b[31m' + this.errText(err) + '\x1b[0m\r\n');
        this.showToast(this.t.terminalError, true);
        console.error('OpenTerminal error:', err);
      }
    },
    async pasteSavedPassword(id, passwordEnc) {
      // The password is decrypted and typed by the Go backend: it never
      // reaches the frontend, and no Enter is sent.
      try {
        await window.go.main.App.PasteSavedPassword(id, passwordEnc || '');
      } catch (err) {
        this.showToast(this.t.pastePwError, true);
        console.error('PasteSavedPassword error:', err);
      }
      const e = TERMS.get(id);
      if (e) e.term.focus();
    },
    selectTab(id) {
      this.activeTab = id;
      this.$nextTick(() => this.fitActive(true));
    },
    fitActive(focus) {
      const e = TERMS.get(this.activeTab);
      if (!e) return;
      try { e.fit.fit(); } catch { /* hidden or not measurable yet */ }
      if (focus) e.term.focus();
    },
    closeTab(id) {
      const idx = this.tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      Promise.resolve(window.go.main.App.CloseTerminal(id)).catch(() => {});
      const e = TERMS.get(id);
      if (e) {
        e.unsubs.forEach(u => { try { u(); } catch { /* ignore */ } });
        e.term.dispose();
        TERMS.delete(id);
      }
      this.tabs.splice(idx, 1);
      if (this.activeTab === id) {
        const next = this.tabs[idx] || this.tabs[idx - 1];
        this.selectTab(next ? next.id : 'home');
      }
    },
    onRowDblClick(conn) {
      this.selectConn(conn);
      this.connectConn(conn);
    },

    /*
     * Import CSV
     */
    importCSV() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = parseCSV(ev.target.result);
            parsed.forEach(c => this.connections.push({ ...c, id: newId() }));
            this.saveConnections();
            this.showToast(this.t.csvImportSuccess(parsed.length));
          } catch {
            this.showToast(this.t.csvImportError, true);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    /*
     * Export CSV
     */
    async exportCSV() {
      if (this.connections.length === 0) return;
      const header = 'name,server,port,username,group,labels';
      const rows = this.connections.map(c =>
        [c.name, c.server, c.port, c.username, c.group, c.labels || ''].join(',')
      );
      const csv = [header, ...rows].join('\n');
      try {
        await window.go.main.App.SaveCSV(csv);
        this.showToast(this.t.csvExportSuccess(this.connections.length));
      } catch (err) {
        this.showToast(this.t.csvExportError, true);
        console.error('SaveCSV error:', err);
      }
    },
    showToast(msg, isError = false) {
      clearTimeout(this.toastTimer);
      this.toast = { msg, isError };
      this.toastTimer = setTimeout(() => {
        this.toast = null;
      }, 3000);
    },

    get helpText() {
      return HELP_TEXT[this.lang];
    },

    /*
     * Count all hosts recursively under a tree node
     */
    countHosts(node) {
      let count = node.hosts.length;
      for (const child of node.children) count += this.countHosts(child);
      return count;
    },
  };
}
