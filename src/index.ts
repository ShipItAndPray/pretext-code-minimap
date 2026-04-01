export { Minimap } from "./minimap.js";
export { computeLayout, lineAtY } from "./layout.js";
export { renderMinimap } from "./renderer.js";
export { getLineAtCanvasY, clampScrollTop, getVisibleLineRange } from "./interactions.js";
export type {
  MinimapOptions,
  HighlightRange,
  MinimapLineInfo,
  ResolvedOptions,
  LayoutData,
} from "./types.js";

/**
 * Convenience factory function for creating a minimap.
 */
import type { MinimapOptions } from "./types.js";
import { Minimap } from "./minimap.js";

export function createMinimap(options: MinimapOptions): Minimap {
  return new Minimap(options);
}
