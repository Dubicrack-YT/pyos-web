/* console.js -- experiencia de sala para PyOS: panel amplio, teclado y control. */
function startConsole(buildApi, sys) {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  rootEl.innerHTML = "";

  const shell = el("div", { class: "console-shell console-controller-only", "aria-label": "PyOS Consola, uso exclusivo con mando" });
  const header = el("header", { class: "console-header" });
  const identity = el("button", { class: "console-identity" });
  const modeTag = el("span", { class: "console-mode", text: "PYOS / CONSOLE" });
  const controllerStatus = el("span", { class: "console-controller-status", text: "◌ CONECTA UN MANDO" });
  const clock = el("span", { class: "console-clock" });
  header.append(identity, modeTag, controllerStatus, clock);

  const hero = el("section", { class: "console-hero" });
  const heroKicker = el("p", { class: "console-kicker", text: "Sesión disponible" });
  const heroTitle = el("h1", { class: "console-title", text: "Sala PyOS" });
  const heroCopy = el("p", { class: "console-copy", text: "Conecta un mando y pulsa cualquier botón para entrar. La última aplicación usada aparece primero." });
  const hints = el("div", { class: "console-hints" }, [
    el("span", { text: "A · Abrir / activar" }),
    el("span", { text: "STICK / CRUCETA · Mover" }),
    el("span", { text: "Y · Escribir" }),
    el("span", { text: "B · Volver" }),
    el("span", { text: "VISTA · Guía" }),
    el("span", { text: "LB / RB · Pestañas" }),
  ]);
  hero.append(heroKicker, heroTitle, heroCopy, hints);

  const sectionLabel = el("div", { class: "console-section-label", text: "APLICACIONES / RECIENTE" });
  const grid = el("div", { class: "console-app-carousel", role: "listbox", "aria-label": "Carrusel de aplicaciones" });
  const appPanel = el("section", { class: "console-app-panel hidden" });
  const appBar = el("div", { class: "console-app-bar" });
  const backBtn = el("button", { class: "console-back", text: "◀ Volver a sala" });
  const appTitle = el("span", { class: "console-app-title" });
  const appExitHint = el("span", { class: "console-app-exit-hint", text: "B · VOLVER A SALA" });
  appBar.append(backBtn, appTitle, appExitHint);
  const appContent = el("div", { class: "console-app-content" });
  appPanel.append(appBar, appContent);
  const profilePanel = el("section", { class: "console-profile-panel hidden" });
  const profileBar = el("div", { class: "console-profile-bar" });
  const guideTitle = el("span", { text: "GUÍA PYOS" });
  const guideTabs = el("div", { class: "console-guide-tabs" });
  const guideHint = el("span", { text: "LB / RB · PESTAÑAS   A · ELEGIR   B · CERRAR" });
  profileBar.append(guideTitle, guideTabs, guideHint);
  const profileContent = el("div", { class: "console-profile-content" });
  profilePanel.append(profileBar, profileContent);

  const footer = el("footer", { class: "console-footer" }, [
    el("span", { text: "PERFIL LOCAL · DATOS GUARDADOS EN ESTE NAVEGADOR" }),
    el("span", { class: "console-status", text: "● SISTEMA LISTO" }),
  ]);
  shell.append(header, hero, sectionLabel, grid, appPanel, profilePanel, footer);
  rootEl.appendChild(shell);

  let selected = 0;
  let currentApp = null;
  const tiles = [];
  let carouselApps = [];
  let appControlIndex = 0;
  let controllerKeyboard = null;
  let controllerInput = null;
  let guideTabIndex = 0;
  const guideTabNames = ["PERFIL", "SISTEMA", "SESIÓN"];

  function recentAppIds() {
    return PyStorage.getRecentApps();
  }

  function recordRecent(appId) {
    PyStorage.recordRecentApp(appId);
  }

  function refreshIdentity() {
    const profile = PyStorage.getActiveProfile();
    identity.innerHTML = "";
    identity.append(
      el("span", { class: "console-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
      el("span", { class: "console-user", text: profile.name }),
      el("span", { class: "console-switch", text: "Cambiar" })
    );
  }
  identity.onclick = () => showProfilePanel();

  function profilePanelOpen() {
    return !profilePanel.classList.contains("hidden");
  }

  function hideProfilePanel() {
    profilePanel.classList.add("hidden");
    shell.classList.remove("console-profile-open");
    appControlIndex = 0;
  }

  function renderGuideTabs() {
    guideTabs.innerHTML = "";
    guideTabNames.forEach((name, index) => guideTabs.appendChild(el("span", { class: "console-guide-tab" + (index === guideTabIndex ? " active" : ""), text: name })));
  }

  function changeGuideTab(delta) {
    guideTabIndex = (guideTabIndex + delta + guideTabNames.length) % guideTabNames.length;
    renderGuidePanel();
  }

  function renderGuidePanel() {
    renderGuideTabs();
    profileContent.innerHTML = "";
    if (guideTabIndex === 0) {
      guideTitle.textContent = "GUÍA / CUENTAS";
      const activeId = PyStorage.getActiveProfile().id;
      PyStorage.getProfiles().forEach((profile) => {
        const option = el("button", { class: "console-profile-option" + (profile.id === activeId ? " selected" : "") }, [
          el("span", { class: "console-profile-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
          el("span", { class: "console-profile-name", text: profile.name }),
          el("span", { class: "console-profile-meta", text: "@" + profile.username + " · " + (profile.role === "admin" ? "ADMIN" : "ESTÁNDAR") }),
        ]);
        option.onclick = () => {
          if (profile.id === activeId) { hideProfilePanel(); return; }
          window.__pyosSuppressGamepadUntilRelease = true;
          sys.switchProfileTo(profile.id);
        };
        profileContent.appendChild(option);
      });
    } else if (guideTabIndex === 1) {
      guideTitle.textContent = "GUÍA / SISTEMA";
      const changeMode = el("button", { class: "console-guide-action" }, [el("strong", { text: "Cambiar dispositivo" }), el("span", { text: "Elegir Escritorio, Táctil o Consola" })]);
      const root = el("button", { class: "console-guide-action" }, [el("strong", { text: "Root Manager" }), el("span", { text: "Políticas y solicitudes de superusuario" })]);
      changeMode.onclick = () => sys.switchMode();
      root.onclick = () => { hideProfilePanel(); openApp("rootmanager"); };
      profileContent.append(changeMode, root);
    } else {
      guideTitle.textContent = "GUÍA / SESIÓN";
      const accounts = el("button", { class: "console-guide-action" }, [el("strong", { text: "Cambiar cuenta" }), el("span", { text: "Volver a perfiles locales" })]);
      const close = el("button", { class: "console-guide-action" }, [el("strong", { text: "Cerrar guía" }), el("span", { text: "Regresar a la sala de aplicaciones" })]);
      accounts.onclick = () => { guideTabIndex = 0; renderGuidePanel(); };
      close.onclick = hideProfilePanel;
      profileContent.append(accounts, close);
    }
    appControlIndex = 0;
    requestAnimationFrame(() => prepareAppControls());
  }

  function showProfilePanel() {
    if (currentApp) return;
    guideTabIndex = 0;
    profilePanel.classList.remove("hidden");
    shell.classList.add("console-profile-open");
    renderGuidePanel();
  }

  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  tickClock();
  setInterval(tickClock, 1000);
  refreshIdentity();

  function refreshSelection() {
    tiles.forEach((tile, index) => {
      tile.classList.toggle("selected", index === selected);
      tile.setAttribute("aria-selected", index === selected ? "true" : "false");
      tile.tabIndex = index === selected ? 0 : -1;
    });
    const selectedTile = tiles[selected];
    const app = carouselApps[selected];
    if (app) sectionLabel.textContent = (selected === 0 && recentAppIds()[0] === app.id ? "RECIENTE / " : "APLICACIONES / ") + app.name.toUpperCase();
    if (selectedTile) selectedTile.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  function closeApp() {
    if (!currentApp) return;
    currentApp.destroyCallbacks.forEach((callback) => callback());
    currentApp = null;
    closeControllerKeyboard();
    appControlIndex = 0;
    appContent.innerHTML = "";
    appPanel.classList.add("hidden");
    grid.classList.remove("console-grid-muted");
    hero.classList.remove("console-hero-muted");
    refreshSelection();
    shell.focus();
  }
  backBtn.onclick = closeApp;

  function mountApp(app, args) {
    const activateCallbacks = [];
    const destroyCallbacks = [];
    currentApp = { appId: app.id, activateCallbacks, destroyCallbacks };
    appContent.innerHTML = "";
    appTitle.textContent = app.icon + " " + app.name;
    const api = buildApi(app.id, args || {}, {
      onActivate: (callback) => activateCallbacks.push(callback),
      onDestroy: (callback) => destroyCallbacks.push(callback),
      onRootChange: refreshIdentity,
      countOpen: () => currentApp ? 1 : 0,
    });
    try {
      app.render(appContent, api);
      PyApps.ensureAppSurface(appContent, api, app);
    } catch (error) {
      appContent.appendChild(el("p", { class: "console-error", text: "La aplicación no pudo abrirse: " + error.message }));
    }
    grid.classList.add("console-grid-muted");
    hero.classList.add("console-hero-muted");
    appPanel.classList.remove("hidden");
    recordRecent(app.id);
    activateCallbacks.forEach((callback) => callback());
    requestAnimationFrame(() => prepareAppControls());
  }

  function appControls() {
    const selector = "button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [role=button], .file-row";
    const modalLayer = document.getElementById("modal-layer");
    const modal = modalLayer && modalLayer.lastElementChild;
    const scope = controllerKeyboard || modal || (profilePanelOpen() ? profileContent : appContent);
    return Array.from(scope.querySelectorAll(selector)).filter((node) => node.offsetParent !== null && !node.closest(".hidden"));
  }

  function isTextControl(control) {
    return control && (control.tagName === "TEXTAREA" || (control.tagName === "INPUT" && !/checkbox|radio|button|submit/.test(control.type || "text")));
  }

  function closeControllerKeyboard() {
    if (controllerKeyboard) controllerKeyboard.remove();
    controllerKeyboard = null;
    controllerInput = null;
  }

  function openControllerKeyboard(input) {
    closeControllerKeyboard();
    controllerInput = input;
    controllerKeyboard = el("section", { class: "console-keyboard" });
    const heading = el("div", { class: "console-keyboard-heading" }, [
      el("span", { text: "INTRODUCIR TEXTO" }),
      el("span", { class: "console-keyboard-value", text: input.value || "_" }),
    ]);
    const keys = el("div", { class: "console-keyboard-grid" });
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789".split("").forEach((character) => {
      const key = el("button", { class: "console-keyboard-key", text: character });
      key.dataset.consoleKey = character;
      keys.appendChild(key);
    });
    const space = el("button", { class: "console-keyboard-key wide", text: "ESPACIO" });
    space.dataset.consoleKey = " ";
    const erase = el("button", { class: "console-keyboard-key", text: "⌫" });
    erase.dataset.consoleAction = "erase";
    const done = el("button", { class: "console-keyboard-key confirm", text: "LISTO" });
    done.dataset.consoleAction = "done";
    keys.append(space, erase, done);
    controllerKeyboard.append(heading, keys);
    appPanel.appendChild(controllerKeyboard);
    appControlIndex = 0;
    requestAnimationFrame(() => prepareAppControls());
  }

  function prepareAppControls() {
    const controls = appControls();
    controls.forEach((control, index) => {
      control.dataset.consoleControl = "true";
      if (control.tabIndex < 0) control.tabIndex = 0;
      control.classList.toggle("console-control-selected", index === appControlIndex);
      if (!control.dataset.consoleFocusBound) {
        control.addEventListener("focus", () => {
          const currentControls = appControls();
          const focusedIndex = currentControls.indexOf(control);
          if (focusedIndex >= 0) {
            appControlIndex = focusedIndex;
            currentControls.forEach((item, itemIndex) => item.classList.toggle("console-control-selected", itemIndex === focusedIndex));
          }
        });
        control.dataset.consoleFocusBound = "true";
      }
    });
    if (controls.length) {
      appControlIndex = Math.min(appControlIndex, controls.length - 1);
      focusAppControl(appControlIndex, false);
    }
  }

  function focusAppControl(index, shouldFocus = true) {
    const controls = appControls();
    if (!controls.length) return;
    appControlIndex = (index + controls.length) % controls.length;
    controls.forEach((control, itemIndex) => control.classList.toggle("console-control-selected", itemIndex === appControlIndex));
    const active = controls[appControlIndex];
    active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    if (shouldFocus) active.focus({ preventScroll: true });
  }

  function moveAppControl(delta) {
    const controls = appControls();
    if (!controls.length) return;
    focusAppControl(appControlIndex + delta);
  }

  function activateAppControl() {
    const controls = appControls();
    if (!controls.length) return;
    const active = controls[appControlIndex];
    if (controllerKeyboard) {
      const action = active.dataset.consoleAction;
      const key = active.dataset.consoleKey;
      if (action === "erase") controllerInput.value = controllerInput.value.slice(0, -1);
      else if (action === "done") closeControllerKeyboard();
      else if (key !== undefined) controllerInput.value += key;
      if (controllerInput) {
        controllerInput.dispatchEvent(new Event("input", { bubbles: true }));
        controllerInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const value = controllerKeyboard && controllerKeyboard.querySelector(".console-keyboard-value");
      if (value && controllerInput) value.textContent = controllerInput.value || "_";
    } else if (isTextControl(active)) openControllerKeyboard(active);
    else if (active.tagName === "INPUT" && /checkbox|radio/.test(active.type || "")) {
      if (active.type === "radio") active.checked = true;
      else active.checked = !active.checked;
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
    }
    else if (active.tagName === "SELECT") {
      active.selectedIndex = (active.selectedIndex + 1) % active.options.length;
      active.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (active.classList.contains("file-row")) active.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    else active.click();
    requestAnimationFrame(() => prepareAppControls());
  }

  function openFocusedTextKeyboard() {
    if (controllerKeyboard) return;
    const controls = appControls();
    const active = controls[appControlIndex];
    const target = isTextControl(active) ? active : controls.find((control) => isTextControl(control));
    if (target) openControllerKeyboard(target);
  }

  function openApp(appId, args) {
    const app = PyApps.ALL.find((entry) => entry.id === appId);
    if (!app) return;
    const pending = (app.permissions || []).filter((permission) => !PyStorage.permDecided(app.id, permission));
    if (pending.length) {
      PyOS.askPermissions(app, pending, () => mountApp(app, args));
      requestAnimationFrame(() => prepareAppControls());
    }
    else mountApp(app, args);
  }

  PyOS.setOpenAppFn(openApp);
  const recent = recentAppIds();
  carouselApps = PyApps.ALL.slice().sort((a, b) => {
    const ai = recent.indexOf(a.id); const bi = recent.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  if (recent[0]) {
    const latest = carouselApps[0];
    if (latest) { heroKicker.textContent = "Reanudar sesión"; heroTitle.textContent = latest.name; }
  }
  carouselApps.forEach((app, index) => {
    const tile = el("button", { class: "console-tile", tabIndex: "-1", role: "option" }, [
      el("span", { class: "console-tile-icon", text: app.icon }),
      el("span", { class: "console-tile-name", text: app.name }),
      el("span", { class: "console-tile-desc", text: app.description }),
    ]);
    tile.onclick = () => { selected = index; refreshSelection(); openApp(app.id); };
    tile.onfocus = () => { if (!currentApp && selected !== index) { selected = index; refreshSelection(); } };
    if (index === 0 && recent[0] === app.id) tile.appendChild(el("span", { class: "console-recent-badge", text: "ÚLTIMA SESIÓN" }));
    grid.appendChild(tile);
    tiles.push(tile);
  });
  refreshSelection();

  function move(delta) {
    if (currentApp || profilePanelOpen() || document.querySelector("#modal-layer .modal-overlay")) { moveAppControl(delta); return; }
    selected = (selected + delta + tiles.length) % tiles.length;
    refreshSelection();
    if (tiles[selected]) tiles[selected].focus({ preventScroll: true });
  }
  function accept() {
    if (currentApp || profilePanelOpen() || document.querySelector("#modal-layer .modal-overlay")) activateAppControl();
    else if (tiles[selected]) tiles[selected].click();
  }
  const pressed = {};
  const axes = { horizontal: 0, vertical: 0 };
  let activePadIndex = null;
  let suppressAcceptUntilRelease = !!window.__pyosSuppressGamepadUntilRelease;

  function activeGamepad() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    return pads.find((pad) => pad && pad.connected) || null;
  }

  function buttonDown(pad, index) {
    const button = pad && pad.buttons && pad.buttons[index];
    return !!(button && (button.pressed || button.value > 0.5));
  }

  function refreshControllerStatus(pad) {
    if (!pad) {
      activePadIndex = null;
      controllerStatus.textContent = "◌ CONECTA UN MANDO";
      controllerStatus.classList.remove("connected");
      return;
    }
    activePadIndex = pad.index;
    controllerStatus.textContent = "● MANDO LISTO";
    controllerStatus.classList.add("connected");
  }

  function cancelOrBack() {
    const cancel = document.querySelector("#modal-layer .modal-overlay button.ghost");
    if (controllerKeyboard) closeControllerKeyboard();
    else if (cancel) cancel.click();
    else if (profilePanelOpen()) hideProfilePanel();
    else closeApp();
  }

  window.addEventListener("gamepadconnected", (event) => refreshControllerStatus(event.gamepad));
  window.addEventListener("gamepaddisconnected", () => refreshControllerStatus(activeGamepad()));

  function gamepadLoop() {
    if (!document.body.contains(shell)) return;
    const pad = activeGamepad();
    if (pad) {
      if (activePadIndex !== pad.index) refreshControllerStatus(pad);
      const keyMap = [[14, -1], [15, 1], [12, -1], [13, 1]];
      keyMap.forEach(([button, amount]) => {
        const down = buttonDown(pad, button);
        if (down && !pressed[button]) move(amount);
        pressed[button] = down;
      });
      const acceptDown = buttonDown(pad, 0);
      if (!acceptDown) {
        suppressAcceptUntilRelease = false;
        window.__pyosSuppressGamepadUntilRelease = false;
      }
      if (acceptDown && !pressed.accept && !suppressAcceptUntilRelease) accept();
      pressed.accept = acceptDown;
      const backDown = buttonDown(pad, 1);
      if (backDown && !pressed.back) cancelOrBack();
      pressed.back = backDown;
      const keyboardDown = buttonDown(pad, 3);
      if (keyboardDown && !pressed.keyboard) openFocusedTextKeyboard();
      pressed.keyboard = keyboardDown;
      const guideDown = buttonDown(pad, 8) || buttonDown(pad, 9);
      if (guideDown && !pressed.guide && !currentApp && !profilePanelOpen()) showProfilePanel();
      pressed.guide = guideDown;
      const previousTabDown = buttonDown(pad, 4);
      if (previousTabDown && !pressed.previousTab && profilePanelOpen()) changeGuideTab(-1);
      pressed.previousTab = previousTabDown;
      const nextTabDown = buttonDown(pad, 5);
      if (nextTabDown && !pressed.nextTab && profilePanelOpen()) changeGuideTab(1);
      pressed.nextTab = nextTabDown;
      const horizontal = pad.axes && Math.abs(pad.axes[0] || 0) > 0.35 ? (pad.axes[0] > 0 ? 1 : -1) : 0;
      const vertical = pad.axes && Math.abs(pad.axes[1] || 0) > 0.35 ? (pad.axes[1] > 0 ? 1 : -1) : 0;
      if (horizontal && horizontal !== axes.horizontal) move(horizontal);
      if (vertical && vertical !== axes.vertical) move(vertical);
      axes.horizontal = horizontal;
      axes.vertical = vertical;
    } else {
      refreshControllerStatus(null);
      axes.horizontal = 0;
      axes.vertical = 0;
    }
    requestAnimationFrame(gamepadLoop);
  }
  requestAnimationFrame(gamepadLoop);
}
