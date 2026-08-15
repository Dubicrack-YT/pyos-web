/* desktop.js -- experiencia de escritorio: ventanas flotantes, barra de
   tareas, iconos, y el sistema de "infecciones" de los virus de juguete. */

function startDesktop(buildApi, sys) {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  rootEl.innerHTML = "";

  const shell = el("div", { class: "desktop-shell" });
  const desktop = el("div", { class: "desktop" });
  const iconsLayer = el("div", { class: "icons-layer" });
  const windowsLayer = el("div", { class: "windows-layer" });
  const ransomBanner = el("div", { class: "ransom-banner" });
  desktop.append(iconsLayer, windowsLayer, ransomBanner);

  const taskbar = el("div", { class: "taskbar" });
  const startBtn = el("button", { class: "start-btn", text: "\u2630 Inicio" });
  const startMenu = el("div", { class: "start-menu hidden" });
  const taskbarApps = el("div", { class: "taskbar-apps" });
  const rootIndicator = el("span", { class: "root-indicator" });
  const profileBtn = el("button", { class: "profile-switcher" });
  const clockEl = el("span", { class: "taskbar-clock" });
  taskbar.append(startBtn, startMenu, taskbarApps, rootIndicator, profileBtn, clockEl);

  shell.append(desktop, taskbar);
  rootEl.appendChild(shell);

  // PyOS escritorio: ventanas terminales con geometría contenida, arrastre estable y maximizado reversible.
  // ---- Ventanas -----------------------------------------------------
  const windows = new Map(); // winId -> {frame, appId, name, icon, minimized, hooks}
  const windowOrder = [];
  let nextWinId = 1;
  let cascade = 0;

  function countOpen() {
    return windows.size;
  }

  function refreshRootIndicator() {
    profileBtn.textContent = "◈ " + PyStorage.getActiveProfile().name;
    if (PyOS.sessionRoot) {
      rootIndicator.textContent = "ROOT ACTIVO";
      rootIndicator.className = "root-indicator active";
    } else {
      rootIndicator.textContent = "usuario: " + PyStorage.getConfig().username;
      rootIndicator.className = "root-indicator";
    }
  }
  profileBtn.onclick = () => sys.switchProfile && sys.switchProfile();
  PyOS.setOnRootChange(() => {
    refreshRootIndicator();
    checkInfections();
  });

  function refreshTaskbar() {
    taskbarApps.innerHTML = "";
    windowOrder.forEach((id) => {
      const w = windows.get(id);
      if (!w) return;
      const btn = el("button", { class: "taskbar-item" + (w.minimized ? " minimized" : ""), text: w.icon + " " + w.name });
      btn.onclick = () => {
        if (w.minimized) {
          w.minimized = false;
          w.frame.classList.remove("minimized");
        }
        focusWindow(id);
      };
      taskbarApps.appendChild(btn);
    });
  }

  function focusWindow(id) {
    if (!windows.has(id)) return;
    const idx = windowOrder.indexOf(id);
    if (idx !== -1) windowOrder.splice(idx, 1);
    windowOrder.push(id);
    windows.forEach((w, wid) => {
      const active = wid === id;
      w.frame.classList.toggle("active", active);
      w.frame.style.zIndex = active ? "100" : String(10 + windowOrder.indexOf(wid));
    });
    const w = windows.get(id);
    w.activateCallbacks.forEach((cb) => cb());
    refreshTaskbar();
  }

  function closeWindow(id) {
    const w = windows.get(id);
    if (!w) return;
    w.destroyCallbacks.forEach((cb) => cb());
    w.frame.remove();
    windows.delete(id);
    const idx = windowOrder.indexOf(id);
    if (idx !== -1) windowOrder.splice(idx, 1);
    refreshTaskbar();
  }

  function getDesktopBounds() {
    return { width: Math.max(1, desktop.clientWidth), height: Math.max(1, desktop.clientHeight) };
  }

  function getWindowMinimums() {
    const { width, height } = getDesktopBounds();
    return {
      width: Math.min(300, Math.max(1, Math.min(220, width - 16))),
      height: Math.min(200, Math.max(1, Math.min(160, height - 16))),
    };
  }

  function applyWindowGeometry(w) {
    w.frame.style.left = w.x + "px";
    w.frame.style.top = w.y + "px";
    w.frame.style.width = w.width + "px";
    w.frame.style.height = w.height + "px";
  }

  function clampWindow(w) {
    const { width: dw, height: dh } = getDesktopBounds();
    if (w.maximized) {
      w.x = 0;
      w.y = 0;
      w.width = dw;
      w.height = dh;
      applyWindowGeometry(w);
      return;
    }

    const minimums = getWindowMinimums();
    const maxWidth = Math.max(minimums.width, dw - 16);
    const maxHeight = Math.max(minimums.height, dh - 16);
    w.width = Math.max(minimums.width, Math.min(w.width, maxWidth));
    w.height = Math.max(minimums.height, Math.min(w.height, maxHeight));
    w.x = Math.max(0, Math.min(w.x, Math.max(0, dw - w.width)));
    w.y = Math.max(0, Math.min(w.y, Math.max(0, dh - w.height)));
    applyWindowGeometry(w);
  }

  function clampAllWindows() {
    windows.forEach(clampWindow);
  }

  function toggleMaximize(id) {
    const w = windows.get(id);
    if (!w) return;

    if (w.maximized) {
      const restore = w.restoreBounds;
      w.maximized = false;
      w.restoreBounds = null;
      if (restore) {
        w.x = restore.x;
        w.y = restore.y;
        w.width = restore.width;
        w.height = restore.height;
      }
    } else {
      w.restoreBounds = { x: w.x, y: w.y, width: w.width, height: w.height };
      w.maximized = true;
    }

    w.frame.classList.toggle("maximized", w.maximized);
    w.maximizeButton.textContent = w.maximized ? "❐" : "□";
    w.maximizeButton.title = w.maximized ? "Restaurar" : "Maximizar";
    clampWindow(w);
    focusWindow(id);
  }
  window.addEventListener("resize", clampAllWindows);

  function openApp(appId, args) {
    const app = PyApps.ALL.find((a) => a.id === appId);
    if (!app) return;
    const pending = (app.permissions || []).filter((p) => !PyStorage.permDecided(appId, p));
    if (pending.length) {
      PyOS.askPermissions(app, pending, () => openAppWindow(app, args));
    } else {
      openAppWindow(app, args);
    }
  }
  PyOS.setOpenAppFn(openApp);

  function openAppWindow(app, args) {
    const id = nextWinId++;
    cascade = (cascade + 1) % 8;
    const availableWidth = Math.max(1, desktop.clientWidth - 16);
    const availableHeight = Math.max(1, desktop.clientHeight - 16);
    const width = Math.min(680, availableWidth);
    const height = Math.min(500, availableHeight);
    const x = Math.max(8, Math.min(28 + cascade * 26, availableWidth - width + 8));
    const y = Math.max(8, Math.min(22 + cascade * 22, availableHeight - height + 8));

    const frame = el("div", { class: "app-window" });
    frame.style.left = x + "px";
    frame.style.top = y + "px";
    frame.style.width = width + "px";
    frame.style.height = height + "px";

    const titlebar = el("div", { class: "app-titlebar" });
    const titleLabel = el("span", { class: "app-title", text: app.icon + "  " + app.name });
    const btnMin = el("button", { class: "win-btn", text: "\u2013", title: "Minimizar" });
    const btnMax = el("button", { class: "win-btn maximize", text: "□", title: "Maximizar" });
    const btnClose = el("button", { class: "win-btn close", text: "\u00d7", title: "Cerrar" });
    titlebar.append(titleLabel, btnMin, btnMax, btnClose);

    const content = el("div", { class: "app-content desktop-native-app" });
    const grip = el("div", { class: "resize-grip" });
    frame.append(titlebar, content, grip);
    windowsLayer.appendChild(frame);

    const winState = { frame, appId: app.id, name: app.name, icon: app.icon, minimized: false, maximized: false, restoreBounds: null, maximizeButton: btnMax, x, y, width, height, activateCallbacks: [], destroyCallbacks: [] };
    windows.set(id, winState);
    windowOrder.push(id);

    const hooks = {
      onRootChange: () => {},
      countOpen,
      onActivate: (cb) => winState.activateCallbacks.push(cb),
      onDestroy: (cb) => winState.destroyCallbacks.push(cb),
    };
    const api = buildApi(app.id, args, hooks);
    PyStorage.recordRecentApp(app.id);

    try {
      app.render(content, api);
      PyApps.ensureAppSurface(content, api, app);
    } catch (e) {
      content.appendChild(el("div", { class: "error-box", text: "La app fallo al iniciar: " + e }));
      console.error(e);
    }

    frame.addEventListener("mousedown", () => focusWindow(id));

    btnClose.onclick = (e) => {
      e.stopPropagation();
      closeWindow(id);
    };
    btnMin.onclick = (e) => {
      e.stopPropagation();
      winState.minimized = true;
      frame.classList.add("minimized");
      refreshTaskbar();
    };
    btnMax.onclick = (e) => {
      e.stopPropagation();
      toggleMaximize(id);
    };
    titlebar.addEventListener("dblclick", (e) => {
      if (e.target.closest(".win-btn")) return;
      e.preventDefault();
      toggleMaximize(id);
    });

    makeDraggable(frame, titlebar, winState);
    makeResizable(frame, grip, winState);

    focusWindow(id);
    refreshTaskbar();
    requestAnimationFrame(clampAllWindows);
  }

  function makeDraggable(frame, handle, winState) {
    let dragging = false;
    let startX, startY, origX, origY;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".win-btn")) return;
      if (winState.maximized) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = winState.x;
      origY = winState.y;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dw = desktop.clientWidth;
      const dh = desktop.clientHeight;
      let nx = origX + (e.clientX - startX);
      let ny = origY + (e.clientY - startY);
      nx = Math.max(0, Math.min(nx, dw - 60));
      ny = Math.max(0, Math.min(ny, dh - 40));
      winState.x = nx;
      winState.y = ny;
      frame.style.left = nx + "px";
      frame.style.top = ny + "px";
    });
    window.addEventListener("mouseup", () => (dragging = false));
  }

  function makeResizable(frame, grip, winState) {
    let resizing = false;
    let startX, startY, origW, origH;
    grip.addEventListener("mousedown", (e) => {
      if (winState.maximized) return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      origW = winState.width;
      origH = winState.height;
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener("mousemove", (e) => {
      if (!resizing) return;
      const minimums = getWindowMinimums();
      const maxWidth = Math.max(minimums.width, desktop.clientWidth - winState.x - 8);
      const maxHeight = Math.max(minimums.height, desktop.clientHeight - winState.y - 8);
      let nw = Math.min(maxWidth, Math.max(minimums.width, origW + (e.clientX - startX)));
      let nh = Math.min(maxHeight, Math.max(minimums.height, origH + (e.clientY - startY)));
      winState.width = nw;
      winState.height = nh;
      frame.style.width = nw + "px";
      frame.style.height = nh + "px";
    });
    window.addEventListener("mouseup", () => (resizing = false));
  }

  // ---- Iconos del escritorio (CSS grid: se auto-acomodan, sin bugs) --
  function buildIcons() {
    iconsLayer.innerHTML = "";
    PyApps.ALL.forEach((app) => {
      const btn = el("button", { class: "desktop-icon" }, [
        el("div", { class: "desktop-icon-glyph", text: app.icon }),
        el("div", { class: "desktop-icon-label", text: app.name }),
      ]);
      btn.onclick = () => openApp(app.id);
      iconsLayer.appendChild(btn);
    });
  }
  buildIcons();

  function setIconsEnabled(enabled) {
    iconsLayer.classList.toggle("locked", !enabled);
  }

  // ---- Menu de inicio -------------------------------------------------
  startBtn.onclick = (e) => {
    e.stopPropagation();
    startMenu.classList.toggle("hidden");
    startMenu.innerHTML = "";
    PyApps.ALL.forEach((app) => {
      const item = el("div", { class: "start-menu-item", text: app.icon + "  " + app.name });
      item.onclick = () => {
        startMenu.classList.add("hidden");
        openApp(app.id);
      };
      startMenu.appendChild(item);
    });
  };
  document.addEventListener("click", () => startMenu.classList.add("hidden"));

  // ---- Reloj ----------------------------------------------------------
  function tickClock() {
    clockEl.textContent = new Date().toLocaleTimeString();
  }
  tickClock();
  setInterval(tickClock, 1000);

  refreshRootIndicator();

  // ---- Sistema de infecciones (virus de juguete) -----------------------
  const infectionState = {};
  const activePopups = [];
  let catActive = false;

  const JOKES = [
    "ADVERTENCIA: se detectaron 9999 amenazas en tu sistema.",
    "Tu PyOS esta funcionando a un 12% de su capacidad normal.",
    "Alguien mas esta usando tu sesion ahora mismo.",
    "Tu antivirus vencio hace 3 dias.",
    "Hace click aca para reclamar tu premio.",
    "Se detecto actividad sospechosa en /system.",
  ];

  function spawnTrollPopup() {
    if (!infectionState["Trollware Clasico"]) return;
    if (activePopups.length < 3) {
      const msg = JOKES[Math.floor(Math.random() * JOKES.length)];
      const dw = desktop.clientWidth;
      const dh = desktop.clientHeight;
      const w = 240;
      const x = Math.random() * Math.max(20, dw - w - 20);
      const y = 40 + Math.random() * Math.max(20, dh - 180);
      const popup = el("div", { class: "troll-popup" });
      popup.style.left = x + "px";
      popup.style.top = y + "px";
      const closeBtn = el("button", { text: "Cerrar" });
      popup.append(el("div", { class: "troll-title", text: "Trollware Clasico" }), el("div", { class: "troll-msg", text: msg }), closeBtn);
      closeBtn.onclick = () => {
        popup.remove();
        const idx = activePopups.indexOf(popup);
        if (idx !== -1) activePopups.splice(idx, 1);
      };
      desktop.appendChild(popup);
      activePopups.push(popup);
    }
    setTimeout(spawnTrollPopup, 4000);
  }

  function activateCat() {
    if (catActive) return;
    catActive = true;
    desktop.classList.add("cat-infected");
    for (let i = 0; i < 5; i++) {
      const dw = desktop.clientWidth;
      const dh = desktop.clientHeight;
      const lbl = el("div", { class: "cat-emoji", text: "MIAU" });
      lbl.style.left = Math.random() * Math.max(20, dw - 80) + "px";
      lbl.style.top = 60 + Math.random() * Math.max(20, dh - 140) + "px";
      desktop.appendChild(lbl);
    }
  }
  function deactivateCat() {
    catActive = false;
    desktop.classList.remove("cat-infected");
    desktop.querySelectorAll(".cat-emoji").forEach((n) => n.remove());
  }

  function worm_tick() {
    if (!infectionState["Gusano de juguete"]) return;
    try {
      wormReplicate();
    } catch (e) {}
    setTimeout(worm_tick, 5000);
  }
  function wormReplicate() {
    const files = PyStorage.walkHome();
    const source = files.find((f) => f.content && f.content.includes(PyApps.SIGNATURE + ": Gusano de juguete"));
    if (!source) return;
    const count = files.filter((f) => f.path.split("/").pop().startsWith("gusano_de_juguete")).length;
    if (count >= 6) return;
    const folders = ["Documentos", "Escritorio", "Descargas"];
    const folder = folders[Math.floor(Math.random() * folders.length)];
    const dest = folder + "/gusano_de_juguete_copia" + (count + 1) + ".virus";
    if (!PyStorage.exists(dest)) {
      PyStorage.writeFile(dest, source.content);
      console.log("[PyOS] El Gusano de juguete se copio a si mismo en " + folder);
    }
  }

  function spywareTick() {
    if (!infectionState["Spyware Curioso"]) return;
    const names = Array.from(windows.values()).map((w) => w.name);
    console.log("[PyOS][Spyware Curioso] te esta 'espiando': tenes " + names.length + " ventana(s) abierta(s)" + (names.length ? ": " + names.join(", ") : ""));
    setTimeout(spywareTick, 3500);
  }

  function activateInfection(name) {
    if (infectionState[name]) return;
    infectionState[name] = true;
    console.log("[PyOS] Infeccion activa: " + name);
    if (name === "Trollware Clasico") spawnTrollPopup();
    else if (name === "Gusano de juguete") worm_tick();
    else if (name === "Ransomware de broma") {
      ransomBanner.textContent = "RANSOMWARE ACTIVO -- tus iconos quedaron bloqueados. Abri el Antivirus para recuperarlos.";
      ransomBanner.classList.add("show");
      setIconsEnabled(false);
    } else if (name === "Troyano Gatito") activateCat();
    else if (name === "Spyware Curioso") spywareTick();
  }
  function deactivateInfection(name) {
    if (!infectionState[name]) return;
    infectionState[name] = false;
    console.log("[PyOS] Amenaza neutralizada: " + name);
    if (name === "Ransomware de broma") {
      ransomBanner.classList.remove("show");
      setIconsEnabled(true);
    } else if (name === "Troyano Gatito") deactivateCat();
    else if (name === "Trollware Clasico") {
      activePopups.splice(0).forEach((p) => p.remove());
    }
  }

  function checkInfections() {
    const activeNames = new Set();
    PyStorage.walkHome().forEach(({ content }) => {
      if (content && content.includes(PyApps.SIGNATURE)) {
        const line = content.split("\n").find((l) => l.includes(PyApps.SIGNATURE));
        if (line) activeNames.add(line.split(":").slice(1).join(":").trim());
      }
    });
    Object.keys(infectionState).forEach((name) => {
      if (infectionState[name] && !activeNames.has(name)) deactivateInfection(name);
    });
    activeNames.forEach((name) => {
      if (!infectionState[name]) activateInfection(name);
    });
  }
  setInterval(checkInfections, 2500);
  checkInfections();
}
