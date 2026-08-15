/* os.js -- el "kernel" de PyOS Web: arranque, eleccion de modo,
   gestor de ventanas (escritorio y tactil), root, modales, virus. */

(() => {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  let sessionRoot = false;
  let mode = "desktop"; // "desktop" | "touch" | "console"
  let switchProfileFn = null;
  let switchModeFn = null;

  // -----------------------------------------------------------------
  // Utilidades chicas
  // -----------------------------------------------------------------
  function clearRoot() {
    rootEl.innerHTML = "";
  }

  function screen(name) {
    clearRoot();
    const s = el("div", { class: "screen screen-" + name });
    rootEl.appendChild(s);
    return s;
  }

  // -----------------------------------------------------------------
  // Paso 1: chequeo de integridad -> BSOD si hace falta
  // -----------------------------------------------------------------
  function showBSOD(problems, onRepair) {
    const s = screen("bsod");
    s.appendChild(
      el("div", { class: "bsod-box" }, [
        el("div", { class: "bsod-face", text: ":(" }),
        el("h1", { text: "A tu PyOS le falta algo y no puede arrancar bien." }),
        el("p", { text: "Se detectaron archivos criticos del sistema faltantes:" }),
        el(
          "ul",
          {},
          problems.map((p) => el("li", { text: p }))
        ),
        el("p", { class: "bsod-code", text: "Codigo de detencion: PYOS_SYSTEM_FILE_MISSING" }),
        el("button", {
          class: "bsod-btn",
          text: "Reparar sistema (modo recuperacion)",
          onclick: onRepair,
        }),
      ])
    );
  }

  // -----------------------------------------------------------------
  // Paso 2: elegir modo (tactil / escritorio) antes de arrancar
  // -----------------------------------------------------------------
  // Perfiles locales: sus datos se aislan en localStorage por cuenta.
  function showProfileChooser(onChosen) {
    const s = screen("profiles");
    const profiles = PyStorage.getProfiles();
    const profileGrid = el("div", { class: "profile-grid" });
    const createInput = el("input", { class: "profile-input", type: "text", maxlength: "18", placeholder: "Nombre de nuevo perfil", autocomplete: "off" });
    const createBtn = el("button", { class: "profile-create", text: "+ Crear cuenta local" });
    profiles.forEach((profile, index) => {
      const card = el("button", { class: "profile-card" }, [
        el("span", { class: "profile-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
        el("span", { class: "profile-name", text: profile.name }),
        el("span", { class: "profile-meta", text: index === 0 ? "Perfil principal" : "Cuenta local" }),
      ]);
      card.onclick = () => { PyStorage.setActiveProfile(profile.id); onChosen(profile); };
      profileGrid.appendChild(card);
    });
    createBtn.onclick = () => {
      const result = PyStorage.createProfile(createInput.value);
      if (!result.ok) { createInput.focus(); return; }
      PyStorage.setActiveProfile(result.profile.id);
      onChosen(result.profile);
    };
    createInput.addEventListener("keydown", (event) => { if (event.key === "Enter") createBtn.click(); });
    s.appendChild(el("div", { class: "profile-chooser" }, [
      el("div", { class: "profile-kicker", text: "PYOS / CUENTAS LOCALES" }),
      el("h1", { text: "¿Quién inicia PyOS?" }),
      el("p", { class: "muted", text: "Cada perfil conserva sus propios archivos, permisos y preferencias en este navegador." }),
      profileGrid,
      el("div", { class: "profile-create-row" }, [createInput, createBtn]),
      el("p", { class: "profile-footnote", text: "Las cuentas son parte de la simulación; no son inicios de sesión reales." }),
    ]));
  }

  function showModeChooser(onChosen) {
    const s = screen("chooser");
    let remember = false;
    const rememberBox = el("input", { type: "checkbox", id: "remember-mode" });
    rememberBox.addEventListener("change", () => (remember = rememberBox.checked));

    s.appendChild(
      el("div", { class: "chooser-box" }, [
        el("h1", { text: "PyOS Web" }),
        el("p", { class: "muted", text: "Elegí una experiencia para tu pantalla y controles:" }),
        el("div", { class: "chooser-options" }, [
          el("button", { class: "chooser-card" }, [
            el("div", { class: "chooser-icon", text: "\u{1F5A5}\uFE0F" }),
            el("div", { class: "chooser-title", text: "Experiencia de escritorio" }),
            el("div", { class: "chooser-desc", text: "Ventanas que podes arrastrar, redimensionar y superponer. Pensada para mouse y teclado." }),
          ]).also((btn) => (btn.onclick = () => finish("desktop"))),
          el("button", { class: "chooser-card" }, [
            el("div", { class: "chooser-icon", text: "\u{1F4F1}" }),
            el("div", { class: "chooser-title", text: "Experiencia tactil" }),
            el("div", { class: "chooser-desc", text: "Una app a pantalla completa por vez, con boton de volver. Pensada para tocar con el dedo." }),
          ]).also((btn) => (btn.onclick = () => finish("touch"))),
          el("button", { class: "chooser-card chooser-console" }, [
            el("div", { class: "chooser-icon", text: "◈" }),
            el("div", { class: "chooser-title", text: "Experiencia Consola" }),
            el("div", { class: "chooser-desc", text: "Panel grande para TV, teclado o control. También puedes probarlo ahora desde PC o móvil." }),
          ]).also((btn) => (btn.onclick = () => finish("console"))),
        ]),
        el("label", { class: "remember-row" }, [rememberBox, document.createTextNode(" Recordar mi eleccion y no preguntar de nuevo")]),
      ])
    );

    function finish(chosen) {
      if (remember) PyStorage.setPreference("ui_mode", chosen);
      onChosen(chosen);
    }
  }

  // Pequena ayuda para poder encadenar .also() al crear nodos arriba.
  HTMLElement.prototype.also = function (fn) {
    fn(this);
    return this;
  };

  // -----------------------------------------------------------------
  // Paso 3: splash
  // -----------------------------------------------------------------
  function showSplash(onDone) {
    const s = screen("splash");
    const msg = el("div", { class: "splash-msg", text: "Iniciando..." });
    const barBg = el("div", { class: "splash-bar-bg" });
    const bar = el("div", { class: "splash-bar" });
    barBg.appendChild(bar);
    s.appendChild(
      el("div", { class: "splash-box" }, [el("div", { class: "splash-logo", text: "PyOS" }), msg, barBg])
    );

    const steps = [
      ["Cargando perfil local...", 18],
      ["Montando sistema de archivos...", 40],
      ["Verificando permisos...", 68],
      ["Preparando entorno " + (mode === "console" ? "Consola" : mode === "touch" ? "Táctil" : "Escritorio") + "...", 100],
    ];
    let i = 0;
    function advance() {
      if (i >= steps.length) {
        onDone();
        return;
      }
      const [text, pct] = steps[i];
      msg.textContent = text;
      bar.style.width = pct + "%";
      i += 1;
      setTimeout(advance, 260);
    }
    setTimeout(advance, 150);
  }

  // -----------------------------------------------------------------
  // API compartida entre apps (independiente del modo)
  // -----------------------------------------------------------------
  let openAppFn = null; // se define mas abajo, segun el modo
  let refreshShellFn = null;

  function buildApi(appId, args, hooks) {
    const fsApi = (appId, permCheck) => ({
      list: (p) => (permCheck("fs_read") ? PyStorage.list(p) : null),
      read: (p) => (permCheck("fs_read") ? PyStorage.readFile(p) : null),
      write: (p, c) => (permCheck("fs_write") ? PyStorage.writeFile(p, c) : false),
      mkdir: (p) => (permCheck("fs_write") ? PyStorage.mkdir(p) : false),
      delete: (p) => (permCheck("fs_delete") ? PyStorage.deleteToTrash(p) : false),
      isDir: (p) => PyStorage.isDir(p),
      listTrash: () => (permCheck("fs_read") ? PyStorage.listTrash() : []),
      restoreFromTrash: (n) => (permCheck("fs_write") ? PyStorage.restoreFromTrash(n) : false),
      purgeTrash: (n) => (permCheck("fs_delete") ? PyStorage.purgeTrash(n) : false),
      walkHome: () => (permCheck("fs_read") ? PyStorage.walkHome() : []),
    });

    const permCheck = (perm) => {
      if (PyStorage.permGranted(appId, perm)) return true;
      toast("Permiso denegado: " + (PyApps.PERMISSION_LABELS[perm] || perm));
      return false;
    };

    const rootFsApi = {
      list: (p) => PyStorage.rootList(p),
      read: (p) => PyStorage.rootReadFile(p),
      write: (p, c) => { const result = PyStorage.rootWriteFile(p, c); if (result.ok) PyStorage.logSystemEvent("rootfs", "Archivo de sistema escrito: /" + p); return result; },
      mkdir: (p) => { const result = PyStorage.rootMkdir(p); if (result.ok) PyStorage.logSystemEvent("rootfs", "Carpeta de sistema creada: /" + p); return result; },
      delete: (p) => { const result = PyStorage.rootDelete(p); if (result.ok) PyStorage.logSystemEvent("rootfs", "Archivo de sistema eliminado: /" + p); return result; },
      isDir: (p) => PyStorage.rootIsDir(p),
    };

    return {
      args: args || {},
      fs: fsApi(appId, permCheck),
      rootFs: rootFsApi,
      username: () => PyStorage.getConfig().username || "admin",
      profile: () => PyStorage.getActiveProfile(),
      profiles: () => PyStorage.getProfiles(),
      isAdmin: () => PyStorage.isAdmin(),
      switchProfile: () => switchProfileFn && switchProfileFn(),
      switchMode: () => switchModeFn && switchModeFn(),
      createProfile: (name, role) => PyStorage.createProfile(name, role),
      updateProfile: (profileId, changes) => PyStorage.updateProfile(profileId, changes),
      deleteProfile: (profileId) => PyStorage.deleteProfile(profileId),
      getPreference: (key, fallback) => PyStorage.getPreference(key, fallback),
      setPreference: (key, value) => PyStorage.setPreference(key, value),
      refreshApps: () => refreshShellFn && refreshShellFn(),
      currentMode: () => mode,
      systemVersion: () => PyStorage.getConfig().version || "1.0.0",
      deviceProfile: () => PyStorage.getConfig().device_profile || {},
      rootManager: () => PyStorage.getRootManager(),
      updateRootManager: (state) => PyStorage.setRootManager(state),
      services: () => PyStorage.getServices(),
      setServices: (services) => PyStorage.setServices(services),
      systemEvents: () => PyStorage.getSystemEvents(),
      logSystemEvent: (type, message, meta) => PyStorage.logSystemEvent(type, message, meta),
      toast,
      askString,
      confirm,
      isRoot: () => sessionRoot,
      elevate: (cb) => elevate(cb, appId),
      logoutRoot: () => {
        sessionRoot = false;
        PyStorage.logSystemEvent("root", "Sesión root cerrada por " + PyStorage.getActiveProfile().username);
        hooks.onRootChange && hooks.onRootChange();
      },
      changeRootPassword: (pw) => {
        if (!sessionRoot) {
          toast("Se requiere ser root para cambiar la clave");
          return;
        }
        PyStorage.setRootPassword(pw);
      },
      listApps: () => PyApps.ALL.map((a) => ({ id: a.id, name: a.name, icon: a.icon, permissions: a.permissions, description: a.description })),
      permissionGranted: (id, perm) => PyStorage.permGranted(id, perm),
      setPermission: (id, perm, granted) => {
        if (!PyStorage.isAdmin()) {
          toast("Solo una cuenta administradora puede modificar permisos.");
          return false;
        }
        PyStorage.setPermission(id, perm, granted);
        return true;
      },
      openApp: (id, args2) => openAppFn && openAppFn(id, args2),
      log: (msg) => { console.log("[PyOS][" + appId + "] " + msg); PyStorage.logSystemEvent("app", appId + ": " + msg); },
      systemStats: () => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform || mode,
        username: PyStorage.getConfig().username || "admin",
        profileName: PyStorage.getActiveProfile().name,
        mode,
        pyosVersion: PyStorage.getConfig().version || "1.0.0",
        appCount: PyApps.ALL.length,
        openWindows: hooks.countOpen ? hooks.countOpen() : 0,
        homeFileCount: PyStorage.homeFileCount(),
        diskUsage: formatBytes(PyStorage.estimateBytes()),
        installedAt: (PyStorage.getConfig().installed_at || "").slice(0, 19).replace("T", " "),
      }),
      onActivate: (cb) => hooks.onActivate && hooks.onActivate(cb),
      onDestroy: (cb) => hooks.onDestroy && hooks.onDestroy(cb),
    };
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  // -----------------------------------------------------------------
  // Modales genericos (toast, askString, confirm, elevate, permisos)
  // -----------------------------------------------------------------
  let modalDepth = 0;
  let toastTimer = null;
  let toastEl = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  function openModal(title, bodyBuilder) {
    modalDepth += 1;
    const overlay = el("div", { class: "modal-overlay" });
    const panel = el("div", { class: "modal-panel" });
    const bar = el("div", { class: "modal-bar" }, [el("span", { text: title })]);
    const body = el("div", { class: "modal-body" });
    panel.append(bar, body);
    overlay.appendChild(panel);
    document.getElementById("modal-layer").appendChild(overlay);

    function close() {
      modalDepth = Math.max(0, modalDepth - 1);
      overlay.remove();
    }
    bodyBuilder(body, close);
    return overlay;
  }

  function askString(title, prompt, cb, initial = "") {
    openModal(title, (body, close) => {
      body.appendChild(el("p", { text: prompt }));
      const input = el("input", { type: "text", value: initial, class: "modal-input" });
      body.appendChild(input);
      const btns = el("div", { class: "row modal-btns" });
      const ok = el("button", { text: "Aceptar" });
      const cancel = el("button", { class: "ghost", text: "Cancelar" });
      btns.append(cancel, ok);
      body.appendChild(btns);
      const submit = () => {
        close();
        cb(input.value);
      };
      ok.onclick = submit;
      cancel.onclick = () => {
        close();
        cb(null);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });
      setTimeout(() => input.focus(), 30);
    });
  }

  function confirm(title, msg, cb) {
    openModal(title, (body, close) => {
      body.appendChild(el("p", { text: msg }));
      const btns = el("div", { class: "row modal-btns" });
      const yes = el("button", { class: "danger", text: "Confirmar" });
      const no = el("button", { class: "ghost", text: "Cancelar" });
      btns.append(no, yes);
      body.appendChild(btns);
      yes.onclick = () => {
        close();
        cb(true);
      };
      no.onclick = () => {
        close();
        cb(false);
      };
    });
  }

  function elevate(cb, requesterId) {
    const requester = requesterId || "terminal";
    if (!PyStorage.isAdmin()) {
      toast("La elevación root está disponible solo para cuentas administradoras.");
      PyStorage.logSystemEvent("root", "Solicitud root denegada para " + requester + ": cuenta estándar");
      cb(false);
      return;
    }
    const manager = PyStorage.getRootManager();
    if (!manager.installed) {
      openModal("Gestor root no instalado", (body, close) => {
        body.append(el("p", { class: "warn-text", text: "PyOS usa un gestor de privilegios por aplicación. Instálalo para aprobar solicitudes de superusuario sin usar una contraseña global." }));
        const cancel = el("button", { class: "ghost", text: "Cancelar" });
        const open = el("button", { text: "Abrir Root Manager" });
        body.appendChild(el("div", { class: "row modal-btns" }, [cancel, open]));
        cancel.onclick = () => { close(); cb(false); };
        open.onclick = () => { close(); PyStorage.logSystemEvent("root", "Root Manager solicitado por " + requester); openAppFn && openAppFn("rootmanager"); cb(false); };
      });
      return;
    }
    const grant = manager.grants && manager.grants[requester];
    const approve = (persistent) => {
      if (persistent) {
        manager.grants[requester] = "allow";
        PyStorage.setRootManager(manager);
      }
      sessionRoot = true;
      PyStorage.logSystemEvent("root", "Privilegio superusuario concedido a " + requester + (persistent ? " (política permanente)" : " (una vez)"));
      onRootChangeGlobal();
      cb(true);
    };
    if (grant === "allow") {
      approve(false);
      return;
    }
    openModal("Solicitud de superusuario", (body, close) => {
      body.append(el("p", { class: "warn-text", text: requester + " solicita control root para esta sesión. El gestor registrará tu decisión y mantendrá protegidos los archivos críticos." }));
      const deny = el("button", { class: "ghost", text: "Denegar" });
      const once = el("button", { text: "Permitir una vez" });
      const always = el("button", { class: "warn", text: "Confiar siempre" });
      body.appendChild(el("div", { class: "row modal-btns" }, [deny, once, always]));
      deny.onclick = () => { close(); PyStorage.logSystemEvent("root", "Privilegio superusuario denegado a " + requester); cb(false); };
      once.onclick = () => { close(); approve(false); };
      always.onclick = () => { close(); approve(true); };
    });
  }

  function askPermissions(appInfo, pending, onDone) {
    openModal("Permisos de " + appInfo.name, (body, close) => {
      body.appendChild(el("p", { text: appInfo.name + " quiere acceder a:" }));
      const checks = [];
      pending.forEach((perm) => {
        const cb = el("input", { type: "checkbox" });
        cb.checked = true;
        checks.push([perm, cb]);
        body.appendChild(el("label", { class: "perm-row" }, [cb, document.createTextNode(" " + (PyApps.PERMISSION_LABELS[perm] || perm))]));
      });
      const btns = el("div", { class: "row modal-btns" });
      const denyAll = el("button", { class: "ghost", text: "Denegar todo" });
      const allow = el("button", { text: "Permitir seleccionados" });
      btns.append(denyAll, allow);
      body.appendChild(btns);
      denyAll.onclick = () => {
        pending.forEach((perm) => PyStorage.setPermission(appInfo.id, perm, false));
        close();
        onDone();
      };
      allow.onclick = () => {
        checks.forEach(([perm, cb]) => PyStorage.setPermission(appInfo.id, perm, cb.checked));
        close();
        onDone();
      };
    });
  }

  let onRootChangeGlobal = () => {};

  // -----------------------------------------------------------------
  // Arranque principal: decide perfil, modo y monta la UI
  // -----------------------------------------------------------------
  function bootSystem() {
    const result = PyStorage.bootstrap();
    const problems = result.firstRun ? [] : PyStorage.checkIntegrity();
    if (problems.length) {
      showBSOD(problems, () => {
        PyStorage.bootstrap();
        PyStorage.recordIntegrity();
        bootSystem();
      });
      return;
    }

    const requested = new URLSearchParams(window.location.search).get("mode");
    const remembered = PyStorage.getPreference("ui_mode", null);
    const preferred = requested === "desktop" || requested === "touch" || requested === "console" ? requested : remembered;
    if (preferred === "desktop" || preferred === "touch" || preferred === "console") {
      mode = preferred;
      showSplash(() => startShell());
    } else {
      showModeChooser((chosen) => {
        mode = chosen;
        showSplash(() => startShell());
      });
    }
  }

  function boot() {
    showProfileChooser(() => bootSystem());
  }

  function startShell() {
    const accent = PyStorage.getPreference("accent_color", "#39ff14");
    document.documentElement.style.setProperty("--accent", accent || "#39ff14");
    PyStorage.logSystemEvent("boot", "Interfaz " + mode + " iniciada para " + PyStorage.getActiveProfile().username);
    const systemHelpers = { openModal, toast, askString, confirm, switchProfile: () => switchProfileFn && switchProfileFn() };
    if (mode === "desktop") startDesktop(buildApi, systemHelpers);
    else if (mode === "console") startConsole(buildApi, systemHelpers);
    else startTouch(buildApi, systemHelpers);
    if (!PyStorage.isPersistent()) {
      setTimeout(() => toast("Este navegador bloqueo el almacenamiento local: nada se va a guardar al recargar la pagina. Probalo sirviendolo por http/https en vez de abrir el archivo directo."), 800);
    }
  }

  window.PyOS = {
    boot,
    buildApi,
    get sessionRoot() {
      return sessionRoot;
    },
    setSessionRoot: (v) => {
      sessionRoot = v;
    },
    setOnRootChange: (fn) => (onRootChangeGlobal = fn),
    setOpenAppFn: (fn) => (openAppFn = fn),
    askPermissions,
    toast,
    formatBytes,
    get mode() {
      return mode;
    },
    get modalDepth() {
      return modalDepth;
    },
    switchProfile: () => switchProfileFn && switchProfileFn(),
    switchMode: () => switchModeFn && switchModeFn(),
    refreshApps: () => refreshShellFn && refreshShellFn(),
  };
  switchProfileFn = () => {
    sessionRoot = false;
    showProfileChooser(() => bootSystem());
  };
  switchModeFn = () => {
    sessionRoot = false;
    showModeChooser((chosen) => {
      mode = chosen;
      showSplash(() => startShell());
    });
  };
  refreshShellFn = () => {
    PyStorage.bootstrap();
    startShell();
  };

  window.addEventListener("DOMContentLoaded", () => {
    toastEl = document.getElementById("toast");
    boot();
  });
})();
