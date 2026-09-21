# PyOS Web

> **Abrir PyOS Web:** [https://dubicrack-yt.github.io/pyos-web/](https://dubicrack-yt.github.io/pyos-web/)

PyOS Web es una simulación de sistema operativo que funciona completamente en el navegador. Se publica como una PWA bajo la ruta `/pyos` y se acompaña de un portal de lanzamiento para abrirla e instalarla.

## Novedades de la versión 2.3.0

| Área | Implementación |
|---|---|
| Perfiles | Cuentas locales simuladas, con archivos, permisos y preferencias aisladas por perfil. |
| Modos | Experiencias **Escritorio**, **Táctil** y **Consola**. |
| Consola | Interfaz de sala para pantallas grandes, teclado y controles compatibles con Gamepad API. |
| Terminal | Comandos `profiles`, `profile`, `status`, `mode` y cambio de interfaz desde el sistema. |
| PWA | Caché versionada y actualización de recursos para evitar versiones antiguas en dispositivos móviles. |
| Usabilidad | Explorador con selección y apertura explícitas, panel de cuentas y permisos por rol. |
| Apps | Centro de control, Cuentas, Tareas y Bitácora para cada perfil local. |
| Sistema | Exploración root, editor controlado de archivos del sistema y jerarquía de servicios, registros y paquetes simulados. |
| PyStore | Catálogo local por perfil con instalación y desinstalación de aplicaciones opcionales. |
| Device Info | CPU AMD Ryzen 7 7800X3D, GPU NVIDIA GeForce RTX 4070 SUPER, 32 GB DDR5 y 1 TB NVMe simulados con telemetría dinámica. |
| Catálogo ampliado | Filtros de PyStore y aplicaciones opcionales de personalización y herramientas root. |
| Root Manager | Gestor local de superusuario con instalación simulada, solicitudes por aplicación y políticas persistentes. |
| Operaciones | Logs root registra arranque, privilegios, servicios, archivos root e instalaciones de PyStore. |
| Hardware | Centro externo de configuración para CPU, GPU NVIDIA/AMD/Intel, RAM, almacenamiento y requisitos mínimos. |
| Consumo | Telemetría dinámica por aplicación con cargas de CPU, GPU, VRAM, RAM, disco y red. |
| Renderizado | Benchmark procedural con ray tracing simulado, reflejos, ruido, TAAU Ultimate y Frame Generation configurable. |
| Red | Ethernet por defecto, adaptador Wi-Fi simulado, redes visibles y cambio de conexión persistente. |
| Actualizaciones | Migración versionada 2.3.0 con historial y conservación de perfiles, archivos y apps. |
| Apps GPU | NVIDIA App, Panel de control GPU, AMD Software: Adrenalin e Intel Graphics Center. |

## Ejecutar localmente

Este proyecto utiliza Node.js y pnpm.

```bash
pnpm install
pnpm dev
```

Para comprobar tipos y generar la compilación de producción:

```bash
pnpm check
pnpm build
```

## Usar PyOS

Antes de iniciar el escritorio puedes abrir el [Centro de configuración externo](https://dubicrack-yt.github.io/pyos-web/pyos/config.html) para cambiar componentes, revisar perfiles y archivos, elegir red, borrar datos o actualizar el sistema.

Abre `/pyos/index.html` desde el sitio. En el primer inicio se puede elegir una cuenta local o crear otra. Después, selecciona un modo de uso:

| Modo | Uso previsto |
|---|---|
| Escritorio | Mouse, teclado y ventanas flotantes. |
| Táctil | Teléfonos y tabletas; una app por vez. |
| Consola | Televisor, control o teclado; navegación con flechas, Aceptar y Volver. |

La Terminal incluye una guía completa mediante `help`. Los comandos específicos de esta versión son:

```text
profiles
profile
profile add <nombre>
profile switch
status
mode
mode switch
```

## Estructura principal

```text
client/src/             Portal web de PyOS
client/public/pyos/     PWA autónoma de PyOS
client/public/pyos/js/  Núcleo, perfiles, modos y aplicaciones
client/public/pyos/sw.js  Trabajador de servicio y caché offline
```

## Publicación

La PWA debe desplegarse mediante HTTPS. Tras publicar una actualización, abre PyOS una vez con Internet para permitir que el trabajador de servicio actualice su caché. Si un dispositivo muestra una versión antigua, cierra la app y vuelve a abrirla; como último recurso, elimina la instalación y vuelve a añadirla desde la URL publicada.

La versión publicada está disponible en [GitHub Pages](https://dubicrack-yt.github.io/pyos-web/).

## Repositorio propuesto

El nombre preparado para GitHub es:

```text
Dubicrack-YT/pyos-web
```

La aplicación es una simulación local: las cuentas no son autenticación real y los datos permanecen en el almacenamiento del navegador.
