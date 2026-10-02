import { useEffect, useRef, useState } from 'react';
import { projects } from '../content';

const AUTOPLAY_MS = 6000;

/**
 * Carrusel con scroll nativo y scroll-snap: deslizar con el dedo o el trackpad funciona solo, y los
 * botones avanzan una tarjeta. Al llegar al final vuelve al primer proyecto (y al revés).
 *
 * Avanza solo cada AUTOPLAY_MS, pero espera mientras el visitante lo usa o no lo ve: foco de teclado
 * dentro, detalles abiertos, sección fuera de pantalla o pestaña oculta; cada interacción reinicia la
 * cuenta. No se pausa con el mouse encima: ocupa todo el ancho y casi nunca avanzaría. El botón de
 * pausa lo detiene del todo (WCAG 2.2.2), y con movimiento reducido arranca pausado.
 */
export function Projects() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [restart, setRestart] = useState(0); // cambia con cada interacción: el siguiente avance espera AUTOPLAY_MS completos
  const hold = useRef({ focus: false, visible: false });

  const go = (direction: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector('article');
    if (!el || !card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap);
    const max = el.scrollWidth - el.clientWidth;
    let left = el.scrollLeft + direction * step;
    if (direction > 0 && el.scrollLeft >= max - 4) left = 0; // en el último: vuelve al primero
    if (direction < 0 && el.scrollLeft <= 4) left = max; // en el primero: va al último
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  };

  const navigate = (direction: 1 | -1) => {
    go(direction);
    setRestart((n) => n + 1);
  };

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { hold.current.visible = entry.isIntersecting; }, { threshold: 0.35 });
    observer.observe(el);
    // Solo el foco de teclado: un clic en las flechas también enfoca el botón y no debe detenerlo.
    const focusIn = (e: FocusEvent) => { hold.current.focus = (e.target as Element).matches(':focus-visible'); };
    const focusOut = (e: FocusEvent) => { if (!el.contains(e.relatedTarget as Node)) hold.current.focus = false; };
    const interact = () => setRestart((n) => n + 1); // deslizar con el dedo o el trackpad
    el.addEventListener('focusin', focusIn);
    el.addEventListener('focusout', focusOut);
    track.current?.addEventListener('pointerdown', interact, { passive: true });
    track.current?.addEventListener('wheel', interact, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('focusin', focusIn);
      el.removeEventListener('focusout', focusOut);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const { focus, visible } = hold.current;
      const reading = track.current?.querySelector('details[open]');
      if (focus || !visible || reading || document.hidden) return;
      go(1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, restart]);

  return <section id="proyectos" className="projects-section section-block" ref={section}>
    <div className="section-heading" data-reveal>
      <h2>Proyectos seleccionados</h2>
      <div className="projects-controls">
        <span className="eyebrow">Web / Mobile / Backend</span>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-controls="projects-track" aria-label={playing ? 'Pausar el carrusel' : 'Reanudar el carrusel'}>
          <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden="true">{playing ? <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" /> : <path d="M3 1.2v9.6L10.5 6z" />}</svg>
        </button>
        <button type="button" onClick={() => navigate(-1)} aria-controls="projects-track" aria-label="Proyecto anterior">←</button>
        <button type="button" onClick={() => navigate(1)} aria-controls="projects-track" aria-label="Proyecto siguiente">→</button>
      </div>
    </div>
    <div className="projects-track" id="projects-track" ref={track} role="region" aria-roledescription="carrusel" aria-label="Proyectos" aria-live={playing ? 'off' : 'polite'}>
      {projects.map((p, i) => <article key={p.slug} className={`project project-${p.slug}`} data-reveal aria-label={`${i + 1} de ${projects.length}: ${p.title}`}>
        <a className="project-image" href={p.link?.href} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${p.title} en ${p.link?.label}`}>
          <div className="project-media-top"><span>{p.title}</span><span>{p.tag}</span></div>
          <span className="project-watermark" aria-hidden="true">{p.watermark}</span>
          {p.media === 'phones'
            ? <img src={p.image} alt={`Pantallas de ${p.title}`} width={800} height={950} loading="lazy" />
            : <div className="project-screen"><img src={p.image} alt={`Captura de ${p.title}`} width={1280} height={800} loading="lazy" /></div>}
          <div className="project-media-bottom"><span>{p.tagline}</span><span className="media-arrow" aria-hidden="true">↗</span></div>
        </a>
        <div className="project-title-row"><span className="project-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{p.title}</h3><p>{p.client}</p></div><a href={p.link?.href} target="_blank" rel="noopener noreferrer" className="project-arrow" aria-label={`Abrir ${p.title} en ${p.link?.label}`}>↗</a></div>
        <p className="project-summary">{p.summary}</p>
        <div className="project-meta"><span><strong>{p.metric.value}</strong> {p.metric.label}</span><span>{p.year}</span></div>
        <details className="project-details"><summary>Detalles del proyecto <span aria-hidden="true">+</span></summary><div className="project-details-content">
          <ul className="project-highlights">{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
          <ul className="tech-tags" aria-label="Tecnologías">{p.stack.map(t => <li key={t}>{t}</li>)}</ul>
          {p.link && <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="text-link">Ver en {p.link.label} ↗</a>}
        </div></details>
      </article>)}
    </div>
  </section>;
}
