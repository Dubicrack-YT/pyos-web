# Dirección de diseño: PyOS Web

## Tres aproximaciones exploradas

### 1. Consola de mantenimiento industrial
**Muy breve:** Una estación de trabajo sobria y técnica, inspirada en terminales de diagnóstico y paneles de control. Transmite control, calma y trazabilidad.

**Probabilidad:** 0.07

### 2. Archivo digital monocromo
**Muy breve:** Un archivo documental de alto contraste, con tipografía editorial y detalles de comandos discretos. Prioriza legibilidad, jerarquía y permanencia.

**Probabilidad:** 0.03

### 3. Sala de operaciones phosphor-green
**Muy breve:** Una consola terminal contemporánea de fondo profundo, verde fósforo reservado y capas de información. Hace que PyOS parezca un sistema operativo web tangible sin depender de neón excesivo.

**Probabilidad:** 0.08

## Dirección elegida: Sala de operaciones phosphor-green

### Movimiento de diseño
**Brutalismo editorial aplicado a una terminal UNIX contemporánea.** La composición privilegia la información estructurada, los márgenes funcionales y un acabado de monitor técnico, no una simulación nostálgica.

### Principios centrales

1. **Jerarquía operativa:** cada bloque se lee como estado, comando o resultado.
2. **Contraste deliberado:** tinta casi negra, superficies carbón y el verde PyOS únicamente para foco, estado y acción.
3. **Asimetría útil:** el contenido se distribuye como una consola modular con una columna de telemetría, no como una página promocional centrada.
4. **Respuesta humana:** los controles conservan foco visible, tamaños táctiles adecuados y movimiento breve que confirma acciones.

### Filosofía de color

El fondo de grafito azulado reduce la fatiga visual y ofrece profundidad; el marfil frío garantiza lectura prolongada. El verde fósforo se reserva como señal de disponibilidad, cursor y confirmación para conservar su valor semántico. Los acentos ámbar y rojo se usan sólo para advertencias y estados detenidos.

### Paradigma de distribución

Una **consola de exploración lateral**: cabecera de comando, barra de estado, área editorial dominante a la izquierda y un rail de telemetría a la derecha. En móviles, el rail se vuelve un bloque desplegable al final, conservando una lectura lineal clara.

### Elementos distintivos

1. Un cursor de bloque verde que pulsa junto a las líneas de comando.
2. Retículas de exploración y números de línea discretos en los bordes de las secciones.
3. Etiquetas de estado en mayúsculas con bordes cuadrados y una línea de barrido tenue.

### Filosofía de interacción

La interfaz responde como una consola segura: cada control ofrece estado inmediato, foco inequívoco y realimentación textual. Las acciones no implementadas se identifican con honestidad como demostraciones visuales, sin fingir acceso al sistema.

### Animación

El cursor parpadea lentamente y las secciones aparecen con desplazamientos verticales de 8 px y una cadencia de 55 ms. Las transiciones duran entre 140 y 220 ms con curva `cubic-bezier(0.23, 1, 0.32, 1)`. La animación se desactiva con `prefers-reduced-motion`.

### Sistema tipográfico

**Space Grotesk** proporciona titulares densos y contemporáneos; **IBM Plex Mono** define comandos, metadatos y controles. Los titulares usan peso 600–700; el texto de lectura usa 400–500; los datos técnicos usan tamaño 12–14 px con espaciado generoso.

### Esencia de marca

**PyOS Web transforma el estado de un sistema en una interfaz clara para quienes necesitan operar sin perder contexto.** Personalidad: precisa, independiente y serena.

### Voz de marca

Los titulares son directos y operativos; las acciones nombran su resultado y los mensajes evitan promesas vagas.

> “Un sistema legible es un sistema controlable.”

> “Abrir consola de estado”

### Logotipo y símbolo

Un símbolo sin texto formado por un cursor de bloque atravesando tres segmentos de circuito: reconocible en tamaños pequeños y preparado para favicon. El logotipo usa letras monoespaciadas construidas con cortes rectangulares, no una fuente por defecto.

### Color distintivo

**Verde PyOS `#B8FF5C`**: una señal verde amarillenta de alta visibilidad, reservada para control y actividad confirmada.

## Decisiones de estilo

- El verde PyOS `#B8FF5C` nunca se utiliza como un fondo decorativo de sección completa; funciona como señal, cursor, estado, acción, traza, numeral o retícula activa.
- Cada sección principal resuelve la gramática de consola mediante una cabecera de comando, cuerpo indexado, estado o resultado y, cuando aporta contexto, un rail de telemetría.
- El wordmark PYOS/WEB incorpora cortes rectangulares visibles para leerse como una marca construida de sistema operativo y no como texto monoespaciado por defecto.
