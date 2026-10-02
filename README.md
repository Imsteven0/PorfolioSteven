# Portafolio 3D — Steven Araya

Vite + React + TypeScript · React Three Fiber + drei · GSAP ScrollTrigger · Tailwind CSS v4.

```bash
pnpm install
pnpm dev                 # http://localhost:5173
pnpm build               # genera dist/ listo para Cloudflare Pages
pnpm check:reaction      # comprueba la lógica del golpecito y el parpadeo
```

## Despliegue en Cloudflare Pages

**Opción A — conectado a GitHub (recomendado, despliega solo en cada push):**

1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → elige este repositorio.
2. Configuración de build:

   | Campo                  | Valor           |
   | ---------------------- | --------------- |
   | Framework preset       | `Vite` (o *None*) |
   | Build command          | `pnpm build`    |
   | Build output directory | `dist`          |
   | Production branch      | `master`        |

   La versión de Node se toma de `.node-version` (24); no hace falta variable `NODE_VERSION`.
   Pages instala con pnpm al detectar `pnpm-lock.yaml`.
3. *Save and Deploy*. Cada push a `master` publica; las demás ramas generan vistas previas.

**Opción B — subida directa desde tu PC (sin conectar GitHub):**

```bash
pnpm build
pnpm dlx wrangler pages deploy dist --project-name steven-araya-portfolio
```

`public/_headers` define la caché (JS/CSS con hash: 1 año; modelo e imágenes: 1 semana)
y cabeceras básicas de seguridad. El archivo más grande del sitio es el modelo 3D
(10.1 MB), por debajo del límite de 25 MiB por archivo de Pages.

## Dónde tocar

| Quiero cambiar…                         | Archivo                                    |
| --------------------------------------- | ------------------------------------------ |
| Textos, proyectos, experiencia, stack   | `src/content.ts`                           |
| Colores y tipografías                   | `src/index.css` (`@theme`)                 |
| Encuadre del retrato                    | `src/scene/Character.tsx` (`PORTRAIT_*`)   |
| Cómo sigue el cursor / animación reposo | `src/scene/Character.tsx`                  |
| Cuello que gira, color de la piel, borde | `src/scene/characterShader.ts` (`NECK_*`, `SATURATION`, `TINT`, `RIM_COLOR`) |
| Luces                                   | `src/scene/Stage.tsx`                      |
| Golpecito, mareo, ritmo del parpadeo    | `src/scene/reaction.ts`                    |
| Estrellas, zona que recibe el clic      | `src/scene/Character.tsx` (`STAR_*`, `HEAD_FROM`) |
| Forma de los párpados                   | `scripts/blender/blink.py` (y regenerar el modelo) |

## Modelo 3D

El original exportado está en `3d/`. La versión web (`public/models/steven.glb`) se genera en
dos pasos; el primero necesita [Blender](https://www.blender.org/) 4.2+ (se ejecuta sin ventana):

```bash
# 1. Agrega los párpados (morphs `blink` y `blink_surface`). Con previews opcionales en otra carpeta.
#    check-blink.py hace lo mismo y además comprueba el resultado.
blender -b --factory-startup -P scripts/blender/blink.py -- \
  3d/3d-jutsu-Untitled-3D-Jutsu-2026-10-02-03-02-48.glb 3d/steven-blink.glb

# 2. Quita el escenario de exportación y guarda los morphs como sparse.
pnpm optimize:model
```

El resultado pesa **10.1 MB** y conserva la calidad original: no comprime ni modifica
vértices, normales, UVs o imágenes del original. `3d/steven-blink.glb` es intermedio y no se versiona.
Al cambiar el modelo, sube el `?v=` de `MODEL_URL` (`Character.tsx`) y del preload (`index.html`).

### Cómo se ve (y por qué)

El modelo viene de un generador image-to-3D (Higgsfield): la textura de color ya trae las
sombras y los brillos pintados. Por eso el render es casi plano, como el visor de Higgsfield:

- **Luz:** ambiente + una principal suave desde el frente a la izquierda. Sin luces laterales
  fuertes ni contraluces de color: duplican las sombras pintadas y la cara se ve rara.
- **Tone mapping Neutral:** respeta el color de la textura y no aplasta los oscuros (pelo,
  barba, iris). AgX lavaba la piel hacia el gris; ACES dejaba pelo y ojos casi negros.
- **Color:** saturación al 85 % y un tinte cálido leve; punto medio entre lo realista y lo
  animado (saturación de piel ≈ 0.47, frente a 0.57 en Higgsfield y 0.36 en el render anterior).
- **Solo la textura de color:** los mapas de relieve (costuras UV) y de rugosidad (piel con
  brillo de plástico) siguen dentro del archivo, pero no se aplican.
- **Brillo de borde (fresnel)** solo en la camiseta y la coronilla, para separarlas del fondo
  negro sin iluminar la cara.

El modelo no tiene esqueleto, así que el giro de la cabeza se hace en el vertex shader
(`characterShader.ts`): los vértices por encima del cuello rotan con un peso suave.
Si en el futuro se rigea (p. ej. con Mixamo), se puede reemplazar por huesos reales.
