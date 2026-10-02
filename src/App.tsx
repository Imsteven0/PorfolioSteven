import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { sceneState } from './scene/store';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Projects } from './components/Projects';
import { Experience } from './components/Experience';
import { Skills } from './components/Skills';
import { Contact } from './components/Contact';
gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
        gsap.from(el, { y: 20, opacity: 0, duration: 0.7, ease: 'power3.out', delay: Number(el.dataset.reveal) || 0, scrollTrigger: { trigger: el, start: 'top 92%' } });
      });
    });
  });
  useEffect(() => {
    const portrait = document.querySelector('.hero-portrait');
    const onMove = (e: PointerEvent) => {
      const bounds = portrait?.getBoundingClientRect();
      if (!bounds || e.clientY > bounds.bottom || e.clientY < bounds.top) return;
      sceneState.pointer.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
      sceneState.pointer.y = ((e.clientY - bounds.top) / bounds.height) * 2 - 1;
      if (e.pointerType === 'mouse') sceneState.pointer.lastMove = performance.now() / 1000;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return <><Nav /><main><Hero /><Projects /><About /><Experience /><Skills /><Contact /></main></>;
}
