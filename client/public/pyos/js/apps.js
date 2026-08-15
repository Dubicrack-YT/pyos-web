/* apps.js -- catalogo de apps de PyOS Web.
   Cada app: {id, name, icon, permissions: [...], description, render(el, api)}
   `render` recibe un <div> vacio (el contenedor de la ventana/pantalla) y
   la `api` (ver os.js) y arma su propia interfaz adentro. */

const PyApps = (() => {
  const PERMISSION_LABELS = {
    fs_read: "Leer archivos y carpetas de tu carpeta personal",
    fs_write: "Crear y modificar archivos en tu carpeta personal",
    fs_delete: "Eliminar archivos y carpetas de tu carpeta personal",
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  // ---------------------------------------------------------------
  const about = {
    id: "about",
    name: "Acerca de",
    icon: "i",
    permissions: [],
    description: "Informacion del sistema.",
    render(root, api) {
      root.appendChild(
        el("div", { class: "app-about" }, [
          el("h1", { text: "PyOS Web" }),
          el("p", { text: "version " + api.systemVersion() }),
          el("p", { text: "Un sistema operativo de juguete que corre 100% en tu navegador." }),
          el("p", { text: "Usuario actual: " + api.username() }),
          el("p", { class: "muted", text: "Todo se guarda en el almacenamiento local de este navegador -- nada sale de aca." }),
        ])
      );
    },
  };

  // ---------------------------------------------------------------
  const explorer = {
    id: "explorer",
    name: "Explorador",
    icon: "D",
    permissions: ["fs_read", "fs_write", "fs_delete"],
    description: "Navega, crea y borra archivos. Con 'Modo root' se ve todo el sistema.",
    render(root, api) {
      const state = { cwd: "", root: false };
      const top = el("div", { class: "row toolbar" });
      const pathLabel = el("span", { class: "path-label" });
      const modeLabel = el("span", { class: "mode-label" });
      const selectionLabel = el("span", { class: "muted small" });
      top.append(pathLabel, modeLabel, selectionLabel);

      const list = el("div", { class: "file-list" });

      const btns = el("div", { class: "row toolbar" });
      const btnOpen = el("button", { text: "Abrir" });
      const btnNew = el("button", { text: "Nueva carpeta" });
      const btnFile = el("button", { text: "Nuevo archivo" });
      const btnDel = el("button", { class: "danger", text: "Borrar seleccionado" });
      const btnRoot = el("button", { class: "warn", text: "Modo root" });
      const btnRefresh = el("button", { class: "ghost", text: "Actualizar" });
      btns.append(btnOpen, btnNew, btnFile, btnDel, btnRoot, btnRefresh);

      root.append(top, list, btns);

      let selected = null;

      const fsOps = () => (state.root ? api.rootFs : api.fs);
      const base = () => (state.root ? "/" : "/home/" + api.username());

      function refresh() {
        pathLabel.textContent = (base() + "/" + state.cwd).replace(/\/+/g, "/");
        modeLabel.textContent = state.root ? "ROOT" : "usuario";
        modeLabel.className = "mode-label" + (state.root ? " root" : "");
        btnRoot.textContent = state.root ? "Salir de root" : "Modo root";
        list.innerHTML = "";
        selected = null;
        selectionLabel.textContent = "Selecciona un archivo o carpeta";
        const entries = state.root ? api.rootFs.list(state.cwd) : api.fs.list(state.cwd);
        if (state.cwd) {
          list.appendChild(rowEl("..", true, () => {
            state.cwd = state.cwd.split("/").slice(0, -1).join("/");
            refresh();
          }));
        }
        (entries || []).forEach(([name, isDir]) => {
          if (name.startsWith(".") && !state.root) return;
          const full = state.cwd ? state.cwd + "/" + name : name;
          const rowNode = rowEl(name, isDir, () => openEntry({ name, isDir, full }));
          rowNode.addEventListener("click", (ev) => {
            list.querySelectorAll(".file-row.selected").forEach((n) => n.classList.remove("selected"));
            rowNode.classList.add("selected");
            selected = { name, isDir, full };
            selectionLabel.textContent = (isDir ? "Carpeta seleccionada: " : "Archivo seleccionado: ") + name;
            ev.stopPropagation();
          });
          list.appendChild(rowNode);
        });
      }

      function rowEl(name, isDir, onOpen) {
        const row = el("div", { class: "file-row" }, [
          el("span", { class: "file-icon", text: isDir ? "\u{1F4C1}" : "\u{1F4C4}" }),
          el("span", { text: name }),
        ]);
        row.addEventListener("dblclick", onOpen);
        return row;
      }

      function openEntry(entry) {
        if (!entry) {
          api.toast("Selecciona primero un archivo o carpeta.");
          return;
        }
        if (entry.isDir) {
          state.cwd = entry.full;
          refresh();
          return;
        }
        const content = state.root ? api.rootFs.read(entry.full) : api.fs.read(entry.full);
        if (content === null) api.toast("No se pudo abrir el archivo seleccionado.");
        else if (state.root) api.openApp("notepad", { path: entry.full, root: true });
        else api.openApp("notepad", { path: entry.full });
      }

      btnNew.onclick = () => {
        api.askString("Nueva carpeta", "Nombre de la carpeta:", (name) => {
          if (!name) return;
          const p = state.cwd ? state.cwd + "/" + name : name;
          if (state.root) api.rootFs.mkdir(p);
          else api.fs.mkdir(p);
          refresh();
        });
      };
      btnFile.onclick = () => {
        api.askString("Nuevo archivo", "Nombre del archivo:", (name) => {
          if (!name) return;
          const p = state.cwd ? state.cwd + "/" + name : name;
          if (state.root) api.rootFs.write(p, "");
          else api.fs.write(p, "");
          refresh();
        });
      };
      btnDel.onclick = () => {
        if (!selected) return;
        const warn = state.root ? "Esto es PERMANENTE (modo root)." : "Se movera a la papelera.";
        api.confirm("Confirmar", "Borrar '" + selected.name + "'? " + warn, (ok) => {
          if (!ok) return;
          if (state.root) api.rootFs.delete(selected.full);
          else api.fs.delete(selected.full);
          refresh();
        });
      };
      btnOpen.onclick = () => openEntry(selected);
      btnRoot.onclick = () => {
        if (state.root) {
          state.root = false;
          state.cwd = "";
          refresh();
          return;
        }
        if (!api.isRoot()) {
          api.toast("Necesitas ser root. Abri la Terminal y escribi 'su'.");
          return;
        }
        state.root = true;
        state.cwd = "";
        refresh();
      };
      btnRefresh.onclick = refresh;

      if (api.args && api.args.path) {
        state.cwd = api.args.path.split("/").slice(0, -1).join("/");
      }
      refresh();
    },
  };

  // ---------------------------------------------------------------
  const notepad = {
    id: "notepad",
    name: "Bloc de notas",
    icon: "N",
    permissions: ["fs_read", "fs_write"],
    description: "Edita archivos del perfil y, en modo root, archivos del sistema simulados.",
    render(root, api) {
      const state = { path: api.args && api.args.path, root: !!(api.args && api.args.root) };
      const textarea = el("textarea", { class: "notepad-area", spellcheck: "false" });
      const btns = el("div", { class: "row toolbar" });
      const btnSave = el("button", { text: "Guardar" });
      const statusEl = el("span", { class: "muted small" });
      btns.append(btnSave, statusEl);
      if (state.root) root.appendChild(el("div", { class: "banner warn", text: "Editor de sistema activo: los cambios afectan solo a esta simulación de PyOS. Los archivos críticos siguen protegidos." }));
      root.append(textarea, btns);

      const fileOps = () => state.root ? api.rootFs : api.fs;

      if (state.path) {
        const content = fileOps().read(state.path);
        if (content !== null) textarea.value = content;
        statusEl.textContent = (state.root ? "/" : "") + state.path;
      }

      function save(path) {
        const result = fileOps().write(path, textarea.value);
        if (result && result.ok === false) {
          api.toast(result.error || "No se pudo guardar el archivo de sistema.");
          return;
        }
        state.path = path;
        statusEl.textContent = "Guardado: " + (state.root ? "/" : "") + path;
        api.toast("Guardado: " + path);
      }

      btnSave.onclick = () => {
        if (state.path) {
          save(state.path);
        } else {
          api.askString("Guardar como", state.root ? "Ruta del sistema (ej: system/notas.txt):" : "Ruta relativa (ej: Documentos/nota.txt):", (p) => {
            if (p) save(p);
          });
        }
      };
    },
  };

  // ---------------------------------------------------------------
  const HELP_TEXT = [
    "Comandos disponibles:",
    "  ls              listar archivos",
    "  cd <carpeta>    cambiar de carpeta (.. para subir, / para la raiz)",
    "  cat <archivo>   ver contenido de un archivo",
    "  mkdir <nombre>  crear carpeta",
    "  touch <nombre>  crear archivo vacio",
    "  rm <nombre>     borrar archivo o carpeta",
    "  pwd             mostrar carpeta actual",
    "  whoami / id     usuario actual",
    "  profiles        listar cuentas locales simuladas",
    "  profile         ver el perfil activo",
    "  profile add <n> crear una cuenta local",
    "  profile switch  abrir el selector de cuentas",
    "  status          diagnostico del entorno actual",
    "  mode            mostrar el modo de interfaz activo",
    "  mode switch     elegir Escritorio, Táctil o Consola",
    "  su              solicitar superusuario a Root Manager",
    "  exit            cerrar la sesion root",
    "  root            abrir Root Manager y sus políticas",
    "  clear           limpiar pantalla",
    "  help            esta ayuda",
  ].join("\n");

  const terminal = {
    id: "terminal",
    name: "Terminal",
    icon: ">_",
    permissions: ["fs_read", "fs_write", "fs_delete"],
    description: "Consola de comandos con solicitudes de superusuario a Root Manager.",
    render(root, api) {
      const shellService = api.services().shell;
      if (!shellService || !shellService.enabled) {
        root.append(el("div", { class: "banner warn", text: "El servicio Shell está detenido. Abre Servicios root con una sesión aprobada para volver a iniciarlo." }));
        return;
      }
      const state = { cwd: "", history: [], histIdx: -1 };
      const out = el("div", { class: "term-out" });
      const inputRow = el("div", { class: "term-input-row" });
      const prompt = el("span", { class: "term-prompt" });
      const input = el("input", { type: "text", class: "term-input", autocomplete: "off", spellcheck: "false" });
      inputRow.append(prompt, input);
      root.append(out, inputRow);

      function println(s = "") {
        const line = el("div", { text: s });
        out.appendChild(line);
        out.scrollTop = out.scrollHeight;
      }
      println("PyOS Terminal 1.2 -- escribi 'help' para ver los comandos.");
      println("Perfil local: " + api.profile().name + " · Modo: " + api.currentMode());
      println("Modo usuario normal. Escribi 'root' para revisar privilegios o 'su' para solicitar acceso.");

      const fsOps = () => (api.isRoot() ? api.rootFs : api.fs);
      const base = () => (api.isRoot() ? "/" : "/home/" + api.username());
      function updatePrompt() {
        const shown = (base() + "/" + state.cwd).replace(/\/+/g, "/");
        prompt.textContent = shown + (api.isRoot() ? " # " : " $ ");
      }

      function execute(raw) {
        const parts = raw.split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);
        const fs = fsOps();
        api.log("comando: " + raw);

        if (cmd === "help") println(HELP_TEXT);
        else if (cmd === "pwd") println((base() + "/" + state.cwd).replace(/\/+/g, "/"));
        else if (cmd === "whoami") println(api.isRoot() ? "root" : api.username());
        else if (cmd === "id")
          println(api.isRoot() ? "root (acceso total al sistema PyOS)" : api.username() + " (usuario normal)");
        else if (cmd === "clear") out.innerHTML = "";
        else if (cmd === "profiles") {
          api.profiles().forEach((profile) => println((profile.id === api.profile().id ? "* " : "  ") + profile.name + "  @" + profile.username));
        } else if (cmd === "profile") {
          if (args[0] === "switch") {
            println("Abriendo selector de cuentas...");
            api.switchProfile();
          } else if (args[0] === "add") {
            const result = api.createProfile(args.slice(1).join(" "));
            println(result.ok ? "Cuenta local creada: " + result.profile.name + ". Usa 'profile switch' para entrar." : "profile: " + result.error);
          } else {
            const profile = api.profile();
            println("Perfil activo: " + profile.name + " (@" + profile.username + ")");
          }
        } else if (cmd === "mode") {
          if (args[0] === "switch") {
            println("Abriendo selector de modo...");
            api.switchMode();
          } else println("Modo de interfaz: " + api.currentMode());
        } else if (cmd === "status") {
          const stats = api.systemStats();
          println("PyOS " + stats.pyosVersion + " · perfil " + stats.profileName);
          println("Modo " + stats.mode + " · apps " + stats.appCount + " · ventanas " + stats.openWindows);
          println("Archivos " + stats.homeFileCount + " · disco simulado " + stats.diskUsage);
        }
        else if (cmd === "ls") {
          const entries = fs.list(state.cwd) || [];
          const shown = entries.filter(([n]) => api.isRoot() || !n.startsWith("."));
          if (!shown.length) println("(vacio)");
          else shown.forEach(([n, d]) => println((d ? "d " : "- ") + n));
        } else if (cmd === "cd") {
          if (!args.length || args[0] === "/" || args[0] === "~") state.cwd = "";
          else if (args[0] === "..") state.cwd = state.cwd.split("/").slice(0, -1).join("/");
          else {
            const target = state.cwd ? state.cwd + "/" + args[0] : args[0];
            if (fs.isDir(target)) state.cwd = target;
            else println("cd: no existe la carpeta '" + args[0] + "'");
          }
        } else if (cmd === "cat") {
          if (!args.length) println("uso: cat <archivo>");
          else {
            const target = state.cwd ? state.cwd + "/" + args[0] : args[0];
            const content = fs.read(target);
            println(content !== null ? content : "cat: no existe '" + args[0] + "'");
          }
        } else if (cmd === "mkdir") {
          if (!args.length) println("uso: mkdir <nombre>");
          else fs.mkdir(state.cwd ? state.cwd + "/" + args[0] : args[0]);
        } else if (cmd === "touch") {
          if (!args.length) println("uso: touch <nombre>");
          else fs.write(state.cwd ? state.cwd + "/" + args[0] : args[0], "");
        } else if (cmd === "rm") {
          if (!args.length) println("uso: rm <nombre>");
          else {
            const target = state.cwd ? state.cwd + "/" + args[0] : args[0];
            const res = fs.delete(target);
            if (!api.isRoot() && res) println("(se movio a la papelera)");
            else if (res && res.error) println(res.error);
          }
        } else if (cmd === "su") {
          if (api.isRoot()) println("Ya sos root.");
          else
            api.elevate((ok) => {
              if (ok) {
                state.cwd = "";
                println("Superusuario concedido por Root Manager. Escribi 'exit' para cerrar la sesión.");
              } else {
                println("Solicitud root no concedida. Abre 'root' para instalar o revisar el gestor.");
              }
              updatePrompt();
            });
        } else if (cmd === "root") {
          const manager = api.rootManager();
          if (args[0] === "status") println(manager.installed ? "Root Manager " + manager.version + " instalado · políticas " + Object.keys(manager.grants || {}).length : "Root Manager no instalado.");
          else { println("Abriendo Root Manager..."); api.openApp("rootmanager"); }
        } else if (cmd === "exit") {
          if (api.isRoot()) {
            api.logoutRoot();
            state.cwd = "";
            println("Cerraste la sesion root en todo PyOS.");
          } else println("No estas en modo root.");
        } else if (cmd === "passwd") {
          println("PyOS usa Root Manager con políticas por aplicación; no hay contraseña global que cambiar.");
        } else {
          println("comando no reconocido: '" + cmd + "' (escribi 'help')");
        }
        updatePrompt();
      }

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const raw = input.value.trim();
          input.value = "";
          if (raw) {
            state.history.push(raw);
            state.histIdx = state.history.length;
            println(prompt.textContent + raw);
            try {
              execute(raw);
            } catch (err) {
              println("Error interno: " + err);
            }
          }
        } else if (e.key === "ArrowUp") {
          if (state.histIdx > 0) {
            state.histIdx -= 1;
            input.value = state.history[state.histIdx] || "";
          }
          e.preventDefault();
        } else if (e.key === "ArrowDown") {
          if (state.histIdx < state.history.length) {
            state.histIdx += 1;
            input.value = state.history[state.histIdx] || "";
          }
          e.preventDefault();
        }
      });

      updatePrompt();
      api.onActivate(() => input.focus());
      setTimeout(() => input.focus(), 50);
    },
  };

  // ---------------------------------------------------------------
  const controlCenter = {
    id: "control",
    name: "Centro de control",
    icon: "◈",
    permissions: [],
    description: "Accesos rápidos a perfil, modo y configuración de PyOS.",
    render(root, api) {
      const profile = api.profile();
      const role = api.isAdmin() ? "Administradora" : "Estándar";
      const summary = el("div", { class: "control-summary" }, [
        el("div", { class: "control-avatar", text: profile.name.slice(0, 2).toUpperCase() }),
        el("div", {}, [el("h2", { text: profile.name }), el("p", { class: "muted", text: "Cuenta " + role + " · modo " + api.currentMode() })]),
      ]);
      const actions = el("div", { class: "control-actions" });
      const btnProfile = el("button", { text: "Cambiar cuenta" });
      const btnMode = el("button", { text: "Cambiar modo" });
      const btnAccounts = el("button", { text: "Administrar cuentas" });
      const btnPermissions = el("button", { class: "ghost", text: "Ver permisos" });
      btnProfile.onclick = () => api.switchProfile();
      btnMode.onclick = () => api.switchMode();
      btnAccounts.onclick = () => api.openApp("accounts");
      btnPermissions.onclick = () => api.openApp("settings");
      actions.append(btnProfile, btnMode, btnAccounts, btnPermissions);
      root.append(summary, el("p", { class: "muted", text: "Desde aquí puedes gestionar la sesión actual. Las cuentas estándar tienen sus propios archivos y preferencias, pero no modifican permisos globales." }), actions);
    },
  };

  const accounts = {
    id: "accounts",
    name: "Cuentas",
    icon: "U",
    permissions: [],
    description: "Crea, modifica o elimina cuentas locales simuladas.",
    render(root, api) {
      function renderAccounts() {
        root.innerHTML = "";
        const current = api.profile();
        const admin = api.isAdmin();
        const banner = el("div", { class: "banner " + (admin ? "ok" : "warn"), text: admin ? "Cuenta administradora: puedes crear, editar roles y eliminar perfiles locales." : "Cuenta estándar: puedes cambiar de perfil, pero no administrar otras cuentas." });
        root.appendChild(banner);
        const profileList = el("div", { class: "account-list" });
        api.profiles().forEach((profile) => {
          const card = el("div", { class: "account-card" });
          const info = el("div", {}, [
            el("strong", { text: profile.name + (profile.id === current.id ? " · activa" : "") }),
            el("span", { class: "muted small", text: "@" + profile.username + " · " + (profile.role === "admin" ? "Administradora" : "Estándar") }),
          ]);
          const actions = el("div", { class: "row account-actions" });
          const switchBtn = el("button", { class: "ghost", text: "Usar" });
          switchBtn.onclick = () => api.switchProfile();
          actions.appendChild(switchBtn);
          if (admin) {
            const renameBtn = el("button", { class: "ghost", text: "Renombrar" });
            const roleBtn = el("button", { class: "ghost", text: profile.role === "admin" ? "Hacer estándar" : "Hacer admin" });
            const deleteBtn = el("button", { class: "danger", text: "Eliminar" });
            renameBtn.onclick = () => api.askString("Renombrar cuenta", "Nuevo nombre para " + profile.name + ":", (name) => {
              if (!name) return;
              const result = api.updateProfile(profile.id, { name });
              api.toast(result.ok ? "Cuenta actualizada." : result.error);
              renderAccounts();
            }, profile.name);
            roleBtn.onclick = () => {
              const result = api.updateProfile(profile.id, { role: profile.role === "admin" ? "user" : "admin" });
              api.toast(result.ok ? "Rol actualizado." : result.error);
              renderAccounts();
            };
            deleteBtn.onclick = () => api.confirm("Eliminar cuenta", "Eliminar " + profile.name + " y todos sus archivos locales?", (ok) => {
              if (!ok) return;
              const wasCurrent = profile.id === current.id;
              const result = api.deleteProfile(profile.id);
              api.toast(result.ok ? "Cuenta eliminada." : result.error);
              if (result.ok && wasCurrent) api.switchProfile();
              else renderAccounts();
            });
            actions.append(renameBtn, roleBtn, deleteBtn);
          }
          card.append(info, actions);
          profileList.appendChild(card);
        });
        root.appendChild(profileList);
        if (!admin) return;
        const creator = el("div", { class: "account-create" });
        const nameInput = el("input", { class: "modal-input", type: "text", placeholder: "Nombre de nueva cuenta" });
        const roleSelect = el("select", { class: "modal-input" });
        roleSelect.append(el("option", { value: "user", text: "Usuario estándar" }), el("option", { value: "admin", text: "Administrador" }));
        const createBtn = el("button", { text: "+ Crear cuenta" });
        createBtn.onclick = () => {
          const result = api.createProfile(nameInput.value, roleSelect.value);
          api.toast(result.ok ? "Cuenta creada: " + result.profile.name : result.error);
          if (result.ok) renderAccounts();
        };
        creator.append(nameInput, roleSelect, createBtn);
        root.append(el("h3", { text: "Nueva cuenta local" }), creator);
      }
      renderAccounts();
    },
  };

  const tasksApp = {
    id: "tasks",
    name: "Tareas",
    icon: "✓",
    permissions: [],
    description: "Lista de tareas guardada solo para tu perfil local.",
    render(root, api) {
      function renderTasks() {
        root.innerHTML = "";
        const stored = api.getPreference("tasks", []);
        const tasks = Array.isArray(stored) ? stored : [];
        const input = el("input", { class: "modal-input", type: "text", placeholder: "Nueva tarea" });
        const addBtn = el("button", { text: "Añadir" });
        const form = el("div", { class: "row task-create" }, [input, addBtn]);
        const list = el("div", { class: "task-list" });
        const save = () => api.setPreference("tasks", tasks);
        addBtn.onclick = () => {
          const text = input.value.trim();
          if (!text) return;
          tasks.push({ id: Date.now().toString(36), text, done: false });
          save();
          renderTasks();
        };
        input.addEventListener("keydown", (event) => { if (event.key === "Enter") addBtn.click(); });
        if (!tasks.length) list.appendChild(el("p", { class: "muted", text: "Todavía no hay tareas en este perfil." }));
        tasks.forEach((task) => {
          const check = el("input", { type: "checkbox" });
          check.checked = !!task.done;
          const text = el("span", { class: task.done ? "task-done" : "", text: task.text });
          const remove = el("button", { class: "ghost", text: "Quitar" });
          check.onchange = () => { task.done = check.checked; save(); renderTasks(); };
          remove.onclick = () => { const index = tasks.findIndex((entry) => entry.id === task.id); tasks.splice(index, 1); save(); renderTasks(); };
          list.appendChild(el("div", { class: "task-row" }, [check, text, remove]));
        });
        root.append(el("h2", { text: "Tareas de " + api.profile().name }), form, list);
      }
      renderTasks();
    },
  };

  const journalApp = {
    id: "journal",
    name: "Bitácora",
    icon: "≡",
    permissions: [],
    description: "Notas rápidas guardadas en las preferencias del perfil.",
    render(root, api) {
      const area = el("textarea", { class: "notepad-area", spellcheck: "true", placeholder: "Escribe una nota para tu perfil…" });
      area.value = api.getPreference("journal", "");
      const status = el("span", { class: "muted small" });
      const save = el("button", { text: "Guardar nota" });
      save.onclick = () => { api.setPreference("journal", area.value); status.textContent = "Guardado en el perfil " + api.profile().name; };
      root.append(el("h2", { text: "Bitácora" }), area, el("div", { class: "row toolbar" }, [save, status]));
    },
  };

  const settingsApp = {
    id: "settings",
    name: "Permisos",
    icon: "S",
    permissions: [],
    description: "Revisa permisos por aplicación. Las cuentas administradoras pueden modificarlos.",
    render(root, api) {
      const banner = el("div", { class: "banner" });
      const body = el("div", { class: "row settings-body" });
      const left = el("div", { class: "app-list" });
      const right = el("div", { class: "app-detail" });
      body.append(left, right);
      root.append(banner, body);

      function refreshBanner() {
        if (api.isAdmin()) {
          banner.textContent = "Cuenta administradora: los cambios se guardan al instante para este perfil.";
          banner.className = "banner ok";
        } else {
          banner.textContent = "Cuenta estándar: puedes consultar permisos, pero solo un administrador puede modificarlos.";
          banner.className = "banner warn";
        }
      }

      const apps = api.listApps();
      function renderDetail(appInfo) {
        right.innerHTML = "";
        right.append(
          el("h3", { text: appInfo.name }),
          el("p", { class: "muted", text: appInfo.description || "" })
        );
        if (!appInfo.permissions.length) {
          right.appendChild(el("p", { class: "muted", text: "Esta app no solicita permisos." }));
          return;
        }
        appInfo.permissions.forEach((perm) => {
          const checked = api.permissionGranted(appInfo.id, perm);
          const cb = el("input", { type: "checkbox" });
          cb.checked = checked;
          cb.disabled = !api.isAdmin();
          cb.addEventListener("change", () => {
            if (!api.isAdmin()) {
              cb.checked = api.permissionGranted(appInfo.id, perm);
              api.toast("Solo una cuenta administradora puede modificar permisos.");
              refreshBanner();
              return;
            }
            api.setPermission(appInfo.id, perm, cb.checked);
          });
          const label = el("label", { class: "perm-row" }, [cb, document.createTextNode(" " + (PERMISSION_LABELS[perm] || perm))]);
          right.appendChild(label);
        });
      }

      apps.forEach((a) => {
        const item = el("div", { class: "app-list-item", text: a.icon + "  " + a.name });
        item.addEventListener("click", () => {
          left.querySelectorAll(".selected").forEach((n) => n.classList.remove("selected"));
          item.classList.add("selected");
          refreshBanner();
          renderDetail(a);
        });
        left.appendChild(item);
      });

      refreshBanner();
      if (apps.length) {
        left.firstChild.classList.add("selected");
        renderDetail(apps[0]);
      }
    },
  };

  // ---------------------------------------------------------------
  const trash = {
    id: "trash",
    name: "Papelera",
    icon: "T",
    permissions: ["fs_read", "fs_write", "fs_delete"],
    description: "Restaura o borra en forma permanente lo que borraste en el Explorador.",
    render(root, api) {
      root.appendChild(
        el("p", { class: "muted", text: "Lo que borras en el Explorador o la Terminal llega aca primero." })
      );
      const list = el("div", { class: "file-list" });
      const btns = el("div", { class: "row toolbar" });
      const btnRestore = el("button", { text: "Restaurar" });
      const btnPurgeOne = el("button", { class: "danger", text: "Borrar para siempre" });
      const btnPurgeAll = el("button", { class: "danger", text: "Vaciar papelera" });
      btns.append(btnRestore, btnPurgeOne, btnPurgeAll);
      root.append(list, btns);

      let selected = null;
      function refresh() {
        list.innerHTML = "";
        selected = null;
        const entries = api.fs.listTrash();
        if (!entries.length) {
          list.appendChild(el("div", { class: "muted", text: "(la papelera esta vacia)" }));
          return;
        }
        entries.forEach(([name, isDir]) => {
          const row = el("div", { class: "file-row" }, [
            el("span", { class: "file-icon", text: isDir ? "\u{1F4C1}" : "\u{1F4C4}" }),
            el("span", { text: name }),
          ]);
          row.addEventListener("click", () => {
            list.querySelectorAll(".selected").forEach((n) => n.classList.remove("selected"));
            row.classList.add("selected");
            selected = name;
          });
          list.appendChild(row);
        });
      }
      btnRestore.onclick = () => {
        if (!selected) return;
        if (api.fs.restoreFromTrash(selected)) {
          api.toast("Restaurado: " + selected);
          refresh();
        }
      };
      btnPurgeOne.onclick = () => {
        if (!selected) return;
        api.confirm("Borrar para siempre", "Esto no se puede deshacer. Borrar '" + selected + "'?", (ok) => {
          if (ok) {
            api.fs.purgeTrash(selected);
            refresh();
          }
        });
      };
      btnPurgeAll.onclick = () => {
        api.confirm("Vaciar papelera", "Borrar TODO el contenido de la papelera para siempre?", (ok) => {
          if (ok) {
            api.fs.purgeTrash(null);
            refresh();
          }
        });
      };
      refresh();
    },
  };

  // ---------------------------------------------------------------
  const calculator = {
    id: "calculator",
    name: "Calculadora",
    icon: "=",
    permissions: [],
    description: "Una calculadora simple, sin permisos especiales.",
    render(root, api) {
      const display = el("input", { type: "text", class: "calc-display", readonly: "readonly" });
      const grid = el("div", { class: "calc-grid" });
      root.append(display, grid);
      let expr = "";
      const buttons = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "C"];
      buttons.forEach((b) => {
        const btn = el("button", { class: "calc-btn", text: b });
        btn.onclick = () => {
          if (b === "C") expr = "";
          else if (b === "=") {
            try {
              if (/^[0-9.+\-*/() ]+$/.test(expr)) expr = String(Function('"use strict";return (' + expr + ")")());
              else expr = "error";
            } catch (e) {
              expr = "error";
            }
          } else expr += b;
          display.value = expr;
        };
        grid.appendChild(btn);
      });
    },
  };

  // ---------------------------------------------------------------
  const clock = {
    id: "clock",
    name: "Reloj y calendario",
    icon: "C",
    permissions: [],
    description: "Hora actual y calendario del mes.",
    render(root, api) {
      const timeEl = el("div", { class: "clock-time" });
      const dateEl = el("div", { class: "clock-date muted" });
      const cal = el("div", { class: "calendar-grid" });
      root.append(timeEl, dateEl, cal);

      const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
      let lastDay = null;
      function drawCalendar() {
        cal.innerHTML = "";
        const now = new Date();
        DIAS.forEach((d) => cal.appendChild(el("div", { class: "cal-head", text: d })));
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        let startCol = (first.getDay() + 6) % 7; // lunes=0
        for (let i = 0; i < startCol; i++) cal.appendChild(el("div", { class: "cal-cell empty" }));
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const cell = el("div", { class: "cal-cell" + (d === now.getDate() ? " today" : ""), text: String(d) });
          cal.appendChild(cell);
        }
      }
      function tick() {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString();
        dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        if (lastDay !== now.getDate()) {
          lastDay = now.getDate();
          drawCalendar();
        }
      }
      drawCalendar();
      tick();
      const iv = setInterval(tick, 1000);
      api.onDestroy(() => clearInterval(iv));
    },
  };

  // ---------------------------------------------------------------
  const sysmonitor = {
    id: "sysmonitor",
    name: "Monitor del sistema",
    icon: "M",
    permissions: [],
    description: "Info real de tu navegador y el uso de almacenamiento de PyOS.",
    render(root, api) {
      const table = el("div", { class: "stat-table" });
      root.appendChild(table);
      const stats = api.systemStats();
      const rows = [
        ["Navegador:", stats.userAgent],
        ["Plataforma:", stats.platform],
        ["Usuario:", stats.username],
        ["Version PyOS:", stats.pyosVersion],
        ["Apps instaladas:", String(stats.appCount)],
        ["Ventanas/paneles abiertos:", String(stats.openWindows)],
        ["Archivos en tu carpeta:", String(stats.homeFileCount)],
        ["Almacenamiento usado:", stats.diskUsage],
        ["Instalado el:", stats.installedAt],
      ];
      rows.forEach(([label, value]) => {
        table.appendChild(
          el("div", { class: "stat-row" }, [el("span", { class: "muted", text: label }), el("span", { class: "accent", text: value })])
        );
      });
      root.appendChild(
        el("p", { class: "muted small", text: "Estos datos son reales de tu navegador, no simulados." })
      );
    },
  };

  // ---------------------------------------------------------------
  const FAKE_VIRUSES = [
    ["trollware_clasico.virus", "Trollware Clasico", "Te tira mensajes molestos cada tanto."],
    ["gusano_de_juguete.virus", "Gusano de juguete", "Se autocopia por tu carpeta personal."],
    ["ransomware_de_broma.virus", "Ransomware de broma", "Te bloquea los iconos del escritorio."],
    ["troyano_gatito.virus", "Troyano Gatito", "Le cambia el color al escritorio y llena todo de gatos."],
    ["spyware_curioso.virus", "Spyware Curioso", "Registra actividad en la consola del navegador."],
  ];
  const SIGNATURE = "PYOS-FAKE-VIRUS-SIGNATURE";

  const virusstore = {
    id: "virusstore",
    name: "Zona de descargas (dudosa)",
    icon: "!",
    permissions: ["fs_write"],
    description: "Descarga 'virus' de mentira a tu carpeta Descargas para cazarlos con el Antivirus.",
    render(root, api) {
      root.appendChild(
        el("p", { class: "warn-text", text: "Estos 'virus' son archivos de texto sin ningun codigo real. Sirven para practicar con el Antivirus." })
      );
      FAKE_VIRUSES.forEach(([fname, name, desc]) => {
        const row = el("div", { class: "virus-row" });
        row.append(
          el("div", { class: "virus-info" }, [el("strong", { text: name }), el("div", { class: "muted small", text: desc })])
        );
        const btn = el("button", { text: "Descargar" });
        btn.onclick = () => {
          const content = SIGNATURE + ": " + name + "\n\nArchivo de juguete para practicar con el Antivirus de PyOS.\n";
          api.fs.write("Descargas/" + fname, content);
          api.toast("Descargado: " + fname);
        };
        row.appendChild(btn);
        root.appendChild(row);
      });
    },
  };

  const antivirus = {
    id: "antivirus",
    name: "Antivirus PyOS",
    icon: "AV",
    permissions: ["fs_read", "fs_write", "fs_delete"],
    description: "Escanea tu carpeta personal en busca de los virus de juguete de la Zona de descargas.",
    render(root, api) {
      if (api.isRoot()) {
        root.appendChild(
          el("p", { class: "warn-text danger", text: "La sesion root esta activa en todo PyOS ahora mismo. Si no la estas usando, escribi 'exit' en la Terminal." })
        );
      }
      const status = el("p", { class: "muted", text: "Sin escanear todavia." });
      const list = el("div", { class: "file-list" });
      const btns = el("div", { class: "row toolbar" });
      const btnScan = el("button", { text: "Escanear" });
      const btnQuarantine = el("button", { class: "warn", text: "Poner en cuarentena" });
      const btnDelete = el("button", { class: "danger", text: "Eliminar para siempre" });
      btns.append(btnScan, btnQuarantine, btnDelete);
      root.append(status, list, btns);

      let found = [];
      let selected = null;

      function scan() {
        found = [];
        list.innerHTML = "";
        selected = null;
        api.fs.walkHome().forEach(({ path, content }) => {
          if (content && content.includes(SIGNATURE)) {
            let threat = "virus desconocido";
            const line = content.split("\n").find((l) => l.includes(SIGNATURE));
            if (line) threat = line.split(":").slice(1).join(":").trim();
            found.push({ path, threat });
          }
        });
        if (!found.length) {
          status.textContent = "Escaneo completo: no se encontraron amenazas.";
          list.appendChild(el("div", { class: "muted", text: "(tu carpeta esta limpia)" }));
        } else {
          status.textContent = "Escaneo completo: " + found.length + " amenaza(s) encontrada(s).";
          found.forEach((f) => {
            const row = el("div", { class: "file-row threat" }, [
              el("span", { text: "\u26A0\uFE0F " + f.threat + "  ->  " + f.path }),
            ]);
            row.addEventListener("click", () => {
              list.querySelectorAll(".selected").forEach((n) => n.classList.remove("selected"));
              row.classList.add("selected");
              selected = f;
            });
            list.appendChild(row);
          });
        }
      }

      btnScan.onclick = scan;
      btnQuarantine.onclick = () => {
        if (!selected) return;
        api.fs.delete(selected.path);
        api.toast("En cuarentena: " + selected.threat);
        scan();
      };
      btnDelete.onclick = () => {
        if (!selected) return;
        api.confirm("Eliminar para siempre", "Eliminar '" + selected.threat + "' sin pasar por la papelera?", (ok) => {
          if (!ok) return;
          const name = selected.path.split("/").pop();
          api.fs.delete(selected.path);
          api.fs.purgeTrash(name);
          api.toast("Eliminado para siempre: " + selected.threat);
          scan();
        });
      };
      scan();
    },
  };

  const snippetsApp = {
    id: "snippets",
    name: "Atajos",
    icon: "⌘",
    permissions: [],
    description: "Guarda fragmentos y accesos rápidos para tu perfil local.",
    render(root, api) {
      function draw() {
        root.innerHTML = "";
        const snippets = api.getPreference("snippets", []);
        const input = el("input", { class: "modal-input", type: "text", placeholder: "Nuevo atajo o fragmento" });
        const add = el("button", { text: "Guardar" });
        const list = el("div", { class: "task-list" });
        add.onclick = () => {
          if (!input.value.trim()) return;
          snippets.push({ id: Date.now().toString(36), text: input.value.trim() });
          api.setPreference("snippets", snippets);
          draw();
        };
        if (!snippets.length) list.appendChild(el("p", { class: "muted", text: "Aún no guardaste atajos en este perfil." }));
        snippets.forEach((snippet) => {
          const copy = el("button", { class: "ghost", text: "Copiar" });
          const remove = el("button", { class: "ghost", text: "Quitar" });
          copy.onclick = () => navigator.clipboard && navigator.clipboard.writeText(snippet.text).then(() => api.toast("Atajo copiado."));
          remove.onclick = () => { api.setPreference("snippets", snippets.filter((entry) => entry.id !== snippet.id)); draw(); };
          list.appendChild(el("div", { class: "task-row" }, [el("span", { text: snippet.text }), copy, remove]));
        });
        root.append(el("h2", { text: "Atajos" }), el("div", { class: "row task-create" }, [input, add]), list);
      }
      draw();
    },
  };

  const focusApp = {
    id: "focus",
    name: "Temporizador",
    icon: "◷",
    permissions: [],
    description: "Un temporizador de enfoque local para sesiones cortas.",
    render(root, api) {
      let seconds = 25 * 60;
      let timer = null;
      const display = el("div", { class: "clock-time" });
      const status = el("p", { class: "muted", text: "Listo para una sesión de 25 minutos." });
      const start = el("button", { text: "Iniciar" });
      const reset = el("button", { class: "ghost", text: "Reiniciar" });
      const render = () => { display.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0"); };
      start.onclick = () => {
        if (timer) return;
        status.textContent = "Sesión en curso…";
        timer = setInterval(() => {
          seconds -= 1;
          render();
          if (seconds <= 0) { clearInterval(timer); timer = null; status.textContent = "Sesión completada."; api.toast("Temporizador finalizado."); }
        }, 1000);
      };
      reset.onclick = () => { if (timer) clearInterval(timer); timer = null; seconds = 25 * 60; status.textContent = "Listo para una sesión de 25 minutos."; render(); };
      api.onDestroy(() => { if (timer) clearInterval(timer); });
      render();
      root.append(el("h2", { text: "Temporizador" }), display, status, el("div", { class: "row toolbar" }, [start, reset]));
    },
  };

  const orbitalApp = {
    id: "orbital",
    name: "Orbital",
    icon: "◎",
    permissions: [],
    description: "Un minijuego local de reflejos con récord por perfil.",
    render(root, api) {
      let score = 0;
      const best = Number(api.getPreference("orbital_best", 0)) || 0;
      const scoreEl = el("div", { class: "clock-time", text: "0" });
      const bestEl = el("p", { class: "muted", text: "Récord del perfil: " + best });
      const target = el("button", { class: "orbital-target", text: "◎" });
      const hint = el("p", { class: "muted", text: "Pulsa el núcleo para aumentar el puntaje." });
      target.onclick = () => {
        score += 1;
        scoreEl.textContent = String(score);
        if (score > best) { api.setPreference("orbital_best", score); bestEl.textContent = "Nuevo récord: " + score; }
        target.style.transform = "translate(" + (Math.random() * 90 - 45) + "px," + (Math.random() * 50 - 25) + "px)";
      };
      root.append(el("h2", { text: "Orbital" }), scoreEl, bestEl, target, hint);
    },
  };

  const deviceInfo = {
    id: "deviceinfo",
    name: "Device Info",
    icon: "DI",
    permissions: [],
    description: "Inventario y telemetría simulada de CPU, GPU, memoria y almacenamiento.",
    render(root, api) {
      const hardware = api.deviceProfile();
      const cpuModel = hardware.cpu || "AMD Ryzen 7 7800X3D";
      const gpuModel = hardware.gpu || "NVIDIA GeForce RTX 4070 SUPER";
      const memoryGb = Number(hardware.memory_gb) || 32;
      const storageGb = Number(hardware.storage_gb) || 1024;
      const header = el("div", { class: "device-header" }, [
        el("div", { class: "device-chip", text: "PYOS / HARDWARE SIMULADO" }),
        el("h2", { text: "Device Info" }),
        el("p", { class: "muted", text: "Este panel representa un equipo virtual de PyOS; no lee el hardware físico del navegador." }),
      ]);
      const metrics = el("div", { class: "device-metrics" });
      const detail = el("div", { class: "device-detail" });
      root.append(header, metrics, detail);
      const components = [
        { label: "CPU", model: cpuModel, meta: "8 núcleos · 16 hilos · AM5 · 4.2 GHz base", key: "cpu" },
        { label: "GPU", model: gpuModel, meta: "12 GB GDDR6X · Ray Tracing · Driver 555.85 simulado", key: "gpu" },
        { label: "RAM", model: memoryGb + " GB DDR5-6000", meta: "2 × " + (memoryGb / 2) + " GB · doble canal · 6000 MT/s", key: "ram" },
        { label: "ALM", model: (storageGb / 1024).toFixed(0) + " TB NVMe PCIe 4.0", meta: "Volumen PyOS · sistema de archivos local simulado", key: "storage" },
      ];
      components.forEach((component) => {
        detail.appendChild(el("article", { class: "device-component" }, [
          el("span", { class: "device-component-label", text: component.label }),
          el("strong", { text: component.model }),
          el("p", { class: "muted", text: component.meta }),
        ]));
      });
      const seed = api.profile().username.length * 11;
      function metric(label, value, note, percent) {
        const card = el("div", { class: "device-metric" });
        card.append(el("span", { text: label }), el("strong", { text: value }), el("small", { text: note }));
        const track = el("div", { class: "device-bar" });
        const fill = el("i" );
        fill.style.width = Math.max(4, Math.min(96, percent)) + "%";
        track.appendChild(fill);
        card.appendChild(track);
        return card;
      }
      function update() {
        const telemetry = api.services().telemetry;
        if (!telemetry || !telemetry.enabled) {
          metrics.innerHTML = "";
          metrics.append(metric("CPU AMD", "PAUSA", "Servicio de telemetría detenido", 0), metric("GPU NVIDIA", "PAUSA", "Servicio de telemetría detenido", 0), metric("RAM DDR5", "PAUSA", "Servicio de telemetría detenido", 0), metric("NVMe", "PAUSA", "Servicio de telemetría detenido", 0));
          return;
        }
        const t = Date.now() / 1000;
        const cpu = Math.round(18 + (Math.sin(t * 0.8 + seed) + 1) * 17);
        const gpu = Math.round(11 + (Math.cos(t * 0.65 + seed) + 1) * 13);
        const ram = memoryGb * (0.29 + ((Math.sin(t * 0.35) + 1) * 0.022));
        const gpuTemp = Math.round(41 + gpu * 0.3);
        const storage = storageGb * (0.305 + ((Math.cos(t * 0.08) + 1) * 0.0002));
        metrics.innerHTML = "";
        metrics.append(
          metric("CPU AMD", cpu + "%", "4.6 GHz · " + (49 + Math.round(cpu * .18)) + " °C", cpu),
          metric("GPU NVIDIA", gpu + "%", "" + gpuTemp + " °C · 1.9 GHz", gpu),
          metric("RAM DDR5", ram.toFixed(1) + " / " + memoryGb + " GB", "" + Math.round(ram / memoryGb * 100) + "% en uso", ram / memoryGb * 100),
          metric("NVMe", storage.toFixed(1) + " / " + storageGb + " GB", "" + Math.round(storage / storageGb * 100) + "% utilizado", storage / storageGb * 100)
        );
      }
      update();
      const interval = setInterval(update, 1000);
      api.onDestroy(() => clearInterval(interval));
    },
  };

  const themeStudio = {
    id: "themes",
    name: "Theme Studio",
    icon: "✦",
    permissions: [],
    description: "Personaliza el color operativo y el aspecto de tu perfil PyOS.",
    render(root, api) {
      const presets = [
        ["Fósforo", "#39ff14"],
        ["Cobalto", "#69a9ff"],
        ["Ámbar", "#ffbd59"],
        ["Coral", "#ff776b"],
      ];
      const current = api.getPreference("accent_color", "#39ff14");
      const swatches = el("div", { class: "theme-swatches" });
      const status = el("p", { class: "muted", text: "Color activo: " + current });
      presets.forEach(([name, color]) => {
        const btn = el("button", { class: "theme-swatch", text: name });
        btn.style.borderColor = color;
        btn.style.color = color;
        btn.onclick = () => {
          api.setPreference("accent_color", color);
          document.documentElement.style.setProperty("--accent", color);
          status.textContent = "Color activo: " + name;
          api.toast("Tema aplicado a este perfil.");
        };
        swatches.appendChild(btn);
      });
      root.append(el("h2", { text: "Theme Studio" }), el("p", { class: "muted", text: "La personalización se guarda por perfil y se aplica al reiniciar PyOS." }), swatches, status);
    },
  };

  const serviceManager = {
    id: "services",
    name: "Servicios root",
    icon: "R",
    permissions: [],
    description: "Panel root para revisar y alternar servicios simulados de PyOS.",
    render(root, api) {
      if (!api.isAdmin() || !api.isRoot()) {
        root.append(el("div", { class: "banner warn", text: "Esta aplicación necesita una cuenta administradora y una sesión root aprobada desde Root Manager." }));
        return;
      }
      const services = api.services();
      const list = el("div", { class: "task-list" });
      const save = () => api.setServices(services);
      Object.keys(services).forEach((id) => {
        const service = services[id];
        const check = el("input", { type: "checkbox" });
        check.checked = !!service.enabled;
        const state = el("span", { class: "accent", text: service.enabled ? "ACTIVO" : "DETENIDO" });
        check.onchange = () => { service.enabled = check.checked; save(); api.logSystemEvent("service", service.label + " " + (check.checked ? "iniciado" : "detenido")); state.textContent = check.checked ? "ACTIVO" : "DETENIDO"; };
        list.appendChild(el("div", { class: "task-row" }, [check, el("span", { text: service.label + " · " + service.detail }), state]));
      });
      const restart = el("button", { class: "ghost", text: "Reiniciar todos" });
      restart.onclick = () => { Object.keys(services).forEach((id) => { services[id].enabled = true; }); save(); api.logSystemEvent("service", "Todos los servicios simulados fueron reiniciados"); api.refreshApps(); };
      root.append(el("div", { class: "banner ok", text: "Sesión root verificada. Estos controles afectan PyStore y Device Info dentro de esta simulación." }), el("h2", { text: "Servicios root" }), list, el("div", { class: "row toolbar" }, [restart]));
    },
  };

  const rootManager = {
    id: "rootmanager",
    name: "Root Manager",
    icon: "RM",
    permissions: [],
    description: "Gestor local de superusuario con estado y políticas por aplicación.",
    render(root, api) {
      if (!api.isAdmin()) {
        root.append(el("div", { class: "banner warn", text: "Solo una cuenta administradora puede instalar o administrar el gestor root." }));
        return;
      }
      function draw() {
        root.innerHTML = "";
        const manager = api.rootManager();
        const status = el("div", { class: "root-manager-status " + (manager.installed ? "installed" : "" ) }, [
          el("span", { text: manager.installed ? "ROOT / ACTIVO" : "ROOT / NO INSTALADO" }),
          el("strong", { text: manager.installed ? "Gestor de privilegios listo" : "Instala el gestor para administrar superusuario" }),
          el("p", { class: "muted", text: manager.installed ? "Canal " + manager.channel + " · versión " + manager.version + " · políticas por aplicación" : "La instalación es una simulación local y no modifica el dispositivo real." }),
        ]);
        root.append(status);
        if (!manager.installed) {
          const install = el("button", { text: "Instalar gestor root" });
          install.onclick = () => {
            manager.installed = true; manager.version = "1.0.0"; manager.installed_at = new Date().toISOString(); manager.grants = {};
            api.updateRootManager(manager); api.logSystemEvent("root", "Root Manager instalado por " + api.profile().username); api.toast("Gestor root instalado. Las apps ahora solicitarán privilegios."); draw();
          };
          root.append(el("p", { class: "muted", text: "Después de instalarlo, Terminal, Servicios root y Logs root pedirán acceso mediante una aprobación explícita." }), install);
          return;
        }
        const controls = el("div", { class: "row toolbar" });
        const closeRoot = el("button", { class: "ghost", text: "Cerrar sesión root" });
        closeRoot.onclick = () => { api.logoutRoot(); api.toast("Sesión root cerrada."); draw(); };
        const uninstall = el("button", { class: "danger", text: "Desinstalar" });
        uninstall.onclick = () => api.confirm("Desinstalar gestor root", "Se eliminarán las políticas guardadas de superusuario.", (ok) => { if (!ok) return; api.updateRootManager({ installed: false, grants: {} }); api.logoutRoot(); api.logSystemEvent("root", "Root Manager desinstalado"); draw(); });
        controls.append(closeRoot, uninstall);
        const list = el("div", { class: "account-list" });
        api.listApps().filter((app) => app.id !== "rootmanager").forEach((app) => {
          const row = el("div", { class: "account-card" });
          const select = el("select", { class: "modal-input" });
          select.append(el("option", { value: "ask", text: "Preguntar" }), el("option", { value: "allow", text: "Permitir siempre" }));
          select.value = manager.grants[app.id] === "allow" ? "allow" : "ask";
          select.onchange = () => { if (select.value === "allow") manager.grants[app.id] = "allow"; else delete manager.grants[app.id]; api.updateRootManager(manager); api.logSystemEvent("root", "Política actualizada: " + app.name + " · " + select.value); };
          row.append(el("div", {}, [el("strong", { text: app.name }), el("span", { class: "muted small", text: "Solicitud de superusuario" })]), select);
          list.appendChild(row);
        });
        root.append(el("h2", { text: "Políticas de superusuario" }), el("p", { class: "muted", text: "Permitir siempre evita preguntas futuras para esa aplicación. El acceso continúa siendo una simulación local." }), list, controls);
      }
      draw();
    },
  };

  const logViewer = {
    id: "logs",
    name: "Logs root",
    icon: "≣",
    permissions: [],
    description: "Consulta el registro de arranque y actividades del sistema simulado.",
    render(root, api) {
      if (!api.isAdmin() || !api.isRoot()) {
        root.append(el("div", { class: "banner warn", text: "Activa modo root con una cuenta administradora para consultar los registros del sistema." }));
        return;
      }
      const output = el("div", { class: "log-output" });
      const render = () => {
        output.innerHTML = "";
        const events = api.systemEvents();
        if (!events.length) output.appendChild(el("p", { class: "muted", text: "No hay eventos todavía." }));
        events.forEach((event) => output.appendChild(el("div", { class: "log-row" }, [el("span", { text: event.at.slice(11, 19) + " · " + event.type.toUpperCase() }), el("strong", { text: event.message })])));
      };
      const append = el("button", { text: "Generar diagnóstico" });
      const refresh = el("button", { class: "ghost", text: "Actualizar" });
      append.onclick = () => { api.logSystemEvent("diagnostic", "Diagnóstico manual ejecutado: " + Object.keys(api.services()).filter((id) => api.services()[id].enabled).length + " servicios activos"); render(); };
      refresh.onclick = render;
      root.append(el("h2", { text: "Logs root" }), el("p", { class: "muted", text: "Historial persistente de sesiones, privilegios, servicios e instalaciones de PyOS." }), output, el("div", { class: "row toolbar" }, [append, refresh]));
      render();
    },
  };

  const OPTIONAL_APPS = [snippetsApp, focusApp, orbitalApp, themeStudio, serviceManager, logViewer];
  const STORE_CATALOG = [
    { id: "snippets", category: "Productividad", note: "Fragmentos, enlaces y atajos locales." },
    { id: "focus", category: "Bienestar", note: "Sesiones de enfoque sin conexión." },
    { id: "orbital", category: "Juegos", note: "Un desafío de reflejos guardado por perfil." },
    { id: "themes", category: "Personalización", note: "Acentos visuales guardados por perfil." },
    { id: "services", category: "Herramientas root", note: "Panel de servicios simulados para administradores.", requiresAdmin: true },
    { id: "logs", category: "Herramientas root", note: "Consulta y registra eventos del sistema simulado.", requiresAdmin: true },
  ];

  const pyStore = {
    id: "pystore",
    name: "PyStore",
    icon: "▣",
    permissions: [],
    description: "Catálogo local para instalar aplicaciones adicionales en este perfil.",
    render(root, api) {
      let selectedCategory = "Todas";
      function draw() {
        root.innerHTML = "";
        const installed = api.getPreference("installed_apps", []);
        const storeOnline = api.services().store && api.services().store.enabled;
        const categories = ["Todas"].concat(Array.from(new Set(STORE_CATALOG.map((entry) => entry.category))));
        const filters = el("div", { class: "store-filters" });
        categories.forEach((category) => {
          const filter = el("button", { class: "ghost" + (category === selectedCategory ? " selected" : ""), text: category });
          filter.onclick = () => { selectedCategory = category; draw(); };
          filters.appendChild(filter);
        });
        const list = el("div", { class: "store-list" });
        root.append(el("h2", { text: "PyStore" }), el("p", { class: "muted", text: storeOnline ? "Las instalaciones se guardan solo para " + api.profile().name + ". No descargan contenido externo." : "El servicio de catálogo está detenido. Puedes revisar el catálogo, pero no instalar aplicaciones." }), filters, list);
        STORE_CATALOG.filter((entry) => selectedCategory === "Todas" || entry.category === selectedCategory).forEach((entry) => {
          const app = OPTIONAL_APPS.find((candidate) => candidate.id === entry.id);
          const active = installed.indexOf(entry.id) !== -1;
          const blocked = !storeOnline || (!!entry.requiresAdmin && !api.isAdmin());
          const card = el("article", { class: "store-card" }, [
            el("div", { class: "store-icon", text: app.icon }),
            el("div", { class: "store-copy" }, [el("strong", { text: app.name }), el("span", { text: entry.category + (entry.requiresAdmin ? " · ROOT" : "") }), el("p", { class: "muted", text: entry.note })]),
          ]);
          const action = el("button", { class: active ? "danger" : "", text: !storeOnline ? "Servicio detenido" : blocked ? "Requiere admin" : active ? "Desinstalar" : "Instalar" });
          action.disabled = blocked;
          action.onclick = () => {
            const next = active ? installed.filter((id) => id !== entry.id) : installed.concat(entry.id);
            api.setPreference("installed_apps", next);
            api.logSystemEvent("store", app.name + (active ? " desinstalada desde PyStore" : " instalada desde PyStore"));
            api.toast(active ? app.name + " desinstalada." : app.name + " instalada.");
            setTimeout(() => api.refreshApps(), 220);
          };
          card.appendChild(action);
          list.appendChild(card);
        });
      }
      draw();
    },
  };

  const CORE_APPS = [about, controlCenter, accounts, rootManager, deviceInfo, explorer, notepad, journalApp, tasksApp, terminal, settingsApp, pyStore, trash, calculator, clock, sysmonitor, virusstore, antivirus];
  function allApps() {
    const installed = PyStorage.getPreference("installed_apps", []);
    const ids = Array.isArray(installed) ? installed : [];
    return CORE_APPS.concat(OPTIONAL_APPS.filter((app) => ids.indexOf(app.id) !== -1));
  }

  return { get ALL() { return allApps(); }, CORE_APPS, OPTIONAL_APPS, STORE_CATALOG, PERMISSION_LABELS, SIGNATURE, FAKE_VIRUSES, el };
})();
