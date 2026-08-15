/* console.js -- experiencia de sala para PyOS: panel amplio, teclado y control. */
function startConsole(buildApi, sys) {
  const { el } = PyApps;
  const rootEl = document.getElementById("app-root");
  rootEl.innerHTML = "";

  const shell = el("div", { class: "console-shell", tabindex: "0" });
  const header = el("header", { class: "console-header" });
  const identity = el("button", { class: "console-identity" });
  const modeTag = el("span", { class: "console-mode", text: "PYOS / CONSOLE" });
  const clock = el("span", { class: "console-clock" });
  header.append(identity, modeTag, clock);

  const hero = el("section", { class: "console-hero" });
  const heroKicker = el("p", { class: "console-kicker", text: "Sesión disponible" });
  const heroTitle = el("h1", { class: "console-title", text: "Sala PyOS" });
  const heroCopy = el("p", { class: "console-copy", text: "Una interfaz de pantalla grande para abrir herramientas, escribir comandos y cambiar de perfil local." });
  const hints = el("div", { class: "console-hints" }, [
    el("span", { text: "◉ Abrir" }),
    el("span", { text: "← → Navegar" }),
    el("span", { text: "◀ Volver" }),
  ]);
  hero.append(heroKicker, heroTitle, heroCopy, hints);

  const sectionLabel = el("div", { class: "console-section-label", text: "APLICACIONES / ENTRADA" });
  const grid = el("div", { class: "console-app-grid" });
  const appPanel = el("section", { class: "console-app-panel hidden" });
  const appBar = el("div", { class: "console-app-bar" });
  const backBtn = el("button", { class: "console-back", text: "◀ Volver a sala" });
  const appTitle = el("span", { class: "console-app-title" });
  appBar.append(backBtn, appTitle);
  const appContent = el("div", { class: "console-app-content" });
  appPanel.append(appBar, appContent);

  const footer = el("footer", { class: "console-footer" }, [
    el("span", { text: "PERFIL LOCAL · DATOS GUARDADOS EN ESTE NAVEGADOR" }),
    el("span", { class: "console-status", text: "● SISTEMA LISTO" }),
  ]);
  shell.append(header, hero, sectionLabel, grid, appPanel, footer);
  rootEl.appendChild(shell);

  let selected = 0;
  let currentApp = null;
  const tiles = [];

  function refreshIdentity() {
    const profile = PyStorage.getActiveProfile();
    identity.innerHTML = "";
    identity.append(
      el("span", { class: "console-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
      el("span", { class: "console-user", text: profile.name }),
      el("span", { class: "console-switch", text: "Cambiar" })
    );
  }
  identity.onclick = () => sys.switchProfile();

  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  tickClock();
  setInterval(tickClock, 1000);
  refreshIdentity();

  function refreshSelection() {
    tiles.forEach((tile, index) => tile.classList.toggle("selected", index === selected));
    const selectedTile = tiles[selected];
    if (selectedTile) selectedTile.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  function closeApp() {
    if (!currentApp) return;
    currentApp.destroyCallbacks.forEach((callback) => callback());
    currentApp = null;
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
    } catch (error) {
      appContent.appendChild(el("p", { class: "console-error", text: "La aplicación no pudo abrirse: " + error.message }));
    }
    grid.classList.add("console-grid-muted");
    hero.classList.add("console-hero-muted");
    appPanel.classList.remove("hidden");
    activateCallbacks.forEach((callback) => callback());
  }

  function openApp(appId, args) {
    const app = PyApps.ALL.find((entry) => entry.id === appId);
    if (!app) return;
    const pending = (app.permissions || []).filter((permission) => !PyStorage.permDecided(app.id, permission));
    if (pending.length) PyOS.askPermissions(app, pending, () => mountApp(app, args));
    else mountApp(app, args);
  }

  PyOS.setOpenAppFn(openApp);
  PyApps.ALL.forEach((app, index) => {
    const tile = el("button", { class: "console-tile", tabindex: "-1" }, [
      el("span", { class: "console-tile-icon", text: app.icon }),
      el("span", { class: "console-tile-name", text: app.name }),
      el("span", { class: "console-tile-desc", text: app.description }),
    ]);
    tile.onclick = () => { selected = index; refreshSelection(); openApp(app.id); };
    grid.appendChild(tile);
    tiles.push(tile);
  });
  refreshSelection();

  function move(delta) {
    if (currentApp) return;
    selected = (selected + delta + tiles.length) % tiles.length;
    refreshSelection();
  }
  function accept() {
    if (!currentApp && tiles[selected]) tiles[selected].click();
  }
  shell.addEventListener("keydown", (event) => {
    const editable = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName);
    if (editable) return;
    if (event.key === "ArrowRight" || event.key === "d") { event.preventDefault(); move(1); }
    else if (event.key === "ArrowLeft" || event.key === "a") { event.preventDefault(); move(-1); }
    else if (event.key === "ArrowDown" || event.key === "s") { event.preventDefault(); move(3); }
    else if (event.key === "ArrowUp" || event.key === "w") { event.preventDefault(); move(-3); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); accept(); }
    else if (event.key === "Escape" || event.key === "Backspace") { event.preventDefault(); closeApp(); }
  });
  shell.focus();

  const pressed = {};
  function gamepadLoop() {
    if (!document.body.contains(shell)) return;
    const pad = navigator.getGamepads && navigator.getGamepads()[0];
    if (pad) {
      const keyMap = [[14, -1], [15, 1], [12, -3], [13, 3]];
      keyMap.forEach(([button, amount]) => {
        const down = pad.buttons[button] && pad.buttons[button].pressed;
        if (down && !pressed[button]) move(amount);
        pressed[button] = down;
      });
      const acceptDown = pad.buttons[0] && pad.buttons[0].pressed;
      if (acceptDown && !pressed.accept) accept();
      pressed.accept = acceptDown;
      const backDown = pad.buttons[1] && pad.buttons[1].pressed;
      if (backDown && !pressed.back) closeApp();
      pressed.back = backDown;
    }
    requestAnimationFrame(gamepadLoop);
  }
  requestAnimationFrame(gamepadLoop);
}
