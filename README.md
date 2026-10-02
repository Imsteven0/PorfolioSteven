# Portafolio 3D — Steven Araya

Vite + React + TypeScript · React Three Fiber + drei · GSAP ScrollTrigger · Tailwind CSS v4.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ listo para Vercel / Netlify
```

## Dónde tocar

| Quiero cambiar…                         | Archivo                                    |
| --------------------------------------- | ------------------------------------------ |
| Textos, proyectos, experiencia, stack   | `src/content.ts`                           |
| Colores y tipografías                   | `src/index.css` (`@theme`)                 |
| Encuadre del retrato                    | `src/scene/Character.tsx` (`PORTRAIT_*`)   |
| Cómo sigue el cursor / animación reposo | `src/scene/Character.tsx`                  |
| Cuello que gira, color de la piel, borde | `src/scene/characterShader.ts` (`NECK_*`, `SATURATION`, `TINT`, `RIM_COLOR`) |
| Luces                                   | `src/scene/Stage.tsx`                      |

## Modelo 3D

El original exportado está en `3d/`. Para regenerar la versión web (`public/models/steven.glb`):

```bash
node scripts/optimize-model.mjs
```

Quita el escenario de exportación y conserva la calidad original: **10.8 MB**.
No comprime ni modifica vértices, normales, UVs o imágenes.

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
