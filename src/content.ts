// Todo el texto del portafolio vive aquí: edita este archivo para actualizar la página.

const CAREER_START = new Date(2022, 7); // Agosto 2022, primer empleo (COCOCO)
const yearsOfExperience = Math.floor(
  (Date.now() - CAREER_START.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
);

export const profile = {
  name: 'Steven Araya',
  firstName: 'Steven',
  lastName: 'Araya',
  role: 'Full-Stack & Mobile Developer',
  degree: 'Ingeniero en Tecnologías de Información',
  university: 'Universidad Técnica Nacional',
  location: 'Costa Rica',
  available: true,
  yearsOfExperience,
  email: 'stevenaraya005@gmail.com',
  links: {
    github: 'https://github.com/Imsteven0',
    linkedin: 'https://www.linkedin.com/in/steven-araya-gonzalez-228aa0217/',
  },
};

export const about = [
  `Llevo más de ${yearsOfExperience} años construyendo aplicaciones web y móviles, tanto en empresas consolidadas como desarrollador freelance, adaptándome a entornos y necesidades de negocio muy distintas.`,
  'Me gusta crear soluciones escalables que resuelvan problemas reales. Soy proactivo, disfruto el trabajo en equipo y estoy en constante aprendizaje.',
];

export type Project = {
  slug: string;
  title: string;
  client: string;
  year: string;
  summary: string;
  image: string;
  /** Cómo se muestra la imagen: maqueta de teléfonos (PNG recortado) o captura dentro de una ventana. */
  media: 'phones' | 'screen';
  /** Textos sobre la imagen: etiqueta arriba a la derecha, palabra de fondo y lema abajo. */
  tag: string;
  watermark: string;
  tagline: string;
  metric: { value: string; label: string };
  highlights: string[];
  stack: string[];
  link?: { label: string; href: string };
};

export const projects: Project[] = [
  {
    slug: 'alfaco',
    title: 'ALFACO',
    client: 'Gestión de beneficios empresariales',
    year: '2024 — 2025',
    summary:
      'Plataforma integral para gestionar beneficios laborales de alimentación, transporte y deportes en múltiples proyectos. Tres aplicaciones integradas: API REST, panel administrativo web y app móvil offline-first que valida consumos con QR/NFC incluso sin conexión.',
    image: '/projects/alfaco.webp',
    media: 'phones',
    tag: 'Plataforma integral',
    watermark: 'ALFACO',
    tagline: 'Beneficios. Sin límites.',
    metric: { value: '2,500+', label: 'empleados gestionados' },
    highlights: [
      'Arquitectura offline-first con sincronización bidireccional (WatermelonDB)',
      'Validación de consumos por QR y NFC sin latencia',
      'Autenticación multi-rol con JWT y restricción geográfica',
      'Dashboards en tiempo real y reportes ejecutivos PDF / Excel',
      'Importación masiva por Excel y control de capacidad por proyecto',
    ],
    stack: ['React Native', 'Expo', 'React', 'Vite', 'Node.js', 'Express', 'PostgreSQL', 'Sequelize', 'Docker'],
    link: {
      label: 'Google Play',
      href: 'https://play.google.com/store/apps/details?id=com.ticservicios.alfacoapp',
    },
  },
  {
    slug: 'siao-movil',
    title: 'DRAT Móvil',
    client: 'SENARA — Gestión de riego',
    year: 'App oficial',
    summary:
      'Aplicación oficial para usuarios de riego del SENARA (Servicio Nacional de Aguas Subterráneas, Riego y Avenamiento de Costa Rica). Los agricultores gestionan parcelas, consultan estados de cuenta, pagan y reportan incidencias desde cualquier lugar.',
    image: '/projects/siao-movil.webp',
    media: 'phones',
    tag: 'App oficial · SENARA',
    watermark: 'DRAT',
    tagline: 'El campo, conectado.',
    metric: { value: 'iOS + Android', label: 'publicada en tiendas oficiales' },
    highlights: [
      'Pagos integrados con SINPE Móvil y transferencia bancaria',
      'Reporte de incidencias en tomas de agua con geolocalización',
      'Facturación electrónica conforme a Hacienda de Costa Rica',
      'Notificaciones push y actualizaciones OTA sin pasar por tiendas',
      'UX pensada para usuarios con distintos niveles de alfabetización digital',
    ],
    stack: ['React Native', 'Expo', 'TypeScript', 'Node.js', 'Express', 'SQL Server', 'JWT'],
    link: {
      label: 'Google Play',
      href: 'https://play.google.com/store/apps/details?id=com.ticservicios.dratmovil',
    },
  },
  {
    slug: 'sol-y-mar',
    title: 'Sol y Mar',
    client: 'Restaurante — Pedidos y facturación',
    year: '2025 — 2026',
    summary:
      'Sistema completo para un restaurante: panel administrativo, página pública para pedir en línea y app nativa para meseros. Gestiona menú con modificadores, mesas, reservaciones, caja y reportes, y emite facturación electrónica ante Hacienda de Costa Rica.',
    image: '/projects/sol-y-mar.webp',
    media: 'screen',
    tag: 'Sistema para restaurante',
    watermark: 'SOL Y MAR',
    tagline: 'Del pedido a la factura.',
    metric: { value: '3 apps', label: 'panel web, pedidos en línea y meseros' },
    highlights: [
      'Pedidos en línea públicos con protección anti-bots (Cloudflare Turnstile)',
      'Órdenes, mesas y reservaciones sincronizadas en tiempo real por WebSocket',
      'Facturación electrónica: XML firmado y envío a Hacienda de Costa Rica',
      'App nativa para meseros con notificaciones push de nuevos pedidos',
      'Caja, horarios del equipo y reportes en PDF / Excel',
    ],
    stack: ['React', 'Vite', 'TanStack Query', 'Zustand', 'Node.js', 'Express', 'PostgreSQL', 'Sequelize', 'WebSocket', 'React Native', 'Expo'],
    link: { label: 'la web', href: 'https://sol-y-mar.softnova.es/pedir' },
  },
  {
    slug: 'club-2030',
    title: 'Club Activo 20-30',
    client: 'Tilarán — Landing institucional',
    year: '2026',
    summary:
      'Landing editorial para el Club Activo 20-30 Internacional de Tilarán, organización de servicio comunitario en Guanacaste. Narrativa cinematográfica guiada por el scroll: los videos avanzan y retroceden cuadro a cuadro con el desplazamiento y cada capítulo entra con animaciones reversibles.',
    image: '/projects/club-2030.webp',
    media: 'screen',
    tag: 'Landing cinematográfica',
    watermark: '20-30',
    tagline: 'Una mano pequeña.',
    metric: { value: 'Astro + GSAP', label: 'sitio estático en Cloudflare Pages' },
    highlights: [
      'Videos controlados por el scroll, cuadro a cuadro, en ambas direcciones',
      'Videos recodificados con fotogramas clave cada 250 ms y cargados en memoria: cada salto es local',
      'Capítulos con GSAP ScrollTrigger y desplazamiento suave con Lenis',
      'HTML estático con una capa mínima de TypeScript: menú móvil, contadores y formulario',
      'Feeds de Facebook e Instagram integrados',
    ],
    stack: ['Astro', 'TypeScript', 'GSAP', 'Lenis', 'Bunny CDN', 'Cloudflare Pages'],
    link: { label: 'la web', href: 'https://club-20-30-tilaran.pages.dev/' },
  },
  {
    slug: 'rugama',
    title: 'Rugama Lavacar',
    client: 'Lavacar — Ventas, órdenes y facturación',
    year: '2025 — 2026',
    summary:
      'Sistema de gestión para un lavacar con varias sucursales: punto de venta con lector de código de barras, órdenes de servicio por vehículo asignadas al equipo, inventario y caja por sucursal, y facturación electrónica ante Hacienda de Costa Rica.',
    image: '/projects/rugama.webp',
    media: 'screen',
    tag: 'Sistema para lavacar',
    watermark: 'RUGAMA',
    tagline: 'Cada vehículo, en orden.',
    metric: { value: 'Multisucursal', label: 'inventario, precios y caja por sede' },
    highlights: [
      'Punto de venta con lector de código de barras, cotizaciones, descuentos y exoneraciones',
      'Facturación electrónica v4.4: factura, tiquete y notas de crédito firmadas y enviadas a Hacienda',
      'Órdenes de servicio por vehículo y cliente, con responsables e historial de estados',
      'Inventario y precios por sucursal; caja con apertura, cierre, egresos y movimientos',
      'Reportes de ventas, caja y órdenes exportables a Excel; instalable como app (PWA)',
    ],
    stack: ['React', 'Vite', 'TanStack Query', 'Zustand', 'Radix UI', 'Tailwind CSS', 'Node.js', 'Express', 'PostgreSQL', 'Sequelize', 'Docker'],
    link: { label: 'la web', href: 'https://rugama.softnova.es/login' },
  },
];

/** Apps publicadas en Google Play / App Store (dato del hero). */
export const storeApps = projects.filter((p) => p.link && /play\.google|apps\.apple/.test(p.link.href)).length;

export type Job = {
  company: string;
  url?: string;
  role: string;
  period: string;
  description: string;
};

export const experience: Job[] = [
  {
    company: 'ALFACO',
    url: 'https://www.alfa.cr/',
    role: 'Full-Stack & Mobile Developer · Freelance',
    period: '2024 — 2025',
    description:
      'Desarrollé desde cero un sistema de gestión de beneficios con API REST, panel web y app móvil multiplataforma: arquitectura offline-first con sincronización automática, autenticación multi-rol JWT, validación QR/NFC y reportería ejecutiva.',
  },
  {
    company: 'TIC-Servicios',
    url: 'https://tic-servicios.com/',
    role: 'Full-Stack Developer',
    period: 'Abr 2023 — Actualidad',
    description:
      'Desarrollo de una aplicación web robusta con tres grandes módulos —Operaciones, Administración e Infraestructura— para la gestión integral de la empresa, mejorando la eficiencia, el control y la toma de decisiones.',
  },
  {
    company: 'TIC-Servicios',
    url: 'https://tic-servicios.com/',
    role: 'Backend Developer',
    period: 'Dic 2022 — Abr 2023',
    description:
      'Implementé una API que automatiza el envío de documentos electrónicos al Ministerio de Hacienda, liberando carga de trabajo manual y mejorando tiempos de envío, calidad del servicio y cumplimiento normativo.',
  },
  {
    company: 'COCOCO',
    url: 'https://cococo.co.cr/',
    role: 'Full-Stack Developer',
    period: 'Ago 2022 — Abr 2023',
    description:
      'Diseñé e implementé funciones clave de una aplicación interna de seguimiento de incidencias: captura, asignación a usuarios y recordatorios por Telegram o correo electrónico.',
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: 'Frontend', items: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS', 'Astro'] },
  { group: 'Mobile', items: ['React Native', 'Expo', 'NativeWind', 'Push Notifications', 'OTA Updates'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'REST APIs', 'JWT'] },
  { group: 'Datos', items: ['SQL Server', 'PostgreSQL', 'MongoDB', 'Sequelize'] },
  { group: 'Herramientas', items: ['Git', 'GitHub', 'Docker'] },
];
