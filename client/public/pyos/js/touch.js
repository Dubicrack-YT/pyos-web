/* touch.js -- experiencia tactil: pantalla de inicio con iconos grandes,
   una app a pantalla completa por vez, con boton de "volver". */

function startTouch(buildApi, sys) {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  rootEl.innerHTML = "";

  const shell = el("div", { class: "touch-shell" });

  const statusbar = el("div", { class: "touch-statusbar" });
  const rootIndicator = el("span", { class: "root-indicator" });
  const profileBtn = el("button", { class: "profile-switcher touch-profile" });
  const clockEl = el("span", { class: "taskbar-clock" });
  statusbar.append(rootIndicator, profileBtn, clockEl);

  const home = el("div", { class: "touch-home" });
  const ransomBanner = el("div", { class: "ransom-banner" });
  const iconGrid = el("div", { class: "touch-icon-grid" });
  home.append(ransomBanner, iconGrid);

  const appView = el("div", { class: "touch-app-view hidden" });
  const appBar = el("div", { class: "touch-appbar" });
  const backBtn = el("button", { class: "back-btn", text: "\u2190 Inicio" });
  const appTitle = el("span", { class: "touch-app-title" });
  appBar.append(backBtn, appTitle);
  const appContent = el("div", { class: "touch-app-content" });
  appView.append(appBar, appContent);

  shell.append(statusbar, home, appView);
  rootEl.appendChild(shell);

  let currentApp = null; // {appId, activateCallbacks, destroyCallbacks}
  const openCount = { home: true };

  function countOpen() {
    return currentApp ? 1 : 0;
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

  function goHome() {
    if (currentApp) {
      currentApp.destroyCallbacks.forEach((cb) => cb());
      currentApp = null;
    }
    appContent.innerHTML = "";
    appView.classList.add("hidden");
    home.classList.remove("hidden");
  }
  backBtn.onclick = goHome;

  function openApp(appId, args) {
    const app = PyApps.ALL.find((a) => a.id === appId);
    if (!app) return;
    const pending = (app.permissions || []).filter((p) => !PyStorage.permDecided(appId, p));
    if (pending.length) {
      PyOS.askPermissions(app, pending, () => openAppView(app, args));
    } else {
      openAppView(app, args);
    }
  }
  PyOS.setOpenAppFn(openApp);

  function openAppView(app, args) {
    if (currentApp) currentApp.destroyCallbacks.forEach((cb) => cb());
    appContent.innerHTML = "";
    appTitle.textContent = app.icon + "  " + app.name;
    currentApp = { appId: app.id, activateCallbacks: [], destroyCallbacks: [] };

    const hooks = {
      onRootChange: () => {},
      countOpen,
      onActivate: (cb) => {
        currentApp.activateCallbacks.push(cb);
      },
      onDestroy: (cb) => currentApp.destroyCallbacks.push(cb),
    };
    const api = buildApi(app.id, args, hooks);
    try {
      app.render(appContent, api);
    } catch (e) {
      appContent.appendChild(el("div", { class: "error-box", text: "La app fallo al iniciar: " + e }));
      console.error(e);
    }

    home.classList.add("hidden");
    appView.classList.remove("hidden");
    currentApp.activateCallbacks.forEach((cb) => cb());
  }

  // ---- Iconos (grid responsivo, se acomoda solo con CSS) --------------
  function buildIcons() {
    iconGrid.innerHTML = "";
    PyApps.ALL.forEach((app) => {
      const btn = el("button", { class: "touch-icon" }, [
        el("div", { class: "touch-icon-glyph", text: app.icon }),
        el("div", { class: "touch-icon-label", text: app.name }),
      ]);
      btn.onclick = () => openApp(app.id);
      iconGrid.appendChild(btn);
    });
  }
  buildIcons();

  function setIconsEnabled(enabled) {
    iconGrid.classList.toggle("locked", !enabled);
  }

  function tickClock() {
    clockEl.textContent = new Date().toLocaleTimeString();
  }
  tickClock();
  setInterval(tickClock, 1000);
  refreshRootIndicator();

  // ---- Infecciones (misma logica que en escritorio, UI mas simple) ----
  const infectionState = {};
  const activePopups = [];
  let catActive = false;

  const JOKES = [
    "ADVERTENCIA: se detectaron 9999 amenazas en tu sistema.",
    "Tu PyOS esta funcionando a un 12% de su capacidad normal.",
    "Alguien mas esta usando tu sesion ahora mismo.",
    "Tu antivirus vencio hace 3 dias.",
    "Hace click aca para reclamar tu premio.",
  ];

  function spawnTrollPopup() {
    if (!infectionState["Trollware Clasico"]) return;
    if (activePopups.length < 2) {
      const msg = JOKES[Math.floor(Math.random() * JOKES.length)];
      const popup = el("div", { class: "troll-popup touch-troll" });
      const closeBtn = el("button", { text: "Cerrar" });
      popup.append(el("div", { class: "troll-title", text: "Trollware Clasico" }), el("div", { class: "troll-msg", text: msg }), closeBtn);
      closeBtn.onclick = () => {
        popup.remove();
        const idx = activePopups.indexOf(popup);
        if (idx !== -1) activePopups.splice(idx, 1);
      };
      shell.appendChild(popup);
      activePopups.push(popup);
    }
    setTimeout(spawnTrollPopup, 5000);
  }

  function activateCat() {
    catActive = true;
    home.classList.add("cat-infected");
  }
  function deactivateCat() {
    catActive = false;
    home.classList.remove("cat-infected");
  }

  function wormTick() {
    if (!infectionState["Gusano de juguete"]) return;
    try {
      wormReplicate();
    } catch (e) {}
    setTimeout(wormTick, 5000);
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
    if (!PyStorage.exists(dest)) PyStorage.writeFile(dest, source.content);
  }

  function spywareTick() {
    if (!infectionState["Spyware Curioso"]) return;
    console.log("[PyOS][Spyware Curioso] te esta 'espiando' (modo tactil)");
    setTimeout(spywareTick, 3500);
  }

  function activateInfection(name) {
    if (infectionState[name]) return;
    infectionState[name] = true;
    console.log("[PyOS] Infeccion activa: " + name);
    if (name === "Trollware Clasico") spawnTrollPopup();
    else if (name === "Gusano de juguete") wormTick();
    else if (name === "Ransomware de broma") {
      ransomBanner.textContent = "RANSOMWARE ACTIVO -- tus iconos quedaron bloqueados.";
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
    else if (name === "Trollware Clasico") activePopups.splice(0).forEach((p) => p.remove());
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
