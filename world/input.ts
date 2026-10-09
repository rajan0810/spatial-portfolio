/**
 * Everything that can move the character: keys, a thumbstick on touch, and
 * click-to-walk. Read once per frame by the loop; nothing here touches React.
 */
export type Controls = {
  /** Normalised movement intent, -1..1. */
  x: number;
  y: number;
  run: boolean;
  /** Set by a tap or click; cleared when reached or when progress stalls. */
  target: { x: number; y: number } | null;
  /** Rising edge of the interact key, consumed by the loop. */
  interact: boolean;
};

const KEYS: Record<string, [number, number]> = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};

export function createControls(opts: { onInteract: () => void; onMenu: () => void; onClose: () => void }) {
  const held = new Set<string>();
  const controls: Controls = { x: 0, y: 0, run: false, target: null, interact: false };

  const recompute = () => {
    let x = 0;
    let y = 0;
    for (const key of held) {
      const v = KEYS[key];
      if (v) {
        x += v[0];
        y += v[1];
      }
    }
    const len = Math.hypot(x, y);
    controls.x = len > 0 ? x / len : 0;
    controls.y = len > 0 ? y / len : 0;
    // Any key press overrides a click destination.
    if (len > 0) controls.target = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const key = e.key.toLowerCase();

    if (key === "escape") {
      opts.onClose();
      return;
    }
    if (key === "e" || key === "enter" || key === " ") {
      e.preventDefault();
      opts.onInteract();
      return;
    }
    if (key === "m") {
      e.preventDefault();
      opts.onMenu();
      return;
    }
    if (key === "shift") controls.run = true;
    if (KEYS[key]) {
      e.preventDefault();
      held.add(key);
      recompute();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === "shift") controls.run = false;
    if (held.delete(key)) recompute();
  };

  // A key held while the tab loses focus would otherwise stick forever.
  const onBlur = () => {
    held.clear();
    controls.run = false;
    recompute();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return {
    controls,
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
