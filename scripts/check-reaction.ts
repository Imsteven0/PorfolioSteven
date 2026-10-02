// Comprobación de la reacción al golpecito: npm run check:reaction
import assert from 'node:assert/strict';
import { HeadReaction } from '../src/scene/reaction.ts';

function simulate(reaction: HeadReaction, from: number, to: number, fps: number) {
  for (let t = from; t < to; t += 1 / fps) reaction.update(t + 1 / fps, 1 / fps);
}

// Un golpe a la derecha: la cabeza se inclina hacia la izquierda, aparecen estrellas y luego todo vuelve a reposo.
{
  const r = new HeadReaction();
  r.hit(0, 1);
  simulate(r, 0, 0.08, 60);
  assert.ok(r.angles.roll > 0.05 && r.angles.yaw > 0 && r.angles.pitch > 0, 'reacciona hacia el lado contrario al golpe');
  assert.ok(r.starsVisible === 1 && r.starsScale > 0, 'muestra estrellas');
  assert.equal(r.dizzy, false, 'un golpe no marea');
  simulate(r, 0.08, 3, 60);
  for (const value of Object.values(r.angles)) assert.ok(Math.abs(value) < 0.002, 'vuelve a reposo');
  assert.equal(r.starsVisible, 0, 'las estrellas desaparecen');
}

// La animación no depende de los fps.
{
  const slow = new HeadReaction();
  const fast = new HeadReaction();
  slow.hit(0, -1);
  fast.hit(0, -1);
  simulate(slow, 0, 0.3, 30);
  simulate(fast, 0, 0.3, 144);
  assert.ok(Math.abs(slow.angles.roll - fast.angles.roll) < 0.01, 'igual a 30 y a 144 fps');
}

// Golpes seguidos: se marea, los ángulos nunca pasan del límite y las estrellas duran más.
{
  const r = new HeadReaction();
  for (let i = 0; i < 12; i++) {
    r.hit(i * 0.1, 1);
    simulate(r, i * 0.1, (i + 1) * 0.1, 60);
    for (const value of Object.values(r.angles)) assert.ok(Math.abs(value) <= 0.35, 'nunca pasa del límite');
  }
  assert.equal(r.dizzy, true, 'varios golpes lo marean');
  simulate(r, 1.2, 3, 60);
  assert.ok(r.starsVisible > 0, 'mareado, las estrellas siguen');
  simulate(r, 3, 6, 60);
  assert.equal(r.dizzy, false, 'el mareo termina');
  assert.equal(r.starsVisible, 0);
}

// Párpados: parpadea solo, aprieta los ojos con el golpe y vuelve a abrirlos.
{
  const r = new HeadReaction(() => 0.5); // intervalo fijo: 2.5 + 0.5 * 3.5 = 4.25 s
  let closedAt = -1;
  for (let t = 0; t < 6; t += 1 / 60) {
    r.update(t, 1 / 60);
    if (r.eyesClosed > 0.95 && closedAt < 0) closedAt = t;
  }
  assert.ok(closedAt > 4 && closedAt < 4.5, `parpadea solo (cerró a los ${closedAt.toFixed(2)} s)`);
  assert.ok(r.eyesClosed < 0.01, 'después del parpadeo los ojos quedan abiertos');

  r.hit(6, 0);
  simulate(r, 6, 6.15, 60);
  assert.ok(r.eyesClosed > 0.95, 'aprieta los ojos con el golpe');
  simulate(r, 6.15, 7, 60);
  assert.ok(r.eyesClosed < 0.01, 'y los vuelve a abrir');
}

// Entradas raras no rompen nada.
{
  const r = new HeadReaction();
  r.hit(0, Number.NaN);
  r.update(0.016, 10); // un dt enorme (pestaña en segundo plano) se recorta
  for (const value of Object.values(r.angles)) assert.ok(Number.isFinite(value));
}

console.log('reaction: ok');
