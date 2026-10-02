/**
 * Reacción del personaje a un golpecito (clic, toque o teclado).
 *
 * Lógica pura, sin three.js ni React, para poder comprobarla con scripts/check-reaction.ts:
 * - La cabeza responde como un resorte amortiguado. Cada golpe suma velocidad en lugar de
 *   reiniciar la animación, así que varios golpes seguidos se encadenan sin saltos.
 * - Varios golpes en poco tiempo lo marean: la cabeza traza círculos durante unos segundos.
 * - Las estrellas aparecen con cada golpe y duran más mientras está mareado.
 * - Párpados (`eyesClosed`, morph target `blink`): parpadea solo cada pocos segundos, aprieta los
 *   ojos con cada golpe y los deja caídos mientras está mareado.
 *
 * Los ángulos están en radianes y se suman a los de la mirada (ver Character.tsx):
 * roll > 0 inclina la cabeza hacia la izquierda de la pantalla, yaw > 0 la gira hacia la
 * izquierda y pitch > 0 la baja.
 */

const FREQUENCY = 15; // rad/s del resorte: ~2.4 oscilaciones por segundo
const DAMPING = 0.22; // < 1: rebota un par de veces antes de quedarse quieto
const STEP = 1 / 240; // paso fijo de integración: se mueve igual a 30 o a 144 fps
const MAX_ANGLE = 0.35; // con más giro la malla del cuello se estira demasiado
const IMPULSE = { roll: 0.2, pitch: 0.12, yaw: 0.1 }; // amplitud aproximada de un golpe

const COMBO_WINDOW = 1.4; // segundos: golpes dentro de esta ventana cuentan para el mareo
const COMBO_HITS = 3;
const DIZZY_TIME = 2.6;
const DIZZY_SPEED = 2 * Math.PI * 1.2; // vueltas de la cabeza por segundo, en rad/s
const DIZZY_ROLL = 0.08;
const DIZZY_PITCH = 0.04;

const STARS_TIME = 1.8;
const STARS_POP = 0.3; // entrada con rebote
const STARS_FADE = 0.45; // salida
const STARS_SPIN = 3; // rad/s; mareado giran más rápido
const STARS_SPIN_DIZZY = 5;

// Parpadeo: cierra rápido y abre más lento, como uno real (~0.25 s en total).
const BLINK_EVERY = [2.5, 6]; // segundos entre parpadeos, al azar
const DOUBLE_BLINK = 0.2; // probabilidad de que el siguiente llegue enseguida (doble parpadeo)
const BLINK_CLOSE = 0.07;
const BLINK_HOLD = 0.04;
const BLINK_OPEN = 0.14;
const SQUEEZE_HOLD = 0.28; // ojos apretados tras un golpe…
const SQUEEZE_OPEN = 0.2; // …y cuánto tardan en abrir
const DIZZY_LIDS = 0.45; // párpados caídos mientras está mareado

type Angles = { roll: number; pitch: number; yaw: number };
const AXES = ['roll', 'pitch', 'yaw'] as const;

export class HeadReaction {
  /** Desplazamiento total de la cabeza (resorte + mareo), ya limitado a ±MAX_ANGLE. */
  readonly angles: Angles = { roll: 0, pitch: 0, yaw: 0 };
  /** Visibilidad de las estrellas, 0 → 1: baja a 0 en la salida. */
  starsVisible = 0;
  /** Escala de entrada de las estrellas, con un leve rebote por encima de 1. */
  starsScale = 0;
  /** Ángulo acumulado de la órbita de las estrellas. */
  starsSpin = 0;
  dizzy = false;
  /** Párpados: 0 = abiertos, 1 = cerrados. */
  eyesClosed = 0;

  private spring: Angles = { roll: 0, pitch: 0, yaw: 0 };
  private velocity: Angles = { roll: 0, pitch: 0, yaw: 0 };
  private recentHits: number[] = [];
  private dizzyFrom = -Infinity;
  private dizzyUntil = -Infinity;
  private starsFrom = -Infinity;
  private starsUntil = -Infinity;
  private lastHit = -Infinity;
  private blinkAt = -Infinity;
  private nextBlink = Number.NaN;

  private readonly random: () => number;

  /** `random` se inyecta para poder probar el parpadeo de forma determinista. */
  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  /**
   * Registra un golpe. `side` es dónde cayó respecto a la cabeza: -1 a la izquierda de la
   * pantalla, 1 a la derecha, 0 de frente. El lado golpeado se va hacia atrás y la cabeza se
   * inclina alejándose del golpe; siempre cabecea un poco hacia abajo.
   */
  hit(time: number, side: number) {
    const s = Number.isFinite(side) ? clamp(side, -1, 1) : 0;
    this.lastHit = time;
    this.velocity.roll += IMPULSE.roll * s * FREQUENCY;
    this.velocity.yaw += IMPULSE.yaw * s * FREQUENCY;
    this.velocity.pitch += IMPULSE.pitch * FREQUENCY;

    if (!this.isDizzy(time)) {
      this.recentHits = this.recentHits.filter((t) => time - t < COMBO_WINDOW);
      this.recentHits.push(time);
      if (this.recentHits.length >= COMBO_HITS) {
        this.dizzyFrom = time;
        this.dizzyUntil = time + DIZZY_TIME;
        this.recentHits = [];
      }
    }

    // Si ya se veían, solo se alargan: reiniciar la entrada las haría parpadear.
    if (time >= this.starsUntil) this.starsFrom = time;
    const end = this.isDizzy(time) ? this.dizzyUntil + 0.3 : time + STARS_TIME;
    this.starsUntil = Math.max(this.starsUntil, end);
  }

  update(time: number, dt: number) {
    const frame = clamp(dt, 0, 0.1); // tras una pestaña en segundo plano no da un salto
    let remaining = frame;
    while (remaining > 1e-6) {
      const h = Math.min(STEP, remaining);
      remaining -= h;
      for (const axis of AXES) {
        // Euler semi-implícito: estable con este paso (FREQUENCY * STEP ≪ 2).
        const accel = -FREQUENCY * FREQUENCY * this.spring[axis] - 2 * DAMPING * FREQUENCY * this.velocity[axis];
        this.velocity[axis] += accel * h;
        this.spring[axis] += this.velocity[axis] * h;
        if (Math.abs(this.spring[axis]) > MAX_ANGLE) {
          this.spring[axis] = Math.sign(this.spring[axis]) * MAX_ANGLE;
          this.velocity[axis] = 0;
        }
      }
    }

    this.dizzy = this.isDizzy(time);
    let dizzyRoll = 0;
    let dizzyPitch = 0;
    if (this.dizzy) {
      const age = time - this.dizzyFrom;
      const envelope = smoothstep(0, 0.3, age) * smoothstep(0, 0.9, this.dizzyUntil - time);
      const phase = age * DIZZY_SPEED;
      dizzyRoll = Math.sin(phase) * DIZZY_ROLL * envelope;
      dizzyPitch = (1 - Math.cos(phase)) * 0.5 * DIZZY_PITCH * envelope;
    }
    this.angles.roll = clamp(this.spring.roll + dizzyRoll, -MAX_ANGLE, MAX_ANGLE);
    this.angles.pitch = clamp(this.spring.pitch + dizzyPitch, -MAX_ANGLE, MAX_ANGLE);
    this.angles.yaw = this.spring.yaw;
    this.updateEyes(time);

    const left = this.starsUntil - time;
    if (left <= 0) {
      this.starsVisible = 0;
      this.starsScale = 0;
      return;
    }
    this.starsVisible = smoothstep(0, STARS_FADE, left);
    this.starsScale = easeOutBack(Math.min(1, (time - this.starsFrom) / STARS_POP));
    this.starsSpin += frame * (this.dizzy ? STARS_SPIN_DIZZY : STARS_SPIN);
  }

  private updateEyes(time: number) {
    if (Number.isNaN(this.nextBlink)) this.nextBlink = time + this.blinkInterval();
    if (time >= this.nextBlink) {
      this.blinkAt = time;
      this.nextBlink = time + (this.random() < DOUBLE_BLINK ? 0.3 : this.blinkInterval());
    }
    const blink = blinkCurve(time - this.blinkAt);
    const sinceHit = time - this.lastHit;
    const squeeze = sinceHit < SQUEEZE_HOLD ? smoothstep(0, BLINK_CLOSE, sinceHit)
      : 1 - smoothstep(SQUEEZE_HOLD, SQUEEZE_HOLD + SQUEEZE_OPEN, sinceHit);
    const droop = this.dizzy
      ? DIZZY_LIDS * smoothstep(0, 0.4, time - this.dizzyFrom) * smoothstep(0, 0.6, this.dizzyUntil - time)
      : 0;
    this.eyesClosed = Math.max(blink, squeeze, droop);
  }

  private blinkInterval() {
    return BLINK_EVERY[0] + this.random() * (BLINK_EVERY[1] - BLINK_EVERY[0]);
  }

  private isDizzy(time: number) {
    return time >= this.dizzyFrom && time < this.dizzyUntil;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function blinkCurve(t: number) {
  if (t < 0 || t > BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN) return 0;
  if (t < BLINK_CLOSE) return smoothstep(0, BLINK_CLOSE, t);
  return 1 - smoothstep(BLINK_CLOSE + BLINK_HOLD, BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN, t);
}

function easeOutBack(t: number) {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}
