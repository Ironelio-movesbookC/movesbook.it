/** Deepest sublevel that receives an extra indent step (4th sublevel). */
export const DESK_TREE_MAX_SCALED_DEPTH = 4;

/** Fixed left indent added once per nested DOM level (not cumulative by depth index). */
export const DESK_TREE_INSET_PER_LEVEL = 28;

/** Depth used for layout; capped so level 5+ matches level 4. */
export function deskTreeVisualDepth(depth: number): number {
  return Math.min(Math.max(0, depth), DESK_TREE_MAX_SCALED_DEPTH);
}

/**
 * One fixed step per nested row. Rows render inside their parent, so indent
 * compounds naturally — do not multiply by depth or steps grow unevenly.
 */
export function deskTreeHorizontalInset(depth: number): number {
  if (depth === 0 || depth > DESK_TREE_MAX_SCALED_DEPTH) {
    return 0;
  }
  return DESK_TREE_INSET_PER_LEVEL;
}

/** Left-only indent so nested rows fill to the right (no right-side gap). */
export function deskTreeRowInsetStyle(depth: number): { paddingLeft: number } {
  const inset = deskTreeHorizontalInset(depth);
  return inset > 0 ? { paddingLeft: inset } : {};
}
