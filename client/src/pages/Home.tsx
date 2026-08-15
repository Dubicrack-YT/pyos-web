/* Código y estructura originales de PyOS; sólo se ajustan rutas relativas de publicación. */
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, CircleDot, Clipboard, ExternalLink, MonitorCog, ShieldCheck, Smartphone, TerminalSquare, Wifi } from "lucide-react";

const APP_PATH = "./pyos/index.html";
const ASSETS = {
  logo: "./pyos/icons/icon-192.png",
  hero: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1800&q=85",
  system: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85",
  install: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1500&q=85",
};

function StatusLine({ label, value }: { label: string; value: string }) {
  return <div className="status-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("");
  const installUrl = useMemo(() => typeof window === "undefined" ? APP_PATH : new URL(APP_PATH, window.location.href).href, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const openPyOS = () => window.open(APP_PATH, "_blank", "noopener,noreferrer");
  const openConsole = () => window.open(`${APP_PATH}?mode=console`, "_blank", "noopener,noreferrer");
  const copyInstallUrl = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copia este enlace para instalar PyOS:", installUrl);
    }
  };

  return (
    <div className="pyos-portal">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="site-header">
        <a className="brand-lockup" href="#inicio" aria-label="Ir al inicio de PyOS Web"><img src={ASSETS.logo} alt="" className="brand-mark" /><span className="brand-word"><b>[</b>PYOS<span>▮</span></span></a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#sistema">Sistema</a><a href="#instalar">Instalar</a>
          <button type="button" className="header-launch" onClick={openPyOS}>Abrir PyOS <ArrowUpRight size={15} strokeWidth={2.2} /></button>
        </nav>
      </header>

      <main id="inicio">
        <section className="launch-layout" aria-labelledby="hero-title">
          <aside className="console-rail" aria-label="Estado del sistema">
            <div className="rail-index">00 / Estado</div>
            <div className="rail-logo-block"><TerminalSquare size={32} strokeWidth={1.5} /></div>
            <div className="rail-copy">
              <p className="eyebrow"><CircleDot size={12} fill="currentColor" /> Núcleo disponible</p>
              <h1 id="hero-title">Un sistema pequeño.<br />Una sesión completa.</h1>
              <p>PyOS es una experiencia web instalable para abrir, explorar y conservar en el teléfono.</p>
            </div>
            <div className="rail-details"><StatusLine label="canal" value="estable" /><StatusLine label="versión" value="v1.5.0" /><StatusLine label="reloj" value={clock || "--:--"} /></div>
            <a href="#instalar" className="rail-jump">Ver instalación <ArrowDownRight size={17} /></a>
          </aside>

          <div className="launch-stage" id="sistema">
            <img src={ASSETS.hero} alt="Dispositivo mostrando una consola PyOS abstracta" className="stage-art" />
            <div className="stage-overlay" /><div className="stage-corner stage-corner-a">SYS / 01</div><div className="stage-corner stage-corner-b">PWA READY</div>
            <div className="launch-copy">
              <p className="eyebrow">Entorno web independiente</p>
              <h2>Arranca PyOS<br /><em>desde aquí.</em></h2>
              <p>El sistema se ejecuta en tu navegador. Abre la sesión completa o continúa en modo instalado desde tu pantalla de inicio.</p>
              <div className="action-row"><button type="button" className="primary-action" onClick={openPyOS}><span>Iniciar PyOS</span><ArrowUpRight size={19} /></button><button type="button" className="text-action" onClick={openConsole}>Probar Consola <ChevronRight size={18} /></button><a href="#instalar" className="text-action">Cómo instalar <ChevronRight size={18} /></a></div>
            </div>
            <div className="live-window" aria-label="Vista previa interactiva de PyOS">
              <div className="window-chrome"><div className="window-dots"><i /><i /><i /></div><span><b>LAUNCH / </b>./pyos/index.html</span><a href={APP_PATH} target="_blank" rel="noreferrer" aria-label="Abrir PyOS en otra pestaña"><ExternalLink size={14} /></a></div>
              <iframe title="Vista previa de PyOS" src={APP_PATH} className="pyos-frame" loading="eager" />
            </div>
          </div>
        </section>

        <section className="operations-section" aria-label="Características del sistema">
          <aside className="operations-rail"><span>01 / Operación</span><div className="boot-emblem">▣<i>_</i></div><p>Estado de la sesión</p><StatusLine label="perfiles" value="locales" /><StatusLine label="modos" value="3 activos" /><StatusLine label="pwa" value="lista" /></aside>
          <div className="operations-panel">
            <div className="panel-heading"><span>PYOS / CAPACIDADES</span><p>Elige una cuenta, selecciona un modo y continúa con una sesión guardada en este navegador.</p></div>
            <div className="capability-grid">
              <article className="capability-card"><span className="card-code">MODE / TRIPLE</span><MonitorCog size={25} strokeWidth={1.5} /><h3>Tres entornos</h3><p>Escritorio para PC, Táctil para teléfono y Consola para TV, teclado o control.</p></article>
              <article className="capability-card"><span className="card-code">PROFILE / LOCAL</span><ShieldCheck size={25} strokeWidth={1.5} /><h3>Cuentas simuladas</h3><p>Cada perfil conserva archivos, permisos, tema y el modo inicial elegido.</p></article>
              <article className="capability-card system-surface"><div className="surface-chrome"><i /><i /><i /><span>PYOS / DEVICE INFO</span></div><div className="surface-list"><span>CPU / AMD Ryzen 7</span><span>GPU / NVIDIA RTX</span><span>RAM / 32 GB DDR5</span><span>STORE / LOCAL READY</span></div><div><Wifi size={18} /><span>PWA actualizable · modo consola listo</span></div></article>
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
      </main>

      <footer className="site-footer"><div className="footer-brand"><img src={ASSETS.logo} alt="" /><span>PyOS / WEB BUILD</span></div><p>Aplicación instalable · entorno cliente · estado operativo</p><a href={APP_PATH} target="_blank" rel="noreferrer">Abrir sistema <ArrowUpRight size={14} /></a></footer>
    </div>
  );
}
