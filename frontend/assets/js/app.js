'use strict';

const STORAGE_KEY = 'connection-manager-connections';

const TRANSLATIONS = {
  it: {
    title: 'Connection Manager',
    search: 'Cerca per nome, server, gruppo, label…',
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
    connectError: 'Impossibile aprire il terminale.',
    thName: 'Nome', thServer: 'Server', thPort: 'Porta',
    thUsername: 'Username', thGroup: 'Gruppo', thLabels: 'Labels',
    madeWith: 'Sviluppata con',
  },
  en: {
    title: 'Connection Manager',
    search: 'Search by name, server, group, label…',
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
    connectError: 'Could not open terminal.',
    thName: 'Name', thServer: 'Server', thPort: 'Port',
    thUsername: 'Username', thGroup: 'Group', thLabels: 'Labels',
    madeWith: 'Built with',
  },
};

const HELP_TEXT = {
  it: `Connection Manager — Guida rapida

GESTIONE CONNESSIONI
  Aggiungi   : premi "Aggiungi" e compila il form
  Modifica   : doppio clic su una riga
  Elimina    : seleziona e premi "Elimina"
  Connetti   : doppio clic o seleziona + "Connetti"

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

ARCHIVIAZIONE
  Le connessioni sono salvate nel localStorage.`,
  en: `Connection Manager — Quick Guide

MANAGING CONNECTIONS
  Add      : press "Add" and fill in the form
  Edit     : double-click a row
  Delete   : select and press "Delete"
  Connect  : double-click or select + "Connect"

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

STORAGE
  Connections are saved in localStorage.`,
};

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
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

function ConnectionManagerApp() {
  return {
    lang: navigator.language.startsWith('it') ? 'it' : 'en',
    get t() { return TRANSLATIONS[this.lang]; },
    toggleLang() { this.lang = this.lang === 'it' ? 'en' : 'it'; },

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

    init() {
      this.loadConnections();
      this.$watch('searchText', () => { this.selectedConn = null; });
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
      } catch { this.connections = []; }
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
          c.name.toLowerCase().includes(q)   || c.server.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q)  || c.labels.toLowerCase().includes(q)
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
        paths.forEach(p => { next[p] = true; });
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
      else { this.sortCol = col; this.sortAsc = true; }
    },
    sortIcon(col) {
      if (this.sortCol !== col) return '↕';
      return this.sortAsc ? '↑' : '↓';
    },

    /*
     * Selection
     */
    selectConn(conn) { this.selectedConn = conn; },
    isSelected(conn) {
      return this.selectedConn &&
          this.selectedConn.name === conn.name &&
          this.selectedConn.server === conn.server;
    },
    get detailsText() {
      if (!this.selectedConn) return this.t.selectHost;
      const c = this.selectedConn;
      return `${c.name}  ·  ${c.username}@${c.server}:${c.port}  ·  ${c.group}${c.labels ? '  ·  ' + c.labels : ''}`;
    },

    /*
     * Add / Edit
     */
    openAddModal() {
      this.isEditing = false;
      this.form = { name: '', server: '', port: '22', username: '', group: '', labels: '' };
      this.formErrors = {};
      this.showAddModal = true;
    },
    openEditModal(conn) {
      this.isEditing = true;
      this.form = { ...conn, port: String(conn.port) };
      this.formErrors = {};
      this.showAddModal = true;
    },
    closeAddModal() { this.showAddModal = false; },
    validateForm() {
      const errors = {};
      ['name', 'server', 'port', 'username', 'group'].forEach(f => {
        if (!this.form[f].toString().trim()) errors[f] = this.t.requiredField;
      });
      if (!errors.port && isNaN(parseInt(this.form.port))) errors.port = this.t.invalidPort;
      this.formErrors = errors;
      return Object.keys(errors).length === 0;
    },
    saveForm() {
      if (!this.validateForm()) return;
      const conn = {
        name: this.form.name.trim(), server: this.form.server.trim(),
        port: parseInt(this.form.port), username: this.form.username.trim(),
        group: this.form.group.trim(), labels: this.form.labels.trim(),
      };
      if (this.isEditing) {
        const idx = this.connections.findIndex(
            c => c.name === this.selectedConn.name && c.server === this.selectedConn.server
        );
        if (idx !== -1) this.connections[idx] = conn;
        this.selectedConn = conn;
      } else {
        this.connections.push(conn);
      }
      this.saveConnections();
      this.showAddModal = false;
    },

    /*
     * Delete All
     */
    deleteAll() { if (this.connections.length > 0) this.showConfirmDeleteAll = true; },
    confirmDeleteAll() {
      this.connections = [];
      this.saveConnections();
      this.selectedConn = null;
      this.showConfirmDeleteAll = false;
    },

    /*
     * Delete
     */
    deleteSelected() { if (this.selectedConn) this.showConfirmDelete = true; },
    confirmDelete() {
      this.connections = this.connections.filter(
          c => !(c.name === this.selectedConn.name && c.server === this.selectedConn.server)
      );
      this.saveConnections();
      this.selectedConn = null;
      this.showConfirmDelete = false;
    },

    /*
     * Connect
     */
    async connectConn(conn) {
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
            parsed.forEach(c => this.connections.push(c));
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
        this.showToast(this.t.csvExportError ?? 'Export error.', true);
        console.error('SaveCSV error:', err);
      }
    },
    showToast(msg, isError = false) {
      clearTimeout(this.toastTimer);
      this.toast = { msg, isError };
      this.toastTimer = setTimeout(() => { this.toast = null; }, 3000);
    },

    get helpText() { return HELP_TEXT[this.lang]; },

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
