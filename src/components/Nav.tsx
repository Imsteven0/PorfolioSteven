import { useEffect, useRef, useState } from 'react';
import { profile } from '../content';
const links = [{ href: '#sobre-mi', label: 'Sobre mí' }, { href: '#proyectos', label: 'Proyectos' }, { href: '#experiencia', label: 'Experiencia' }, { href: '#stack', label: 'Stack' }];

export function Nav() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return <header className="site-header">
    <a href="#inicio" className="brand" aria-label={`${profile.name}, inicio`} onClick={() => setOpen(false)}><span>Steven Araya<span className="brand-dot">.</span></span><small>Desarrollador web & móvil</small></a>
    <nav className="desktop-nav" aria-label="Secciones">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
    <a href="#contacto" className="header-contact">Hablemos <span aria-hidden="true">↗</span></a>
    <button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : 'Menú'} <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <nav id="mobile-nav" className="mobile-nav" aria-label="Secciones en móvil" hidden={!open}>
      {links.map((link, i) => <a key={link.href} href={link.href} onClick={() => setOpen(false)}><span>0{i + 1}</span>{link.label}<span aria-hidden="true">↗</span></a>)}
      <a href="#contacto" onClick={() => setOpen(false)}><span>05</span>Contacto<span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}
