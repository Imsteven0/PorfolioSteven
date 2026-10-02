import { projects } from '../content';

export function Projects() {
  return <section id="proyectos" className="projects-section section-block">
    <div className="section-heading" data-reveal><h2>Proyectos seleccionados</h2><span className="eyebrow">Web / Mobile / Backend</span></div>
    <div className="projects-grid">{projects.map((p, i) => <article key={p.slug} className={`project project-${p.slug}`} data-reveal>
      <a className="project-image" href={p.link?.href} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${p.title} en ${p.link?.label}`}>
        <div className="project-media-top"><span>{p.title}</span><span>{i === 0 ? 'Plataforma integral' : 'App oficial · SENARA'}</span></div>
        <span className="project-watermark" aria-hidden="true">{i === 0 ? 'ALFACO' : 'DRAT'}</span>
        <img src={p.image} alt={`Pantallas de ${p.title}`} width={800} height={950} loading="lazy" />
        <div className="project-media-bottom"><span>{i === 0 ? 'Beneficios. Sin límites.' : 'El campo, conectado.'}</span><span className="media-arrow" aria-hidden="true">↗</span></div>
      </a>
      <div className="project-title-row"><span className="project-number">0{i + 1}</span><div><h3>{p.title}</h3><p>{p.client}</p></div><a href={p.link?.href} target="_blank" rel="noopener noreferrer" className="project-arrow" aria-label={`Abrir ${p.title} en ${p.link?.label}`}>↗</a></div>
      <p className="project-summary">{p.summary}</p>
      <div className="project-meta"><span><strong>{p.metric.value}</strong> {p.metric.label}</span><span>{p.year}</span></div>
      <details className="project-details"><summary>Detalles del proyecto <span aria-hidden="true">+</span></summary><div className="project-details-content">
        <ul className="project-highlights">{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
        <ul className="tech-tags" aria-label="Tecnologías">{p.stack.map(t => <li key={t}>{t}</li>)}</ul>
        {p.link && <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="text-link">Ver en {p.link.label} ↗</a>}
      </div></details>
    </article>)}</div>
  </section>;
}
