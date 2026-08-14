# PyOS Web

PyOS Web es una interfaz estática de referencia inspirada en una consola de operaciones contemporánea. Su experiencia visual emplea superficies de grafito, tipografía técnica y el color **Verde PyOS** como señal de estado y acción. El sitio se adapta a pantallas pequeñas, medianas y grandes sin requerir autenticación, secretos o un servidor de aplicación.

## Publicación independiente

Este repositorio está preparado para publicarse de forma independiente en GitHub Pages. El flujo de trabajo `.github/workflows/deploy-pages.yml` compila la interfaz con una base relativa y publica el contenido estático de `dist/public` en cada envío a la rama `main`.

Para usarlo, habilita GitHub Pages con la fuente **GitHub Actions** en la configuración del repositorio. El primer envío a `main` activará el flujo y generará la URL pública de Pages.

## Desarrollo local

Instala las dependencias y ejecuta el servidor de desarrollo:

```bash
pnpm install
pnpm dev
```

Para validar la compilación estática, usa:

```bash
pnpm exec vite build --base="./"
```

## Nota de seguridad

PyOS Web es un sitio estático y no contiene un panel de administración ni autenticación real. Una interfaz de administrador segura requiere un proveedor de identidad y un backend que valide permisos en el servidor; ocultar elementos en el navegador no protege funciones ni datos.

