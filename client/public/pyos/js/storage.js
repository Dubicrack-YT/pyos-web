/* storage.js -- "disco" de PyOS Web: todo vive en localStorage.
   Estructura: un mapa plano ruta -> {type:"file"|"dir", content?}.
   Rutas SIN barra inicial, con "/" como separador, ej: "system/motd.txt".
   Carpetas raiz: "system" y "home". */

const PyStorage = (() => {
  const FS_KEY = "pyos_fs_v1";
  const PERMS_KEY = "pyos_permissions_v1";
  const INTEGRITY_KEY = "pyos_integrity_v1";
  const CONFIG_KEY = "pyos_config_v1";
  const PROFILES_KEY = "pyos_profiles_v2";
  const ACTIVE_PROFILE_KEY = "pyos_active_profile_v2";
  const SETTINGS_KEY = "pyos_settings_v2";

  // En algunos navegadores (sobre todo abriendo el archivo local con
  // file://, en vez de servirlo por http/https) el acceso a localStorage
  // esta bloqueado y TIRA UNA EXCEPCION con solo tocarlo. Si eso pasa, en
  // vez de dejar la pantalla en blanco, usamos un almacenamiento en
  // memoria: la app funciona igual, solo que no se acuerda de nada si
  // recargas la pagina. isPersistent() te dice cual de los dos esta activo.
  let persistent = true;
  const memoryStore = {};
  const storage = (() => {
    try {
      const testKey = "__pyos_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (e) {
      persistent = false;
      return {
        getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
        setItem: (k, v) => {
          memoryStore[k] = String(v);
        },
        removeItem: (k) => {
          delete memoryStore[k];
        },
      };
    }
  })();

  function readGlobalJSON(key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveGlobalJSON(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function normalizeName(name) {
    const clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 18);
    return clean || "Invitado";
  }

  function usernameFromName(name, existing) {
    const base = normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "invitado";
    let candidate = base.slice(0, 14);
    let suffix = 2;
    while (existing.some((profile) => profile.username === candidate)) {
      candidate = base.slice(0, 11) + "_" + suffix;
      suffix += 1;
    }
    return candidate;
  }

  function migrateLegacyData(profileId) {
    [FS_KEY, PERMS_KEY, INTEGRITY_KEY, CONFIG_KEY].forEach((key) => {
      const legacy = storage.getItem(key);
      const target = key + "__" + profileId;
      if (legacy && !storage.getItem(target)) storage.setItem(target, legacy);
    });
  }

  function getProfiles() {
    let profiles = readGlobalJSON(PROFILES_KEY, []);
    if (!Array.isArray(profiles) || !profiles.length) {
      const legacyConfig = readGlobalJSON(CONFIG_KEY, {});
      const name = normalizeName(legacyConfig.username || "Admin");
      profiles = [{ id: "admin", name, username: usernameFromName(name, []), role: "admin", created_at: new Date().toISOString() }];
      saveGlobalJSON(PROFILES_KEY, profiles);
      storage.setItem(ACTIVE_PROFILE_KEY, "admin");
      migrateLegacyData("admin");
    } else {
      let changed = false;
      profiles = profiles.map((profile, index) => {
        if (profile.role === "admin" || profile.role === "user") return profile;
        changed = true;
        return Object.assign({}, profile, { role: index === 0 ? "admin" : "user" });
      });
      if (changed) saveGlobalJSON(PROFILES_KEY, profiles);
    }
    return profiles;
  }

  function getActiveProfile() {
    const profiles = getProfiles();
    const selected = storage.getItem(ACTIVE_PROFILE_KEY);
    const active = profiles.find((profile) => profile.id === selected) || profiles[0];
    if (active.id !== selected) storage.setItem(ACTIVE_PROFILE_KEY, active.id);
    return active;
  }

  function setActiveProfile(profileId) {
    const profile = getProfiles().find((entry) => entry.id === profileId);
    if (!profile) return false;
    storage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    return true;
  }

  function isAdmin() {
    return getActiveProfile().role === "admin";
  }

  function createProfile(name, role) {
    const profiles = getProfiles();
    if (profiles.length >= 6) return { ok: false, error: "Limite de 6 perfiles locales" };
    const displayName = normalizeName(name);
    const username = usernameFromName(displayName, profiles);
    const profile = { id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: displayName, username, role: role === "admin" ? "admin" : "user", created_at: new Date().toISOString() };
    profiles.push(profile);
    saveGlobalJSON(PROFILES_KEY, profiles);
    return { ok: true, profile };
  }

  function updateProfile(profileId, changes) {
    const profiles = getProfiles();
    const index = profiles.findIndex((profile) => profile.id === profileId);
    if (index === -1) return { ok: false, error: "Perfil no encontrado" };
    const current = profiles[index];
    const next = Object.assign({}, current);
    if (typeof changes.name === "string") next.name = normalizeName(changes.name);
    if (changes.role === "admin" || changes.role === "user") {
      const admins = profiles.filter((profile) => profile.role === "admin");
      if (current.role === "admin" && changes.role === "user" && admins.length === 1) return { ok: false, error: "PyOS necesita al menos una cuenta administradora" };
      next.role = changes.role;
    }
    profiles[index] = next;
    saveGlobalJSON(PROFILES_KEY, profiles);
    return { ok: true, profile: next };
  }

  function deleteProfile(profileId) {
    const profiles = getProfiles();
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) return { ok: false, error: "Perfil no encontrado" };
    if (profiles.length === 1) return { ok: false, error: "No se puede eliminar la única cuenta de PyOS" };
    const admins = profiles.filter((entry) => entry.role === "admin");
    if (profile.role === "admin" && admins.length === 1) return { ok: false, error: "No se puede eliminar la última cuenta administradora" };
    const retained = profiles.filter((entry) => entry.id !== profileId);
    saveGlobalJSON(PROFILES_KEY, retained);
    [FS_KEY, PERMS_KEY, INTEGRITY_KEY, CONFIG_KEY, SETTINGS_KEY].forEach((key) => storage.removeItem(key + "__" + profileId));
    if (storage.getItem(ACTIVE_PROFILE_KEY) === profileId) storage.setItem(ACTIVE_PROFILE_KEY, retained[0].id);
    return { ok: true };
  }

  function profileKey(key) {
    return key + "__" + getActiveProfile().id;
  }

  function getPreference(key, fallback) {
    const all = readGlobalJSON(profileKey(SETTINGS_KEY), {});
    return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : fallback;
  }

  function setPreference(key, value) {
    const all = readGlobalJSON(profileKey(SETTINGS_KEY), {});
    all[key] = value;
    saveGlobalJSON(profileKey(SETTINGS_KEY), all);
  }

  function defaultRootManager() {
    return { installed: false, version: "0.0", channel: "stable", grants: {}, installed_at: null };
  }

  function getRootManager() {
    const current = getPreference("root_manager", null);
    return current && typeof current === "object" ? Object.assign(defaultRootManager(), current) : defaultRootManager();
  }

  function setRootManager(state) {
    setPreference("root_manager", Object.assign(defaultRootManager(), state || {}));
  }

  function defaultServices() {
    return {
      shell: { enabled: true, label: "Shell de PyOS", detail: "Terminal y comandos locales" },
      store: { enabled: true, label: "Catálogo PyStore", detail: "Instalaciones por perfil" },
      telemetry: { enabled: true, label: "Telemetría Device Info", detail: "Métricas de hardware simulado" },
    };
  }

  function getServices() {
    const saved = getPreference("root_services", null);
    const defaults = defaultServices();
    if (!saved || typeof saved !== "object") return defaults;
    Object.keys(defaults).forEach((id) => {
      if (typeof saved[id] === "boolean") saved[id] = Object.assign({}, defaults[id], { enabled: saved[id] });
      else saved[id] = Object.assign({}, defaults[id], saved[id] || {});
    });
    return saved;
  }

  function setServices(services) {
    setPreference("root_services", services);
  }

  function getSystemEvents() {
    const events = getPreference("system_events", []);
    return Array.isArray(events) ? events : [];
  }

  function logSystemEvent(type, message, meta) {
    const events = getSystemEvents();
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: new Date().toISOString(), type: String(type || "system"), message: String(message || "Evento del sistema"), meta: meta || {} };
    events.unshift(entry);
    setPreference("system_events", events.slice(0, 120));
    const fs = loadFS();
    if (fs) {
      const line = "[" + entry.at.slice(11, 19) + "] [" + entry.type.toUpperCase() + "] " + entry.message + "\n";
      const path = "system/logs/activity.log";
      fs[path] = { type: "file", content: (fs[path] && fs[path].content ? fs[path].content : "") + line };
      saveFS(fs);
    }
    return entry;
  }

  const DEFAULT_ROOT_PASSWORD = "toor";

  const PROTECTED_PATHS = new Set([
    "system/config.json",
    "system/permissions.json",
  ]);

  const CRITICAL_BOOT_FILES = {
    "system/motd.txt": "system/motd.txt",
    "system/hosts.txt": "system/hosts.txt",
    "system/kernel.sys": "system/kernel.sys",
    "system/boot.cfg": "system/boot.cfg",
    "system/drivers/video.drv": "system/drivers/video.drv",
    "system/drivers/input.drv": "system/drivers/input.drv",
  };

  const HOME = "home";
  const TRASH = "home/.papelera";

  function hash(str) {
    // Hash simple (no criptografico, es un juguete) solo para no guardar
    // la clave de root en texto plano.
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return "h" + (h >>> 0).toString(16);
  }

  function loadFS() {
    try {
      const raw = storage.getItem(profileKey(FS_KEY));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveFS(fs) {
    storage.setItem(profileKey(FS_KEY), JSON.stringify(fs));
  }

  function loadJSONKey(key, fallback) {
    try {
      const raw = storage.getItem(profileKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSONKey(key, value) {
    storage.setItem(profileKey(key), JSON.stringify(value));
  }

  function dirname(path) {
    const i = path.lastIndexOf("/");
    return i === -1 ? "" : path.slice(0, i);
  }

  function basename(path) {
    const i = path.lastIndexOf("/");
    return i === -1 ? path : path.slice(i + 1);
  }

  function joinPath(a, b) {
    if (!a) return b;
    if (!b) return a;
    return a.replace(/\/+$/, "") + "/" + b.replace(/^\/+/, "");
  }

  function isInstalled() {
    return loadFS() !== null;
  }

  function defaultConfig() {
    return {
      version: "1.5.0",
      username: getActiveProfile().username,
      display_name: getActiveProfile().name,
      installed_at: new Date().toISOString(),
      root_password_hash: hash(DEFAULT_ROOT_PASSWORD),
      device_profile: {
        cpu: "AMD Ryzen 7 7800X3D",
        gpu: "NVIDIA GeForce RTX 4070 SUPER",
        memory_gb: 32,
        storage_gb: 1024,
      },
    };
  }

  function bootstrap() {
    let fs = loadFS();
    const firstRun = fs === null;
    if (!fs) fs = {};

    const ensureDir = (p) => {
      if (!fs[p]) fs[p] = { type: "dir" };
    };
    const ensureFile = (p, content) => {
      if (!fs[p]) fs[p] = { type: "file", content };
    };

    ensureDir("system");
    ensureDir("system/drivers");
    ensureDir("system/services");
    ensureDir("system/logs");
    ensureDir("system/packages");
    ensureDir("system/config");
    ensureDir(HOME);
    ensureDir(HOME + "/Escritorio");
    ensureDir(HOME + "/Documentos");
    ensureDir(HOME + "/Descargas");
    ensureDir(TRASH);

    ensureFile(
      HOME + "/Documentos/leeme.txt",
      "Bienvenido a PyOS Web.\n\n" +
        "Esta es tu carpeta personal simulada, guardada en el almacenamiento\n" +
        "de tu navegador (localStorage) -- no toca ningun archivo real de tu\n" +
        "telefono o computadora.\n\n" +
        "Sos un usuario normal: no podes tocar el sistema. Para eso abri la\n" +
        "Terminal y escribi 'su' (clave por defecto: " + DEFAULT_ROOT_PASSWORD + ").\n"
    );
    ensureFile(
      "system/motd.txt",
      "PyOS Web -- mensaje del dia\n" +
        "----------------------------\n" +
        "Este archivo vive en system/motd.txt. Como usuario normal no lo\n" +
        "podes tocar. Con 'su' en la Terminal si.\n"
    );
    ensureFile(
      "system/hosts.txt",
      "# Archivo de sistema de ejemplo (no hace nada real).\n" +
        "127.0.0.1   localhost\n127.0.0.1   pyos.local\n"
    );
    ensureFile(
      "system/kernel.sys",
      "PYOS-WEB-KERNEL-SIMULADO\n" +
        "Representa el 'nucleo' de PyOS (no hace nada real). Si lo borras\n" +
        "-- incluso como root -- el proximo arranque te va a recibir con un\n" +
        "pantallazo azul y una opcion para repararlo.\n"
    );
    ensureFile(
      "system/boot.cfg",
      "[boot]\nmodo=normal\nusuario_por_defecto=admin\n"
    );
    ensureFile("system/drivers/video.drv", "driver de video simulado\n");
    ensureFile("system/drivers/input.drv", "driver de teclado/mouse simulado\n");
    ensureFile("system/release.txt", "PyOS Web 1.3\nCanal: estable\nArquitectura: navegador-simulado\n");
    ensureFile("system/logs/boot.log", "[boot] perfil local cargado\n[boot] servicios preparados\n[boot] interfaz disponible\n");
    ensureFile("system/logs/activity.log", "[system] historial de actividad de PyOS\n");
    ensureFile("system/services/shell.svc", "servicio=shell\nestado=activo\ninterfaz=desktop,touch,console\n");
    ensureFile("system/services/store.svc", "servicio=pystore\nestado=activo\nmodo=catalogo_local\n");
    ensureFile("system/config/ui.cfg", "[ui]\ntema=graphite\nidioma=es\nanimaciones=moderadas\n");
    ensureFile("system/packages/core.pkg", "paquete=pyos-core\nversion=1.3\nproteccion=critica\n");

    saveFS(fs);

    if (!storage.getItem(profileKey(CONFIG_KEY))) {
      saveJSONKey(CONFIG_KEY, defaultConfig());
    } else {
      const cfg = getConfig();
      if (!cfg.device_profile) cfg.device_profile = defaultConfig().device_profile;
      if (cfg.version !== "1.5.0") {
        cfg.version = "1.5.0";
        setConfig(cfg);
      }
    }
    if (!storage.getItem(profileKey(PERMS_KEY))) {
      saveJSONKey(PERMS_KEY, {});
    }

    recordIntegrity();
    return { firstRun };
  }

  function recordIntegrity() {
    const fs = loadFS() || {};
    const present = Object.keys(CRITICAL_BOOT_FILES).filter((p) => !!fs[p]);
    saveJSONKey(INTEGRITY_KEY, { known_good: present, updated_at: new Date().toISOString() });
  }

  function checkIntegrity() {
    const fs = loadFS() || {};
    const registry = loadJSONKey(INTEGRITY_KEY, { known_good: [] });
    const known = new Set(registry.known_good || []);
    const problems = [];
    for (const p of Object.keys(CRITICAL_BOOT_FILES)) {
      if (known.has(p) && !fs[p]) problems.push(p);
    }
    return problems;
  }

  function getConfig() {
    return loadJSONKey(CONFIG_KEY, defaultConfig());
  }

  function setConfig(cfg) {
    saveJSONKey(CONFIG_KEY, cfg);
  }

  function verifyRootPassword(pw) {
    const cfg = getConfig();
    return hash(pw || "") === cfg.root_password_hash;
  }

  function setRootPassword(pw) {
    const cfg = getConfig();
    cfg.root_password_hash = hash(pw || "");
    setConfig(cfg);
  }

  // ---- Permisos por app -------------------------------------------
  function getPermissions() {
    return loadJSONKey(PERMS_KEY, {});
  }
  function permDecided(appId, perm) {
    const p = getPermissions()[appId];
    if (!p) return false;
    return (p.granted && p.granted.indexOf(perm) !== -1) || (p.denied && p.denied.indexOf(perm) !== -1);
  }
  function permGranted(appId, perm) {
    const p = getPermissions()[appId];
    return !!p && !!p.granted && p.granted.indexOf(perm) !== -1;
  }
  function setPermission(appId, perm, granted) {
    const all = getPermissions();
    const entry = all[appId] || { granted: [], denied: [] };
    entry.granted = (entry.granted || []).filter((p) => p !== perm);
    entry.denied = (entry.denied || []).filter((p) => p !== perm);
    (granted ? entry.granted : entry.denied).push(perm);
    all[appId] = entry;
    saveJSONKey(PERMS_KEY, all);
  }

  // ---- Operaciones de archivos, encerradas en "home" ---------------
  function resolveHome(relPath) {
    relPath = (relPath || "").replace(/^\/+/, "").replace(/\/+$/, "");
    const full = relPath ? joinPath(HOME, relPath) : HOME;
    if (full !== HOME && !full.startsWith(HOME + "/")) return null; // fuera de la jaula
    return full;
  }

  function list(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    if (full === null) return null;
    if (!fs[full] || fs[full].type !== "dir") return [];
    const prefix = full + "/";
    const out = [];
    for (const key of Object.keys(fs)) {
      if (key.startsWith(prefix) && !key.slice(prefix.length).includes("/")) {
        out.push([basename(key), fs[key].type === "dir"]);
      }
    }
    out.sort((a, b) => a[0].localeCompare(b[0]));
    return out;
  }

  function isDir(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    return !!full && fs[full] && fs[full].type === "dir";
  }

  function exists(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    return !!full && !!fs[full];
  }

  function readFile(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    if (!full || !fs[full] || fs[full].type !== "file") return null;
    return fs[full].content;
  }

  function writeFile(path, content) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    if (!full) return false;
    fs[full] = { type: "file", content: content == null ? "" : content };
    saveFS(fs);
    return true;
  }

  function mkdir(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    if (!full) return false;
    if (!fs[full]) fs[full] = { type: "dir" };
    saveFS(fs);
    return true;
  }

  function deleteRecursive(fs, full) {
    delete fs[full];
    const prefix = full + "/";
    for (const key of Object.keys(fs)) {
      if (key.startsWith(prefix)) delete fs[key];
    }
  }

  function moveRecursive(fs, src, dest) {
    const node = fs[src];
    if (!node) return;
    delete fs[src];
    fs[dest] = node;
    const prefix = src + "/";
    for (const key of Object.keys(fs)) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        fs[dest + "/" + rest] = fs[key];
        delete fs[key];
      }
    }
  }

  function deleteToTrash(path) {
    const fs = loadFS() || {};
    const full = resolveHome(path);
    if (!full || full === HOME || !fs[full]) return false;
    if (full.startsWith(TRASH)) return false; // ya esta en la papelera
    let name = basename(full);
    let dest = TRASH + "/" + name;
    let n = 1;
    while (fs[dest]) {
      dest = TRASH + "/" + name + " (" + n + ")";
      n += 1;
    }
    if (!fs[TRASH]) fs[TRASH] = { type: "dir" };
    moveRecursive(fs, full, dest);
    saveFS(fs);
    return true;
  }

  function listTrash() {
    return list(".papelera") || [];
  }

  function restoreFromTrash(name) {
    const fs = loadFS() || {};
    const src = TRASH + "/" + name;
    const dest = HOME + "/" + name;
    if (!fs[src] || fs[dest]) return false;
    moveRecursive(fs, src, dest);
    saveFS(fs);
    return true;
  }

  function purgeTrash(name) {
    const fs = loadFS() || {};
    if (name === null || name === undefined) {
      deleteRecursive(fs, TRASH);
      fs[TRASH] = { type: "dir" };
    } else {
      deleteRecursive(fs, TRASH + "/" + name);
    }
    saveFS(fs);
    return true;
  }

  // ---- Acceso root: todo el disco (system + home), sin jaula -------
  function rootProtectedHit(full) {
    if (PROTECTED_PATHS.has(full)) return full;
    for (const p of PROTECTED_PATHS) {
      if (full.startsWith(p + "/")) return p;
    }
    return null;
  }

  function rootList(path) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "").replace(/\/+$/, "");
    if (full && (!fs[full] || fs[full].type !== "dir")) return [];
    const prefix = full ? full + "/" : "";
    const seen = new Set();
    const out = [];
    for (const key of Object.keys(fs)) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      const top = rest.split("/")[0];
      if (seen.has(top)) continue;
      seen.add(top);
      const topPath = prefix + top;
      out.push([top, fs[topPath] && fs[topPath].type === "dir"]);
    }
    out.sort((a, b) => a[0].localeCompare(b[0]));
    return out;
  }

  function rootIsDir(path) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "");
    return !full || (fs[full] && fs[full].type === "dir");
  }

  function rootReadFile(path) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "");
    if (!fs[full] || fs[full].type !== "file") return null;
    return fs[full].content;
  }

  function rootWriteFile(path, content) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "");
    if (rootProtectedHit(full)) return { ok: false, error: "Protegido incluso para root: " + full };
    fs[full] = { type: "file", content: content == null ? "" : content };
    saveFS(fs);
    return { ok: true };
  }

  function rootMkdir(path) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "");
    if (!fs[full]) fs[full] = { type: "dir" };
    saveFS(fs);
    return { ok: true };
  }

  function rootDelete(path) {
    const fs = loadFS() || {};
    const full = (path || "").replace(/^\/+/, "");
    if (!full) return { ok: false, error: "No se puede borrar la raiz del sistema" };
    const hit = rootProtectedHit(full);
    if (hit) return { ok: false, error: "Protegido incluso para root: " + hit };
    if (!fs[full]) return { ok: false, error: "No existe: " + full };
    deleteRecursive(fs, full);
    saveFS(fs);
    return { ok: true };
  }

  // ---- Utilidades de escaneo (para virus / monitor) -----------------
  function walkHome() {
    const fs = loadFS() || {};
    const prefix = HOME + "/";
    return Object.keys(fs)
      .filter((k) => k.startsWith(prefix) && fs[k].type === "file")
      .filter((k) => !k.slice(prefix.length).split("/").some((seg) => seg.startsWith(".")))
      .map((k) => ({ path: k.slice(HOME.length + 1), content: fs[k].content }));
  }

  function homeFileCount() {
    const fs = loadFS() || {};
    const prefix = HOME + "/";
    return Object.keys(fs).filter((k) => k.startsWith(prefix) && fs[k].type === "file").length;
  }

  function estimateBytes() {
    const raw = storage.getItem(profileKey(FS_KEY)) || "";
    return new Blob([raw]).size;
  }

  return {
    DEFAULT_ROOT_PASSWORD,
    isInstalled,
    isPersistent: () => persistent,
    safeStorage: storage,
    getProfiles,
    getActiveProfile,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    isAdmin,
    getPreference,
    setPreference,
    getRootManager,
    setRootManager,
    getServices,
    setServices,
    getSystemEvents,
    logSystemEvent,
    bootstrap,
    checkIntegrity,
    recordIntegrity,
    getConfig,
    setConfig,
    verifyRootPassword,
    setRootPassword,
    getPermissions,
    permDecided,
    permGranted,
    setPermission,
    list,
    isDir,
    exists,
    readFile,
    writeFile,
    mkdir,
    deleteToTrash,
    listTrash,
    restoreFromTrash,
    purgeTrash,
    rootList,
    rootIsDir,
    rootReadFile,
    rootWriteFile,
    rootMkdir,
    rootDelete,
    walkHome,
    homeFileCount,
    estimateBytes,
    joinPath,
    dirname,
    basename,
  };
})();
