import { profile } from '../content';
const links = [
  { label: 'Email', value: profile.email, href: `mailto:${profile.email}`, icon: 'mail' },
  { label: 'GitHub', value: 'github.com/Imsteven0', href: profile.links.github, icon: 'code' },
  { label: 'LinkedIn', value: 'Conectemos en LinkedIn', href: profile.links.linkedin, icon: 'link' },
];
function ContactIcon({ type }: { type: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{type === 'mail' ? <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 6 9 7 9-7" /></> : type === 'code' ? <><path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18" /></> : <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" /></>}</svg>;
}
export function Contact() {
  return <section id="contacto" className="contact-section section-block">
    <div className="contact-grid">
      <div data-reveal><p className="eyebrow">¿Tienes un proyecto en mente?</p><h2>Hagamos<br />algo <span>grande.</span><span className="contact-star" aria-hidden="true">✦</span></h2><p className="contact-copy">Una app, una plataforma o esa idea que llevas tiempo imaginando. Hablemos y hagámosla realidad.</p><a className="availability" href={`mailto:${profile.email}`}><span className="status-dot" />Disponible para proyectos</a></div>
      <div className="contact-links" data-reveal="0.1">{links.map(link => <a key={link.label} href={link.href} target={link.href.startsWith('https') ? '_blank' : undefined} rel="noopener noreferrer"><span className="contact-icon"><ContactIcon type={link.icon} /></span><span><small>{link.label}</small>{link.value}</span><span className="contact-link-arrow" aria-hidden="true">↗</span></a>)}<p className="contact-location"><span className="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span>{profile.location} · Trabajo remoto</p></div>
      <div className="contact-art" aria-hidden="true"><span>Ideas en código.</span><p>LET'S<br /><span>BUILD.</span></p><span>Web & mobile / {new Date().getFullYear()}</span></div>
    </div>
    <footer><p>© {new Date().getFullYear()} {profile.name}</p><p>Hecho con intención. Desde Costa Rica.</p><a href="#inicio">Volver arriba ↑</a></footer>
  </section>;
}
