# Dirección de diseño: PyOS Web

## Tres enfoques explorados

### Archivo de sistema

**Muy breve introducción:** Una interfaz editorial inspirada en pantallas de arranque y utilidades de terminal, sobria y funcional. Convierte el acceso a PyOS en un objeto digital claramente utilitario.

**Probabilidad:** 0.06

### Laboratorio de bolsillo

**Muy breve introducción:** Un portal cálido y táctil que presenta PyOS como un pequeño ordenador experimental para el teléfono. La composición prioriza una tarjeta de dispositivo y detalles de hardware ligero.

**Probabilidad:** 0.04

### Manual de operaciones

**Muy breve introducción:** Un sitio de inspiración brutalista-editorial que combina tipografía monoespaciada, jerarquías de documentación y un acceso directo al sistema. Se siente como el manual de un artefacto de software.

**Probabilidad:** 0.08

## Enfoque elegido: Archivo de sistema

### Movimiento de diseño

**Terminal utilitaria contemporánea** con referencias discretas a las interfaces de sistema de finales de los noventa, evitando la nostalgia literal.

### Principios centrales

1. La jerarquía visual sigue la lógica de un panel de estado: identidad, disponibilidad y acción.
2. La interfaz es sobria, de alto contraste y de lectura inmediata, sin decoración superflua.
3. La aplicación PyOS es el centro del producto; el portal existe para explicarla, abrirla e instalarla.
4. Los detalles de retícula, cursores y separadores transmiten precisión técnica sin obstaculizar la accesibilidad.

### Filosofía de color

Una base de negro grafito y grises de papel térmico permite que el verde fósforo de PyOS sea una señal de estado, no un fondo ornamental. La firma cromática es **verde fósforo PyOS (`#39ff14`)**, reservado para acciones principales, focos e indicadores de disponibilidad.

### Paradigma de composición

Una estructura asimétrica de **consola lateral + panel operativo**. A la izquierda, una columna de identidad y diagnóstico; a la derecha, una ventana física de lanzamiento que domina la pantalla. En móvil, los paneles se apilan conservando el orden operativo.

### Elementos distintivos

1. Una línea de estado con punto de actividad y texto de versión.
2. Marcos técnicos con esquinas recortadas y numeración de secciones.
3. Un símbolo de cursor/bloque de arranque como emblema de la marca.

### Filosofía de interacción

Toda interacción confirma una acción concreta: abrir el sistema, instalarlo o consultar una nota. Los estados de foco se muestran como señales de terminal y los botones responden con una breve compresión.

### Animación

Las entradas iniciales se escalonan entre 40 y 80 ms con opacidad y traslación corta. El indicador de actividad pulsa suavemente. Las transiciones usan `cubic-bezier(0.23, 1, 0.32, 1)` y duran entre 140 y 220 ms. Se desactivan para `prefers-reduced-motion`.

### Sistema tipográfico

**Space Grotesk** para titulares y control de jerarquía; **IBM Plex Mono** para estado, etiquetas y datos técnicos. Los titulares usan peso 600–700, mientras los textos funcionales mantienen 400–500 con interlineado generoso.

### Esencia de marca

**PyOS es un pequeño sistema operativo web instalable para explorar una experiencia de escritorio desde cualquier dispositivo.** Personalidad: preciso, lúdico y autosuficiente.

### Voz de marca

Los titulares son directos, técnicos y tranquilos. Los CTA describen la acción exacta, no hacen promesas genéricas.

> "Inicia una sesión PyOS en el navegador."

> "Instala el sistema para abrirlo desde tu pantalla de inicio."

### Logotipo y marca

Un cursor de bloque escalonado dentro de una ventana mínima; no contiene texto y se entiende incluso en formato de favicon. El logotipo combina ese símbolo con una composición de caracteres monoespaciados para “PyOS”.

## Style Decisions

- El verde fósforo `#39ff14` se reserva para acciones, disponibilidad, numeración, cursores e indicadores operativos; los titulares se mantienen en blanco térmico y gris.
- La ventana de lanzamiento es el objeto de producto dominante: incorpora un marco operativo explícito y una vista previa directa de PyOS.
- El logotipo usa un emblema de ventana/cursor y una construcción monoespaciada de identidad de arranque, no una etiqueta tipográfica convencional.
- Cada sección conserva la lógica de consola lateral + panel operativo: diagnóstico a un lado y un objeto o acción reconocible de PyOS al otro.
- Las superficies visuales priorizan perfiles, ventanas, componentes y estados reconocibles del sistema frente a ilustraciones abstractas de tecnología.
- La voz de marca describe una acción concreta del sistema en español técnico y tranquilo, sin titulares aspiracionales de marketing.
