import { lazy, Suspense } from 'react';
import { profile, projects } from '../content';
import { Loader } from './Loader';
import { poke } from '../scene/store';
const Stage = lazy(() => import('../scene/Stage'));

export function Hero() {
  return <section id="inicio" className="hero">
    <p className="hero-word" aria-hidden="true">Portafolio</p>
    <div className="hero-portrait" role="img" aria-label="Retrato 3D de Steven Araya"><Suspense fallback={null}><Stage /></Suspense><Loader /></div>
    {/* Equivalente por teclado del clic sobre el personaje; solo se ve al enfocarlo. */}
    <button type="button" className="portrait-poke" onClick={() => poke(Math.random() < 0.5 ? -1 : 1)}>Darle un golpecito a Steven</button>
    <div className="hero-intro" data-reveal>
      <p className="handwritten">Hola, soy</p>
      <h1>{profile.firstName}<br />{profile.lastName}<span className="sr-only"> — {profile.role}</span></h1>
      <p className="hero-role">Full-Stack &<br />Mobile Developer</p>
      <p className="hero-description">Transformo ideas en aplicaciones web y móviles. Software pensado para las personas que lo usan.</p>
      <a className="availability" href="#contacto"><span className="status-dot" />Disponible para proyectos</a>
    </div>
    <aside className="hero-aside" aria-label="Mi trabajo en cifras" data-reveal="0.15">
      <div className="hero-note"><span className="star-orbit" aria-hidden="true">✦</span><p>De la primera idea<br />a la última línea<br />de código.</p></div>
      <dl className="hero-stats">
        <div><dt>Años de<br />experiencia</dt><dd>{profile.yearsOfExperience}+</dd></div>
        <div><dt>Apps en tiendas<br />oficiales</dt><dd>{projects.length.toString().padStart(2, '0')}</dd></div>
        <div><dt>Empleados en<br />ALFACO</dt><dd>2.5k+</dd></div>
      </dl>
    </aside>
    <div className="hero-bottom"><span>Desarrollo desde {profile.location}</span><a href="#proyectos">Explora mi trabajo <span aria-hidden="true">↓</span></a><span>{new Date().getFullYear()}</span></div>
  </section>;
}
