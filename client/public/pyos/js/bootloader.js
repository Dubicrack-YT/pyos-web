/* bootloader.js -- arranque controlado y recuperable de PyOS Web 2.3.0. */
(function () {
  "use strict";

  var VERSION = "2.3.0";
  var MODULES = ["storage.js", "hardware.js", "apps.js", "hardware-apps.js", "desktop.js", "touch.js", "console.js", "os.js"];
  var SCRIPT_BASE = document.currentScript && document.currentScript.src ? document.currentScript.src : new URL("./js/bootloader.js", window.location.href).href;
  var started = false;

  function root() {
    return document.getElementById("app-root");
  }

  function show(message, detail, failed) {
    var node = root();
    if (!node) return;
    node.innerHTML =
      '<main class="bootloader" role="status" aria-live="polite">' +
      '<div class="bootloader-mark">[PYOS]</div>' +
      '<h1>' + (failed ? "Recuperación del sistema" : "Iniciando PyOS") + '</h1>' +
      '<p class="bootloader-message">' + message + '</p>' +
      '<p class="bootloader-detail">' + (detail || ("Versión " + VERSION)) + '</p>' +
      '<div class="bootloader-progress" aria-hidden="true"><span></span></div>' +
      (failed ? '<button type="button" class="bootloader-retry">Reintentar</button>' : "") +
      '</main>';
    if (failed) {
      var retry = node.querySelector(".bootloader-retry");
      if (retry) retry.addEventListener("click", function () { window.location.reload(); });
    }
  }

  function fail(error) {
    var message = error && error.message ? error.message : String(error || "Error desconocido");
    show("PyOS no pudo cargar todos sus componentes.", message, true);
    window.dispatchEvent(new CustomEvent("pyos:boot-error", { detail: { error: message, version: VERSION } }));
  }

  function loadScript(name) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = new URL("./" + name + "?v=" + VERSION, SCRIPT_BASE).href;
      script.async = false;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("No se pudo cargar " + name)); };
      document.head.appendChild(script);
    });
  }

  function verifyRuntime() {
    if (!window.Promise || !window.URL || !document.querySelector) throw new Error("El navegador no es compatible");
    try {
      var probe = "__pyos_boot_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
    } catch (error) {
      // storage.js dispone de un fallback en memoria para este caso.
    }
  }

  function start() {
    if (started) return;
    started = true;
    try {
      verifyRuntime();
      show("Comprobando entorno…", "Bootloader " + VERSION);
    } catch (error) {
      fail(error);
      return;
    }
    MODULES.reduce(function (chain, name, index) {
      return chain.then(function () {
        show("Cargando " + name + "…", "Componente " + (index + 1) + " de " + MODULES.length);
        return loadScript(name);
      });
    }, Promise.resolve()).then(function () {
      window.dispatchEvent(new CustomEvent("pyos:boot-ready", { detail: { version: VERSION } }));
    }).catch(fail);
  }

  window.PyOSBoot = { version: VERSION, start: start };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
