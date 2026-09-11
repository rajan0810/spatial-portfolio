/**
 * Hand-tracking state for the cursor, kept out of React like the rail.
 *
 * `pressed` and `hovering` change on every pointer event and are read every
 * frame by the hand mesh; that is exactly the traffic React state must not
 * carry. Panels and the desk write here from their pointer handlers.
 */
export const hand = {
  /** Pointer button held: the hand pinches. */
  pressed: false,
  /** Over something interactive: the hand points and the ray appears. */
  hovering: 0,
  /** Something is being dragged: keep the pinch even if the pointer leaves it. */
  grabbing: false,
};
