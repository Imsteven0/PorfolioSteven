import { profile, skills } from '../content';
const process = [
  { title: 'Entender', text: 'El problema, las personas y lo que necesita el negocio.', icon: 'search' },
  { title: 'Definir', text: 'Flujos, arquitectura y una base que pueda crecer.', icon: 'layers' },
  { title: 'Construir', text: 'Interfaces, APIs y apps móviles conectadas.', icon: 'code' },
  { title: 'Validar', text: 'Probar cada flujo y cuidar los detalles de uso.', icon: 'check' },
  { title: 'Entregar', text: 'Llevar a producción, observar y seguir mejorando.', icon: 'arrow' },
];
function ProcessIcon({ type }: { type: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{type === 'search' ? <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5" /></> : type === 'layers' ? <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></> : type === 'code' ? <><path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18" /></> : type === 'check' ? <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></> : <><path d="m3 11 18-8-8 18-2-8-8-2Z" /><path d="m11 13 5-5" /></>}</svg>;
}
export function Skills() {
  return <section id="stack" className="craft-section section-block">
    <div className="craft-skills" data-reveal><h2>Formación & stack</h2><div className="education"><p className="eyebrow">Formación</p><h3>{profile.degree}</h3><p>{profile.university}</p></div><div className="skill-groups">{skills.map(group => <div key={group.group}><h3 className="eyebrow">{group.group}</h3><ul className="tech-tags">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></div>
    <div className="craft-process" data-reveal="0.1"><h2>Cómo trabajo</h2><ol className="process-list">{process.map((step, i) => <li key={step.title}><span className="process-number">0{i + 1}</span><span className="process-icon"><ProcessIcon type={step.icon} /></span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></div>
    <aside className="craft-manifesto" data-reveal="0.2"><span className="manifesto-mark" aria-hidden="true">“</span><p>El mejor código<br />empieza por<br />entender a<br /><em>las personas.</em></p><span className="handwritten">Steven Araya</span><a href="#contacto">Demos forma<br />a tu próxima idea <span aria-hidden="true">↗</span></a></aside>
  </section>;
}
