import Matter from "matter-js";

import { FLOOR_Y, HEAL_DELAY, SURFACE_Y, WORLD_W } from "./constants";
import { tokenSize } from "./tokens";

const { Bodies, Body, Composite, Engine, Events, Mouse, MouseConstraint, Sleeping } = Matter;

export type Pose = { x: number; y: number; angle: number };

export type TokenRecord = {
  id: string;
  emoji: string;
  word: string;
  createdAt: string;
  body: Matter.Body;
  w: number;
  h: number;
  /** Authoritative rest pose, once known. Healing springs toward it. */
  rest: Pose | null;
  /** Still falling from a drop; not yet eligible to heal. */
  falling: boolean;
  /** Seconds since last disturbed; healing waits for HEAL_DELAY. */
  disturbed: number;
  /** For our own drop: frames at rest, to decide when it has settled. */
  stillFrames: number;
};

/**
 * The shaft as a Matter.js world.
 *
 * Walls, a floor, static slabs for the content, and one body per token.
 * Sleeping is on: a pile of two thousand tokens costs almost nothing while
 * nobody touches it. Healing is a spring per displaced token, applied only to
 * tokens that are awake and away from their rest pose, so it never wakes the
 * pile by itself.
 */
export class DigWorld {
  readonly engine: Matter.Engine;
  readonly tokens = new Map<string, TokenRecord>();
  readonly bodyToId = new Map<number, string>();
  private mouseConstraint: Matter.MouseConstraint | null = null;
  private dragging: TokenRecord | null = null;
  private slabBodies: Matter.Body[] = [];

  onCollision: ((impact: number) => void) | null = null;

  constructor() {
    this.engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1.4 } });
    this.engine.timing.timeScale = 1;

    const thick = 200;
    const walls = [
      Bodies.rectangle(-thick / 2, FLOOR_Y / 2, thick, FLOOR_Y * 2, { isStatic: true, label: "wall" }),
      Bodies.rectangle(WORLD_W + thick / 2, FLOOR_Y / 2, thick, FLOOR_Y * 2, { isStatic: true, label: "wall" }),
      Bodies.rectangle(WORLD_W / 2, FLOOR_Y + thick / 2, WORLD_W + thick * 2, thick, {
        isStatic: true,
        label: "floor",
        friction: 0.9,
      }),
    ];
    Composite.add(this.engine.world, walls);

    Events.on(this.engine, "collisionStart", (event) => {
      if (!this.onCollision) return;
      let impact = 0;
      for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        impact = Math.max(impact, Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y));
      }
      if (impact > 1.5) this.onCollision(impact);
    });
  }

  /** A static rectangle the pile rests around: a slab of content. */
  addSlab(x: number, y: number, w: number, h: number) {
    const body = Bodies.rectangle(x + w / 2, y + h / 2, w, h, {
      isStatic: true,
      label: "slab",
      friction: 0.8,
      chamfer: { radius: 6 },
    });
    this.slabBodies.push(body);
    Composite.add(this.engine.world, body);
  }

  /**
   * Adds a token. With `rest` it is placed there, asleep — the pose is the
   * truth and needs no simulating. With `dropAt` it falls from that point.
   */
  addToken(
    token: { id: string; emoji: string; word: string; createdAt: string },
    placement: { rest: Pose } | { dropAt: { x: number; y: number } },
  ) {
    if (this.tokens.has(token.id)) return this.tokens.get(token.id)!;
    const { w, h } = tokenSize(token.word);
    const body = Bodies.rectangle(0, 0, w, h, {
      chamfer: { radius: h / 2 - 1 },
      friction: 0.6,
      frictionAir: 0.02,
      restitution: 0.18,
      density: 0.002,
      label: "token",
    });

    const record: TokenRecord = {
      ...token,
      body,
      w,
      h,
      rest: null,
      falling: false,
      disturbed: HEAL_DELAY,
      stillFrames: 0,
    };

    if ("rest" in placement) {
      record.rest = placement.rest;
      Body.setPosition(body, { x: placement.rest.x, y: placement.rest.y });
      Body.setAngle(body, placement.rest.angle);
      Composite.add(this.engine.world, body);
      Sleeping.set(body, true);
    } else {
      record.falling = true;
      Body.setPosition(body, placement.dropAt);
      Body.setAngle(body, (Math.random() - 0.5) * 0.4);
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
      Composite.add(this.engine.world, body);
    }

    this.tokens.set(token.id, record);
    this.bodyToId.set(body.id, token.id);
    return record;
  }

  /** The authoritative pose arrived (from the dropper, via Realtime). */
  setRest(id: string, rest: Pose) {
    const record = this.tokens.get(id);
    if (!record) return;
    record.rest = rest;
    record.falling = false;
    record.disturbed = HEAL_DELAY;
  }

  remove(id: string) {
    const record = this.tokens.get(id);
    if (!record) return;
    Composite.remove(this.engine.world, record.body);
    this.tokens.delete(id);
    this.bodyToId.delete(record.body.id);
  }

  /** Attach dragging to a canvas; call `setView` each frame with the camera. */
  attachMouse(canvas: HTMLCanvasElement) {
    const mouse = Mouse.create(canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: { stiffness: 0.12, damping: 0.08, render: { visible: false } },
      collisionFilter: { mask: 0x0001 },
    });
    Composite.add(this.engine.world, this.mouseConstraint);

    // The wheel must scroll the page, not be eaten by Matter. The handler is
    // an untyped internal, hence the cast.
    const el = mouse.element as HTMLElement;
    const wheel = (mouse as unknown as { mousewheel: EventListener }).mousewheel;
    el.removeEventListener("wheel", wheel);
    el.removeEventListener("DOMMouseScroll", wheel);

    Events.on(this.mouseConstraint, "startdrag", (e) => {
      const id = this.bodyToId.get((e as unknown as { body: Matter.Body }).body.id);
      this.dragging = id ? (this.tokens.get(id) ?? null) : null;
    });
    Events.on(this.mouseConstraint, "enddrag", () => {
      if (this.dragging) this.dragging.disturbed = 0;
      this.dragging = null;
    });
  }

  get isDragging() {
    return this.dragging !== null;
  }

  /** Camera → mouse mapping. Matter's mouse works in element pixels. */
  setView(scale: number, offsetX: number, scrollY: number) {
    const mouse = this.mouseConstraint?.mouse;
    if (!mouse) return;
    Mouse.setScale(mouse, { x: 1 / scale, y: 1 / scale });
    Mouse.setOffset(mouse, { x: -offsetX / scale, y: scrollY / scale });
  }

  /** Random jolt to the whole pile. Everything heals afterwards. */
  earthquake(strength = 1) {
    for (const record of this.tokens.values()) {
      Sleeping.set(record.body, false);
      Body.applyForce(record.body, record.body.position, {
        x: (Math.random() - 0.5) * 0.06 * strength * record.body.mass,
        y: -Math.random() * 0.05 * strength * record.body.mass,
      });
      record.disturbed = 0;
    }
  }

  /** A token that has stopped moving for long enough is settled. */
  private static isStill(body: Matter.Body) {
    return body.speed < 0.08 && body.angularSpeed < 0.004;
  }

  /**
   * One physics step plus healing. Returns the ids of falling tokens that
   * have just come to rest, so the caller can persist a pose.
   */
  private accumulator = 0;

  tick(dtSeconds: number): string[] {
    // Fixed 60Hz substeps: Matter is only stable at ≤16.7ms, and a tab that
    // was hidden must not try to catch up on a whole minute at once.
    const dt = Math.min(dtSeconds, 0.1);
    this.accumulator += dt;
    const step = 1 / 60;
    let steps = 0;
    while (this.accumulator >= step && steps < 3) {
      Engine.update(this.engine, step * 1000);
      this.accumulator -= step;
      steps += 1;
    }
    if (steps === 3) this.accumulator = 0;

    const settled: string[] = [];

    for (const record of this.tokens.values()) {
      const { body } = record;

      if (record.falling) {
        record.stillFrames = DigWorld.isStill(body) ? record.stillFrames + 1 : 0;
        if (record.stillFrames > 40 || body.isSleeping) {
          record.falling = false;
          settled.push(record.id);
        }
        continue;
      }

      if (!record.rest || record === this.dragging) continue;

      const dx = record.rest.x - body.position.x;
      const dy = record.rest.y - body.position.y;
      let da = record.rest.angle - body.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const away = Math.hypot(dx, dy) > 0.6 || Math.abs(da) > 0.02;

      if (!away) {
        // Home. Pin exactly and let it sleep.
        if (!body.isSleeping) {
          Body.setPosition(body, { x: record.rest.x, y: record.rest.y });
          Body.setAngle(body, record.rest.angle);
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setAngularVelocity(body, 0);
          Sleeping.set(body, true);
        }
        continue;
      }

      // Displaced: wait out the heal delay, then spring home. The spring is
      // strong enough to climb out from under other tokens and shove them.
      record.disturbed += dt;
      if (record.disturbed < HEAL_DELAY) continue;

      Sleeping.set(body, false);
      const k = 0.0009 * body.mass;
      Body.applyForce(body, body.position, { x: dx * k, y: dy * k - 0.0014 * body.mass });
      Body.setAngularVelocity(body, body.angularVelocity * 0.8 + da * 0.05);
      Body.setVelocity(body, { x: body.velocity.x * 0.92, y: body.velocity.y * 0.92 });
    }

    return settled;
  }

  pose(id: string): Pose | null {
    const record = this.tokens.get(id);
    if (!record) return null;
    const { position, angle } = record.body;
    return { x: position.x, y: position.y, angle };
  }

  /** Bodies within a world-space window, for culled drawing. */
  *visible(top: number, bottom: number) {
    for (const record of this.tokens.values()) {
      const y = record.body.position.y;
      if (y > top - 80 && y < bottom + 80) yield record;
    }
  }

  static get surfaceY() {
    return SURFACE_Y;
  }
}
