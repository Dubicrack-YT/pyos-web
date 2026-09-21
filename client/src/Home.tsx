/* Diseño PyOS: consola lateral + panel operativo; verde fósforo reservado a estados y acciones. */
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Clipboard, ExternalLink, MonitorCog, RotateCcw, ShieldCheck, Smartphone, Settings2, Trash2, Users, X } from "lucide-react";

const APP_PATH = "./pyos/index.html";
const CONFIG_PATH = "./pyos/config.html";
const ASSETS = {
  logo: "./pyos/icons/icon-192.png",
  install: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1500&q=85",
};

function StatusLine({ label, value }: { label: string; value: string }) {
  return <div className="status-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStatus, setResetStatus] = useState("");
  const installUrl = useMemo(() => typeof window === "undefined" ? APP_PATH : new URL(APP_PATH, window.location.href).toString(), []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const openPyOS = () => window.open(APP_PATH, "_blank", "noopener,noreferrer");
  const openConfig = () => window.open(CONFIG_PATH, "_blank", "noopener,noreferrer");
  const copyInstallUrl = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copia este enlace para instalar PyOS:", installUrl);
    }
  };
  const clearPyOSData = async () => {
    try {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith("pyos_")) keys.push(key);
      }
      keys.forEach((key) => window.localStorage.removeItem(key));
      if ("caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.filter((key) => key.startsWith("pyos-web-")).map((key) => window.caches.delete(key)));
      }
      setResetOpen(false);
      setResetStatus("Datos de PyOS eliminados. Al abrirlo de nuevo, comenzará como una instalación limpia.");
    } catch {
      setResetOpen(false);
      setResetStatus("No se pudieron eliminar todos los datos. Cierra PyOS e inténtalo nuevamente desde este navegador.");
    }
  };

  return (
    <div className="pyos-portal">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="site-header">
        <a className="brand-lockup" href="#inicio" aria-label="Ir al inicio de PyOS Web"><img src={ASSETS.logo} alt="" className="brand-mark" /><span className="brand-word"><b>[</b>PYOS<span>▮</span></span></a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#sistema">Sistema</a><a href="#instalar">Instalar</a><button type="button" className="header-config" onClick={openConfig}>Componentes</button>
          <button type="button" className="header-launch" onClick={openPyOS}>Abrir PyOS <ArrowUpRight size={15} strokeWidth={2.2} /></button>
        </nav>
      </header>

      <main id="inicio">
        <section className="launch-layout" aria-labelledby="hero-title">
          <aside className="console-rail" aria-label="Estado del sistema">
            <div className="rail-index">00 / Estado</div>
            <div className="rail-logo-block"><Settings2 size={32} strokeWidth={1.5} /></div>
            <div className="rail-copy">
              <p className="eyebrow">● Panel de control</p>
              <h1 id="hero-title">Configura tu<br />entorno PyOS.</h1>
              <p>Administra perfiles, componentes y almacenamiento local antes de entrar al escritorio.</p>
            </div>
            <div className="rail-details"><StatusLine label="canal" value="estable" /><StatusLine label="versión" value="v2.3.0" /><StatusLine label="reloj" value={clock || "--:--"} /></div>
            <a href="#componentes" className="rail-jump">Ver componentes <ArrowDownRight size={17} /></a>
          </aside>

          <div className="launch-stage" id="sistema">
            <div className="stage-art config-art" aria-hidden="true" />
            <div className="stage-overlay" /><div className="stage-corner stage-corner-a">SYS / 01</div><div className="stage-corner stage-corner-b">PWA READY</div>
            <div className="launch-copy">
              <p className="eyebrow">Centro de configuración</p>
              <h2>Tu navegador.<br /><em>Tu sistema.</em></h2>
              <p>Esta página es el panel previo de PyOS: revisa usuarios, componentes y almacenamiento antes de abrir la sesión completa.</p>
              <div className="action-row"><button type="button" className="primary-action" onClick={openConfig}><span>Configurar componentes</span><Settings2 size={19} /></button><button type="button" className="text-action" onClick={openPyOS}>Abrir escritorio <ArrowUpRight size={18} /></button></div>
            </div>
            <div className="live-window" aria-label="Vista previa interactiva de PyOS">
              <div className="window-chrome"><div className="window-dots"><i /><i /><i /></div><span><b>PYOS / </b>CONFIGURACIÓN LOCAL</span><ExternalLink size={14} /></div>
              <div className="pyos-frame config-preview"><strong>Entorno preparado</strong><span>Configura CPU, GPU, RAM, red y actualizaciones antes de iniciar.</span><div className="preview-meter"><i /></div></div>
            </div>
          </div>
        </section>

        <section className="operations-section" id="usuarios" aria-label="Configuración de usuarios">
          <aside className="operations-rail"><span>01 / Usuarios</span><div className="boot-emblem"><Users size={27} /><i>_</i></div><p>Perfiles locales</p><StatusLine label="cuentas" value="locales" /><StatusLine label="privilegios" value="Root Manager" /></aside>
          <div className="operations-panel">
            <div className="panel-heading"><span>PYOS / PERFILES</span><p>Administra usuarios locales desde Accounts dentro de PyOS. Cada perfil conserva sus propios archivos, permisos y aplicaciones.</p></div>
            <div className="capability-grid">
              <article className="capability-card"><Users size={25} strokeWidth={1.5} /><h3>Perfiles locales</h3><p>Crea, cambia o elimina cuentas desde el administrador de usuarios integrado.</p><button type="button" className="text-action" onClick={openPyOS}>Abrir cuentas <ArrowUpRight size={16} /></button></article>
              <article className="capability-card"><ShieldCheck size={25} strokeWidth={1.5} /><h3>Root Manager</h3><p>La sesión root permanece disponible y las apps elevadas reciben permisos de forma coherente.</p></article>
              <article className="capability-card"><MonitorCog size={25} strokeWidth={1.5} /><h3>Escritorio PC</h3><p>Ventanas, barra de tareas, menú Inicio e iconos de las aplicaciones instaladas.</p></article>
            </div>
          </div>
        </section>

        <section className="install-operation" id="instalar" aria-labelledby="install-title">
          <aside className="install-rail"><span>02 / Instalar</span><div className="boot-emblem">▣<i>_</i></div><p>Destino: pantalla de inicio</p><StatusLine label="red" value="requerida" /><StatusLine label="pwa" value="instalable" /></aside>
          <div className="install-panel">
            <div className="install-visual"><img src={ASSETS.install} alt="Panel operativo de instalación de PyOS" /><span className="install-number">02</span></div>
            <div className="install-body">
            <p className="eyebrow">Instalación / PWA</p><h2 id="install-title">Instala PyOS<br />en la pantalla<br />de inicio.</h2>
            <p>Abre PyOS desde el móvil y usa el menú del navegador para añadirlo a la pantalla de inicio. Después funcionará como una aplicación independiente con tus perfiles locales.</p>
            <div className="install-actions"><button type="button" className="secondary-action" onClick={openPyOS}><Smartphone size={18} /> Abrir para instalar</button><button type="button" className="copy-link" onClick={copyInstallUrl}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? "Enlace copiado" : "Copiar enlace"}</button></div>
            <p className="install-note"><span>Nota</span> La instalación se realiza desde la página completa de PyOS, no desde la vista previa.</p>
            </div>
          </div>
        </section>

        <section className="reset-operation" id="reiniciar" aria-labelledby="reset-title">
          <aside className="reset-rail"><span>03 / Reiniciar</span><div className="boot-emblem">↺<i>_</i></div><p>Datos locales de PyOS</p><StatusLine label="alcance" value="este navegador" /><StatusLine label="acción" value="irreversible" /></aside>
          <div className="reset-panel">
            <p className="eyebrow">Mantenimiento / almacenamiento local</p>
            <h2 id="reset-title">Empezar<br />desde cero.</h2>
            <p>Elimina todos los perfiles, archivos, aplicaciones instaladas, permisos, mundos guardados y preferencias de PyOS en este navegador. No afecta otros sitios ni archivos del dispositivo.</p>
            <button type="button" className="reset-action" onClick={() => { setResetStatus(""); setResetOpen(true); }}><Trash2 size={18} /> Borrar datos de PyOS</button>
            {resetStatus && <p className="reset-status" role="status"><Check size={15} /> {resetStatus}</p>}
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><img src={ASSETS.logo} alt="" /><span>PyOS / WEB BUILD</span></div><p>Aplicación instalable · entorno cliente · estado operativo</p><a href={APP_PATH} target="_blank" rel="noreferrer">Abrir sistema <ArrowUpRight size={14} /></a></footer>
      {resetOpen && <div className="reset-dialog-backdrop" role="presentation"><section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title"><button type="button" className="reset-dialog-close" aria-label="Cancelar" onClick={() => setResetOpen(false)}><X size={17} /></button><RotateCcw size={23} className="reset-dialog-icon" /><p>PYOS / CONFIRMACIÓN</p><h2 id="reset-dialog-title">¿Borrar todos los datos?</h2><span>Se eliminarán cuentas, archivos, permisos, apps instaladas y partidas locales de este navegador. Esta acción no se puede deshacer.</span><div><button type="button" className="copy-link" onClick={() => setResetOpen(false)}>Cancelar</button><button type="button" className="reset-confirm" onClick={clearPyOSData}>Sí, borrar todo</button></div></section></div>}
    </div>
  );
}
