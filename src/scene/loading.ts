// Progreso de carga de la escena. Vive fuera del chunk de three.js para que el loader
// pueda mostrarse antes de que ese chunk termine de descargarse.

type LoadState = { progress: number; done: boolean };

let state: LoadState = { progress: 0, done: false };
const listeners = new Set<() => void>();

export const loading = {
  get: () => state,
  set(next: LoadState) {
    if (next.progress === state.progress && next.done === state.done) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
