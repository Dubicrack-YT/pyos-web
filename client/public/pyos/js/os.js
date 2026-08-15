/* os.js -- el "kernel" de PyOS Web: arranque, eleccion de modo,
   gestor de ventanas (escritorio y tactil), root, modales, virus. */

(() => {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  let sessionRoot = false;
  let mode = "desktop"; // "desktop" | "touch" | "console"
  let switchProfileFn = null;
  let switchModeFn = null;
  const THEMES = {
    phosphor: { id: "phosphor", name: "Fósforo", accent: "#39ff14", bg: "#0d0d0d", panel: "#111711", panel2: "#162016", text: "#e0e9de", muted: "#899589", glow: "rgba(57,255,20,.12)", console: "#0b100b" },
    cobalt: { id: "cobalt", name: "Cobalto", accent: "#72a8ff", bg: "#0a101b", panel: "#101a2b", panel2: "#14233a", text: "#e5efff", muted: "#91a2bc", glow: "rgba(93,151,255,.16)", console: "#0a101c" },
    amber: { id: "amber", name: "Ámbar", accent: "#ffbd59", bg: "#171209", panel: "#22180b", panel2: "#30220d", text: "#fff1d8", muted: "#b6a181", glow: "rgba(255,189,89,.15)", console: "#181207" },
    coral: { id: "coral", name: "Coral", accent: "#ff776b", bg: "#180d0d", panel: "#251213", panel2: "#35191a", text: "#ffe6e3", muted: "#bd9491", glow: "rgba(255,119,107,.15)", console: "#190d0e" },
    orchid: { id: "orchid", name: "Orquídea", accent: "#d8a5ff", bg: "#160d1c", panel: "#21132b", panel2: "#321a40", text: "#f6eaff", muted: "#b9a1c9", glow: "rgba(216,165,255,.15)", console: "#160d1d" },
    arctic: { id: "arctic", name: "Ártico", accent: "#6ee7f4", bg: "#071718", panel: "#0d2528", panel2: "#12353a", text: "#e0fbfd", muted: "#91b9bd", glow: "rgba(110,231,244,.14)", console: "#071819" },
  };

  function activeTheme() {
    const legacy = PyStorage.getPreference("accent_color", "#39ff14");
    const legacyMatch = Object.values(THEMES).find((theme) => theme.accent === legacy);
    const themeId = PyStorage.getPreference("theme_id", legacyMatch ? legacyMatch.id : "phosphor");
    return THEMES[themeId] || THEMES.phosphor;
  }

  function applyTheme() {
    const theme = activeTheme();
    const css = document.documentElement.style;
    css.setProperty("--accent", theme.accent);
    css.setProperty("--accent-dim", theme.accent);
    css.setProperty("--border-active", theme.accent);
    css.setProperty("--bg", theme.bg);
    css.setProperty("--panel", theme.panel);
    css.setProperty("--panel2", theme.panel2);
    css.setProperty("--text", theme.text);
    css.setProperty("--muted", theme.muted);
    css.setProperty("--theme-glow", theme.glow);
    css.setProperty("--theme-console", theme.console);
    document.documentElement.dataset.pyosTheme = theme.id;
    return theme;
  }

  // -----------------------------------------------------------------
  // Utilidades chicas
  // -----------------------------------------------------------------
  function clearRoot() {
    rootEl.innerHTML = "";
  }

  function screen(name) {
    clearRoot();
    const s = el("div", { class: "screen screen-" + name });
    s.tabIndex = 0;
    rootEl.appendChild(s);
    requestAnimationFrame(() => s.focus({ preventScroll: true }));
    return s;
  }

  function bindStartupInput(host, controls) {
    let selected = 0;
    let active = true;
    let keyboard = null;
    let keyboardInput = null;
    const pressed = {};
    const axes = { horizontal: 0, vertical: 0 };
    const currentPad = () => (navigator.getGamepads ? Array.from(navigator.getGamepads()).find((pad) => pad && pad.connected) : null);
    const buttonDown = (pad, index) => { const button = pad && pad.buttons && pad.buttons[index]; return !!(button && (button.pressed || button.value > 0.5)); };
    let ignoreAcceptUntilRelease = buttonDown(currentPad(), 0);
    const isText = (control) => control && (control.tagName === "TEXTAREA" || (control.tagName === "INPUT" && !/checkbox|radio|button|submit/.test(control.type || "text")));
    const activeControls = () => keyboard ? Array.from(keyboard.querySelectorAll("button")) : controls;
    const paint = () => activeControls().forEach((control, index) => {
      control.classList.toggle("startup-control-selected", index === selected);
      control.tabIndex = index === selected ? 0 : -1;
    });
    const move = (amount) => {
      const items = activeControls();
      if (!items.length) return;
      selected = (selected + amount + items.length) % items.length;
      paint();
      items[selected].focus({ preventScroll: true });
    };
    const closeKeyboard = () => {
      if (keyboard) keyboard.remove();
      keyboard = null;
      keyboardInput = null;
      selected = 0;
      paint();
    };
    const openKeyboard = (input) => {
      if (!input || keyboard) return;
      keyboardInput = input;
      keyboard = el("section", { class: "startup-keyboard" });
      const value = el("span", { class: "startup-keyboard-value", text: input.value || "_" });
      const heading = el("div", { class: "startup-keyboard-heading" }, [el("span", { text: "ESCRIBIR NOMBRE" }), value]);
      const grid = el("div", { class: "startup-keyboard-grid" });
      "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789".split("").forEach((character) => {
        const key = el("button", { class: "startup-keyboard-key", text: character });
        key.dataset.startKey = character;
        grid.appendChild(key);
      });
      const space = el("button", { class: "startup-keyboard-key wide", text: "ESPACIO" });
      space.dataset.startKey = " ";
      const erase = el("button", { class: "startup-keyboard-key", text: "⌫" });
      erase.dataset.startAction = "erase";
      const done = el("button", { class: "startup-keyboard-key confirm", text: "LISTO" });
      done.dataset.startAction = "done";
      grid.append(space, erase, done);
      keyboard.append(heading, grid);
      host.appendChild(keyboard);
      selected = 0;
      requestAnimationFrame(paint);
    };
    const activate = () => {
      const items = activeControls();
      const control = items[selected];
      if (!control) return;
      if (keyboard) {
        if (control.dataset.startAction === "erase") keyboardInput.value = keyboardInput.value.slice(0, -1);
        else if (control.dataset.startAction === "done") { closeKeyboard(); return; }
        else if (control.dataset.startKey !== undefined) keyboardInput.value += control.dataset.startKey;
        keyboardInput.dispatchEvent(new Event("input", { bubbles: true }));
        keyboardInput.dispatchEvent(new Event("change", { bubbles: true }));
        const value = keyboard.querySelector(".startup-keyboard-value");
        if (value) value.textContent = keyboardInput.value || "_";
        return;
      }
      if (isText(control)) { openKeyboard(control); return; }
      window.__pyosSuppressGamepadUntilRelease = true;
      control.click();
    };
    const openAvailableKeyboard = () => {
      if (keyboard) return;
      const selectedControl = controls[selected];
      openKeyboard(isText(selectedControl) ? selectedControl : controls.find((control) => isText(control)));
    };
    const onKey = (event) => {
      if (!active) return;
      if (["ArrowLeft", "ArrowUp"].includes(event.key)) { event.preventDefault(); move(-1); }
      else if (["ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); move(1); }
      else if (["Enter", " "].includes(event.key)) { event.preventDefault(); activate(); }
      else if (event.key === "Escape" && keyboard) { event.preventDefault(); closeKeyboard(); }
    };
    document.addEventListener("keydown", onKey);
    function loop() {
      if (!active || !document.body.contains(host)) return;
      const pad = currentPad();
      if (pad) {
        [[14, -1], [12, -1], [15, 1], [13, 1]].forEach(([button, amount]) => {
          const down = buttonDown(pad, button);
          if (down && !pressed[button]) move(amount);
          pressed[button] = down;
        });
        const horizontal = Math.abs((pad.axes || [])[0] || 0) > .35 ? ((pad.axes || [])[0] > 0 ? 1 : -1) : 0;
        const vertical = Math.abs((pad.axes || [])[1] || 0) > .35 ? ((pad.axes || [])[1] > 0 ? 1 : -1) : 0;
        if (horizontal && horizontal !== axes.horizontal) move(horizontal);
        if (vertical && vertical !== axes.vertical) move(vertical);
        axes.horizontal = horizontal;
        axes.vertical = vertical;
        const accept = buttonDown(pad, 0);
        if (!accept) ignoreAcceptUntilRelease = false;
        if (accept && !pressed.accept && !ignoreAcceptUntilRelease) activate();
        pressed.accept = accept;
        const keyboardDown = buttonDown(pad, 3);
        if (keyboardDown && !pressed.keyboard) openAvailableKeyboard();
        pressed.keyboard = keyboardDown;
        const back = buttonDown(pad, 1);
        if (back && !pressed.back && keyboard) closeKeyboard();
        pressed.back = back;
      }
      requestAnimationFrame(loop);
    }
    paint();
    requestAnimationFrame(loop);
    return () => { active = false; if (keyboard) keyboard.remove(); document.removeEventListener("keydown", onKey); };
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
    let releaseStartupInput = () => {};
    const selectProfile = (profile) => {
      releaseStartupInput();
      PyStorage.setActiveProfile(profile.id);
      onChosen(profile);
    };
    const cards = [];
    profiles.forEach((profile, index) => {
      const card = el("button", { class: "profile-card" }, [
        el("span", { class: "profile-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
        el("span", { class: "profile-name", text: profile.name }),
        el("span", { class: "profile-meta", text: index === 0 ? "Perfil principal" : "Cuenta local" }),
      ]);
      card.onclick = () => selectProfile(profile);
      profileGrid.appendChild(card);
      cards.push(card);
    });
    createBtn.onclick = () => {
      const result = PyStorage.createProfile(createInput.value);
      if (!result.ok) { createInput.focus(); return; }
      releaseStartupInput();
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
      el("p", { class: "profile-footnote", text: "Cada cuenta mantiene sus archivos, permisos y preferencias locales." }),
    ]));
    releaseStartupInput = bindStartupInput(s, cards.concat([createInput, createBtn]));
  }

  function showModeChooser(onChosen) {
    const s = screen("chooser");
    let remember = false;
    const rememberBox = el("input", { type: "checkbox", id: "remember-mode" });
    rememberBox.addEventListener("change", () => (remember = rememberBox.checked));

    let releaseStartupInput = () => {};
    const desktop = el("button", { class: "chooser-card" }, [
      el("div", { class: "chooser-icon", text: "\u{1F5A5}\uFE0F" }),
      el("div", { class: "chooser-title", text: "Experiencia de escritorio" }),
      el("div", { class: "chooser-desc", text: "Ventanas que podes arrastrar, redimensionar y superponer. Pensada para mouse y teclado." }),
    ]).also((btn) => (btn.onclick = () => finish("desktop")));
    const touch = el("button", { class: "chooser-card" }, [
      el("div", { class: "chooser-icon", text: "\u{1F4F1}" }),
      el("div", { class: "chooser-title", text: "Experiencia tactil" }),
      el("div", { class: "chooser-desc", text: "Una app a pantalla completa por vez, con boton de volver. Pensada para tocar con el dedo." }),
    ]).also((btn) => (btn.onclick = () => finish("touch")));
    const consoleMode = el("button", { class: "chooser-card chooser-console" }, [
      el("div", { class: "chooser-icon", text: "◈" }),
      el("div", { class: "chooser-title", text: "Experiencia Consola" }),
      el("div", { class: "chooser-desc", text: "Panel grande para TV y mando. También puedes probarlo ahora desde PC o móvil." }),
    ]).also((btn) => (btn.onclick = () => finish("console")));
    s.appendChild(
      el("div", { class: "chooser-box" }, [
        el("h1", { text: "PyOS Web" }),
        el("p", { class: "muted", text: "Elegí una experiencia para tu pantalla y controles:" }),
        el("div", { class: "chooser-options" }, [desktop, touch, consoleMode]),
        el("label", { class: "remember-row" }, [rememberBox, document.createTextNode(" Recordar mi eleccion y no preguntar de nuevo")]),
      ])
    );

    function finish(chosen) {
      releaseStartupInput();
      if (remember) PyStorage.setPreference("ui_mode", chosen);
      onChosen(chosen);
    }
    releaseStartupInput = bindStartupInput(s, [desktop, touch, consoleMode]);
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
      installAppFiles: (id, label) => PyStorage.installAppFiles(id, label),
      uninstallAppFiles: (id) => PyStorage.uninstallAppFiles(id),
      refreshApps: () => refreshShellFn && refreshShellFn(),
      currentMode: () => mode,
      themes: () => Object.values(THEMES),
      activeTheme: () => activeTheme(),
      setTheme: (themeId) => {
        if (!THEMES[themeId]) return false;
        PyStorage.setPreference("theme_id", themeId);
        PyStorage.setPreference("accent_color", THEMES[themeId].accent);
        applyTheme();
        return true;
      },
      systemVersion: () => PyStorage.getConfig().version || "1.0.0",
      deviceProfile: () => PyStorage.getConfig().device_profile || {},
      rootManager: () => PyStorage.getRootManager(),
      updateRootManager: (state) => PyStorage.setRootManager(state),
      rootManagerForProfile: (profileId) => PyStorage.getRootManagerForProfile(profileId),
      updateRootManagerForProfile: (profileId, state) => PyStorage.setRootManagerForProfile(profileId, state),
      services: () => PyStorage.getServices(),
      setServices: (services) => PyStorage.setServices(services),
      systemEvents: () => PyStorage.getSystemEvents(),
      logSystemEvent: (type, message, meta) => PyStorage.logSystemEvent(type, message, meta),
      recentApps: () => PyStorage.getRecentApps(),
      recordRecentApp: (id) => PyStorage.recordRecentApp(id),
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
      hardwareTelemetry: () => {
        const profile = PyStorage.getConfig().device_profile || {};
        const memoryGb = Number(profile.memory_gb) || 32;
        const storageGb = Number(profile.storage_gb) || 1024;
        const services = PyStorage.getServices();
        const now = performance.now() / 1000;
        const openCount = hooks.countOpen ? hooks.countOpen() : 1;
        const activeLoad = Math.min(24, openCount * 3 + (sessionRoot ? 4 : 0) + (appId === "voxelforge" ? 13 : 0));
        const cpu = Math.round(Math.max(3, Math.min(96, 11 + activeLoad + 12 * Math.sin(now * 0.78) + 7 * Math.sin(now * 2.13))));
        const gpu = Math.round(Math.max(2, Math.min(97, 7 + activeLoad * 1.2 + 16 * Math.cos(now * 0.62) + (appId === "voxelforge" ? 18 : 0))));
        const heap = performance.memory && performance.memory.usedJSHeapSize ? performance.memory.usedJSHeapSize / 1073741824 : 0.34 + openCount * 0.09;
        const ram = Math.min(memoryGb * 0.86, Math.max(memoryGb * 0.18, memoryGb * 0.22 + heap + activeLoad * 0.021 + Math.sin(now * 0.31) * 0.18));
        const fileGb = PyStorage.estimateBytes() / 1073741824;
        const storage = Math.min(storageGb * 0.92, Math.max(48, 106 + fileGb + openCount * 0.16 + Math.sin(now * 0.11) * 0.05));
        const net = navigator.onLine && services.telemetry && services.telemetry.enabled ? Math.max(0, Math.round(0.6 + activeLoad * 0.18 + 2.3 * Math.abs(Math.sin(now * 0.43)))) : 0;
        return {
          cpu, gpu, ram, storage, net,
          cpuClock: (4.25 + cpu / 100 * 0.92).toFixed(2),
          gpuClock: Math.round(1260 + gpu * 9.2),
          cpuTemp: Math.round(37 + cpu * 0.47),
          gpuTemp: Math.round(34 + gpu * 0.43),
          diskRate: (4 + Math.abs(Math.sin(now * 0.9)) * (18 + activeLoad)).toFixed(1),
          processes: Math.max(36, 54 + openCount * 3 + (sessionRoot ? 2 : 0)),
          memoryGb, storageGb,
        };
      },
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
    if (mode === "console") overlay.classList.add("console-request");
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
    if (mode === "console") body.appendChild(el("p", { class: "console-request-hint", text: "STICK/CRUCETA · MOVER   A · CONFIRMAR   B · CANCELAR" }));
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
    const activeProfile = PyStorage.getActiveProfile();
    const isAdministrator = PyStorage.isAdmin();
    const manager = PyStorage.getRootManagerForProfile(activeProfile.id);
    if (!isAdministrator && !manager.installed) {
      toast("Un administrador debe preparar Root Manager para esta cuenta.");
      PyStorage.logSystemEvent("root", "Solicitud root pendiente para " + requester + ": perfil estándar sin Root Manager");
      cb(false);
      return;
    }
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
        PyStorage.setRootManagerForProfile(activeProfile.id, manager);
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
    applyTheme();
    PyStorage.logSystemEvent("boot", "Interfaz " + mode + " iniciada para " + PyStorage.getActiveProfile().username);
    const systemHelpers = { openModal, toast, askString, confirm, switchProfile: () => switchProfileFn && switchProfileFn(), switchProfileTo, switchMode: () => switchModeFn && switchModeFn() };
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
  function switchProfileTo(profileId) {
    const profile = PyStorage.getProfiles().find((item) => item.id === profileId);
    if (!profile) return false;
    sessionRoot = false;
    PyStorage.setActiveProfile(profile.id);
    PyStorage.logSystemEvent("profile", "Cambio de perfil desde Consola: " + profile.username);
    startShell();
    return true;
  }
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
