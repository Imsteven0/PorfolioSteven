import { experience } from '../content';
export function Experience() {
  return <section id="experiencia" className="experience-section section-block">
    <div className="section-heading" data-reveal><h2>Experiencia</h2><span className="eyebrow">Desde 2022, construyendo</span></div>
    <ol className="experience-list">{experience.map((job, i) => <li key={job.company + job.period} data-reveal>
      <span className="experience-index">0{i + 1}</span>
      <div className="experience-company"><h3>{job.url ? <a className="link-underline" href={job.url} target="_blank" rel="noopener noreferrer">{job.company} <span aria-hidden="true">↗</span></a> : job.company}</h3><p>{job.role}</p></div>
      <p className="experience-description">{job.description}</p><p className="experience-period">{job.period}</p>
    </li>)}</ol>
  </section>;
}
