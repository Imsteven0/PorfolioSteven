import { useSyncExternalStore } from 'react';
import { loading } from '../scene/loading';
export function Loader() {
  const { progress, done } = useSyncExternalStore(loading.subscribe, loading.get);
  if (done) return null;
  return <div className="portrait-loader" role="status" aria-live="polite"><span>Cargando retrato</span><span>{Math.round(progress)}%</span><div><span style={{ width: `${progress}%` }} /></div></div>;
}
