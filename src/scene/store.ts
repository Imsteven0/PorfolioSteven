// Puntero compartido entre la portada y la escena 3D (useFrame).
// Es un objeto mutable a propósito: se lee 60 veces por segundo y no debe provocar renders de React.
export const sceneState = {
  /** Puntero normalizado (-1 → 1, y hacia abajo) y última vez que se movió, en segundos. */
  pointer: { x: 0, y: 0, lastMove: -Infinity },
};
