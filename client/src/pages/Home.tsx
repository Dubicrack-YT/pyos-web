// PyOS design reminder: a responsive operations console with asymmetric reading flow, precise status signals and restrained motion.
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  Command,
  Copy,
  Cpu,
  Github,
  Menu,
  Network,
  Radio,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";

const heroArt = "/manus-storage/pyos-hero-console_34cd4a29.jpg";
const telemetryArt = "/manus-storage/pyos-telemetry-panel_f381b034.jpg";
const textureArt = "/manus-storage/pyos-signal-texture_96fe7ded.jpg";
const symbolArt = "/manus-storage/pyos-symbol_0b8b2853.png";

const modules = [
  ["CORE", "Kernel orchestration", "ready"],
  ["SHELL", "Command-first workspace", "ready"],
  ["NEXUS", "Connected system surface", "sync"],
];

const telemetry = [
  ["UPTIME", "99.98%", "steady"],
  ["RESPONSE", "42 ms", "optimal"],
  ["UPDATES", "03 queued", "review"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [command, setCommand] = useState("status --full");
  const [commandOutput, setCommandOutput] = useState("Todos los sistemas críticos están operativos.");
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateClock = () =>
      setClock(
        new Intl.DateTimeFormat("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const runCommand = () => {
    const normalized = command.trim().toLowerCase();
    if (normalized.includes("help")) {
      setCommandOutput("Comandos disponibles: status --full · modules · version · clear");
      return;
    }
    if (normalized.includes("modules")) {
      setCommandOutput("CORE ready · SHELL ready · NEXUS sync");
      return;
    }
    if (normalized.includes("version")) {
      setCommandOutput("PyOS Web · interfaz estática 0.1.0");
      return;
    }
    if (normalized.includes("clear")) {
      setCommandOutput("Consola despejada. Escribe help para consultar los comandos.");
      return;
    }
    setCommandOutput("Todos los sistemas críticos están operativos.");
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCommandOutput("No se pudo copiar. Selecciona el comando manualmente.");
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="pyos-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PyOS Web, ir al inicio" onClick={closeMenu}>
          <img src={symbolArt} alt="Símbolo PyOS" className="brand-mark" />
          <span className="brand-word" aria-label="PyOS Web"><b>PY</b><b className="wordmark-core">OS</b><i>/</i><b>WEB</b></span>
        </a>

        <nav className={menuOpen ? "site-nav site-nav-open" : "site-nav"} aria-label="Navegación principal">
          <a href="#system" onClick={closeMenu}>Sistema</a>
          <a href="#modules" onClick={closeMenu}>Módulos</a>
          <a href="#terminal" onClick={closeMenu}>Terminal</a>
          <a href="#source" onClick={closeMenu}>Código</a>
        </nav>

        <div className="header-status">
          <span className="live-dot" />
          <span>ONLINE</span>
          <span className="header-time">{clock || "--:--:--"}</span>
        </div>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <img src={heroArt} alt="Entorno de operaciones abstracto de PyOS" className="hero-art" />
          <div className="hero-shade" aria-hidden="true" />

          <div className="hero-copy">
            <div className="eyebrow"><CircleDot size={14} /> ENTORNO ESTÁTICO · GITHUB PAGES READY</div>
            <p className="hero-command"><span>pyos@web:~$</span> boot --clean <i aria-hidden="true" /></p>
            <h1 id="hero-title">Un sistema<br />legible es un sistema<br /><em>controlable.</em></h1>
            <p className="hero-description">PyOS Web traduce la lógica de un sistema operativo a una superficie web clara, rápida y preparada para cualquier tamaño de pantalla.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#terminal">Abrir consola <ArrowDownRight size={17} /></a>
              <a className="button button-quiet" href="#modules">Explorar módulos <ChevronRight size={17} /></a>
            </div>
          </div>

          <aside className="hero-telemetry" aria-label="Estado de ejecución">
            <div className="telemetry-topline"><span>SYS/REPORT</span><span>LIVE</span></div>
            <div className="signal-rules"><span /><span /><span /><span /><span /><span /></div>
            <dl>
              <div><dt>BUILD</dt><dd>0.1.0</dd></div>
              <div><dt>CHANNEL</dt><dd>STABLE</dd></div>
              <div><dt>LAYOUT</dt><dd>FLUID</dd></div>
            </dl>
            <p><span className="cursor-block" /> sincronización estable</p>
          </aside>

          <div className="hero-index" aria-hidden="true"><span>01</span><span>INTRODUCTION</span></div>
        </section>

        <section id="system" className="status-strip" aria-label="Resumen del sistema">
          <div className="status-intro"><Activity size={18} /><span>ESTADO DEL SISTEMA</span></div>
          {telemetry.map(([label, value, tone]) => (
            <div className={`status-cell status-${tone}`} key={label}>
              <span>{label}</span><strong>{value}</strong>
            </div>
          ))}
          <div className="status-end"><span className="live-dot" /> ACTUALIZADO CONTINUAMENTE</div>
        </section>

        <section id="modules" className="modules-section">
          <div className="section-status-line" aria-label="Estado de la sección módulos"><span>DIR / MODULES</span><span>03 ONLINE</span><span>SEEK / 0x401</span></div>
          <div className="section-heading">
            <p className="section-kicker">// 01 / CAPACIDADES NUCLEARES</p>
            <h2>Menos ruido.<br /><span>Más señal.</span></h2>
          </div>
          <p className="section-lead">Una capa de interfaz diseñada para mostrar lo importante sin transformar cada interacción en una distracción visual.</p>

          <div className="module-layout">
            <div className="module-list">
              {modules.map(([name, description, status], index) => (
                <article className="module-row" key={name}>
                  <span className="module-number">0{index + 1}</span>
                  <div><h3>{name}</h3><p>{description}</p></div>
                  <span className={`module-status module-${status}`}><span />{status}</span>
                  <ArrowUpRight className="module-arrow" size={19} aria-hidden="true" />
                </article>
              ))}
            </div>
            <div className="telemetry-card">
              <img src={telemetryArt} alt="Patrones técnicos abstractos de telemetría" />
              <div className="telemetry-card-overlay">
                <p>TRACE / 2408</p>
                <div><Network size={18} /><span>La información conserva su contexto.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="terminal" className="terminal-section" style={{ backgroundImage: `url(${textureArt})` }}>
          <div className="section-status-line section-status-dark" aria-label="Estado de la sección consola"><span>EXEC / LOCAL</span><span>INPUT READY</span><span>RESULT / TRACE</span></div>
          <div className="terminal-heading">
            <p className="section-kicker">// 02 / INTERFAZ DE COMANDOS</p>
            <h2>Prueba la <span>consola.</span></h2>
            <p>Esta demostración se ejecuta completamente en el navegador. No solicita cuentas ni simula permisos administrativos.</p>
          </div>

          <div className="terminal-window" aria-label="Consola de demostración PyOS">
            <div className="terminal-bar"><span><i /><i /><i /></span><p>pyos-terminal — bash</p><span>secure/local</span></div>
            <div className="terminal-body">
              <p className="terminal-greeting">PyOS Web 0.1.0 — interfaz de demostración<br />Escribe <strong>help</strong> para consultar comandos disponibles.</p>
              <div className="command-line">
                <span>pyos@web:~$</span>
                <input
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") runCommand(); }}
                  aria-label="Comando de PyOS"
                  spellCheck="false"
                />
                <button type="button" onClick={runCommand} aria-label="Ejecutar comando"><Command size={17} /></button>
              </div>
              <div className="command-output"><span>›</span><p>{commandOutput}</p></div>
            </div>
            <div className="terminal-footer">
              <span><ShieldCheck size={15} /> LOCAL / SIN AUTENTICACIÓN</span>
              <button type="button" onClick={copyCommand}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "COPIADO" : "COPIAR"}</button>
            </div>
          </div>
        </section>

        <section id="source" className="source-section">
          <div className="source-grid-bg" aria-hidden="true" />
          <div className="section-status-line section-status-source" aria-label="Estado de la sección distribución"><span>DIR / DISTRIBUTION</span><span>DEPLOY / READY</span><span>PAGE / STATIC</span></div>
          <div className="source-copy">
            <p className="section-kicker">// 03 / DISTRIBUCIÓN</p>
            <h2>Hecho para<br />vivir en la <span>web.</span></h2>
            <p>El proyecto se construye como un sitio estático adaptable y se distribuye de forma independiente mediante GitHub Pages.</p>
            <a className="button button-primary" href="https://github.com/Dubicrack-YT" target="_blank" rel="noreferrer">Ver perfil GitHub <Github size={17} /></a>
          </div>
          <div className="source-facts">
            <div><span>01</span><h3>Responsive</h3><p>La consola se organiza para táctil, tableta y escritorio.</p></div>
            <div><span>02</span><h3>Estático</h3><p>Sin secretos, credenciales ni control de acceso simulado.</p></div>
            <div><span>03</span><h3>Portable</h3><p>Una publicación reproducible desde el repositorio.</p></div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><img src={symbolArt} alt="" /><span className="brand-word" aria-label="PyOS Web"><b>PY</b><b className="wordmark-core">OS</b><i>/</i><b>WEB</b></span></div>
        <p>Interfaz estática de referencia. No representa un servicio de administración ni un sistema de autenticación.</p>
        <a href="#top">VOLVER ARRIBA <ArrowUpRight size={15} /></a>
      </footer>
    </div>
  );
}
