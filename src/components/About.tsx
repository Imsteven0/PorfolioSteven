import { about, profile } from '../content';
export function About() {
  return <section id="sobre-mi" className="about-section section-block">
    <div className="about-title" data-reveal><p className="eyebrow"><span>01</span> Sobre mí</p><h2>Ideas claras.<br /><span>Software real.</span></h2><p className="about-location">{profile.location} <span aria-hidden="true">↗</span></p></div>
    <div className="about-copy" data-reveal><p className="about-lead">Construyo productos que conectan tecnología, personas y negocio.</p>{about.map(text => <p key={text}>{text}</p>)}<a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="text-link">Conoce mi código <span aria-hidden="true">↗</span></a></div>
  </section>;
}
