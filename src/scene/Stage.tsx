import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { NeutralToneMapping, SRGBColorSpace } from 'three';
import { useProgress } from '@react-three/drei';
import { Character } from './Character';
import { loading } from './loading';

/**
 * La textura del personaje ya trae las sombras pintadas: la luz debe ser casi plana para no
 * duplicarlas (eso hacía que la cara se viera rara). Ambiente + una principal suave desde el
 * frente a la izquierda: algo de volumen sin perder el aspecto limpio del visor de Higgsfield.
 * La separación con el fondo negro la da el brillo de borde del shader (characterShader.ts).
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[-0.8, 1.8, 3]} intensity={0.62} />
    </>
  );
}

function ProgressBridge() {
  const { progress, active } = useProgress();
  useEffect(() => loading.set({ progress, done: progress >= 100 && !active }), [progress, active]);
  return null;
}

function RendererSettings() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    // También se aplica al editar la escena: onCreated solo corre al crear el canvas.
    // Neutral respeta el color de la textura y no aplasta los oscuros (pelo, barba, iris).
    // Probados: AgX lava la piel hacia el gris; ACES oscurece el pelo y los ojos casi a negro.
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl]);
  return null;
}

export default function Stage() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} style={{ width: '100%', height: '100%' }}>
    <Canvas
      frameloop={visible ? 'always' : 'never'}
      // Renderiza al doble de resolución para suavizar textura y silueta en movimiento.
      dpr={2}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ near: 0.1, far: 50 }}
    >
      <RendererSettings />
      <ProgressBridge />
      <Lights />
      <Suspense fallback={null}>
        <Character />
      </Suspense>
    </Canvas>
    </div>
  );
}
