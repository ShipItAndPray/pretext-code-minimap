import type { LayoutData } from "./types.js";
import { lineAtY } from "./layout.js";

/**
 * Convert a canvas Y coordinate (accounting for scroll) to a source line number.
 */
export function getLineAtCanvasY(
  layoutData: LayoutData,
  canvasY: number,
  scrollTop: number,
): number {
  return lineAtY(layoutData, canvasY + scrollTop);
}

/**
 * Compute the scroll top needed to keep the minimap content within bounds.
 */
export function clampScrollTop(
  scrollTop: number,
  totalContentHeight: number,
  canvasHeight: number,
): number {
  if (totalContentHeight <= canvasHeight) return 0;
  return Math.max(0, Math.min(scrollTop, totalContentHeight - canvasHeight));
}

/**
 * Get the range of source lines currently visible within the minimap canvas.
 */
export function getVisibleLineRange(
  layoutData: LayoutData,
  scrollTop: number,
  canvasHeight: number,
): { startLine: number; endLine: number } {
  if (layoutData.lines.length === 0) {
    return { startLine: 0, endLine: 0 };
  }

  const startLine = lineAtY(layoutData, scrollTop);
  const endLine = lineAtY(layoutData, scrollTop + canvasHeight);

  return { startLine, endLine };
}
