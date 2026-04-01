import {
  prepare,
  layout,
  type PreparedText,
} from "@chenglou/pretext";
import type { ResolvedOptions, LayoutData, MinimapLineInfo } from "./types.js";

/**
 * Compute the layout of all source lines for minimap rendering.
 *
 * For each source line, we use Pretext's prepare() + layout() to determine
 * how many visual (wrapped) lines it occupies at minimap scale. This gives
 * pixel-accurate proportional representation.
 */
export function computeLayout(
  lines: string[],
  options: ResolvedOptions,
): LayoutData {
  const { font, minimapScale, lineHeight, width, gutterWidth } = options;
  const minimapLineHeight = lineHeight * minimapScale;
  const availableWidth = (width - gutterWidth) / minimapScale;

  const layoutLines: MinimapLineInfo[] = [];
  const lineWidths: number[][] = [];
  let currentY = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let wraps = 1;
    let widths: number[] = [];

    if (line.length === 0) {
      // Empty line: single visual line, zero width
      widths = [0];
    } else {
      // Use Pretext to measure the line and determine wrapping
      const prepared: PreparedText = prepare(line, font);
      const result = layout(prepared, availableWidth, lineHeight);
      wraps = result.lineCount;

      // For width info, we store the full line width scaled down.
      // For wrapped lines we approximate each wrap as full-width except possibly the last.
      const fullWidth = layout(prepared, Infinity, lineHeight).height / lineHeight;
      // Actually, let's just measure the line at infinite width to get the single-line width
      const singleLineResult = layout(prepared, Infinity, lineHeight);
      // singleLineResult.height / lineHeight should be 1 for a single line
      // We need the actual text width — Pretext's layout doesn't directly return width,
      // but we can use layoutWithLines for that. Since we import layout (lightweight),
      // we'll estimate: if wraps > 1, most wrapped lines fill availableWidth.
      if (wraps === 1) {
        // For a single-line result, the width is less than availableWidth.
        // We can't get exact width from layout() alone, so we prepare a rough estimate.
        // Since prepare() + layout() at Infinity gives lineCount=1, the line fits.
        // We'll use a heuristic: line.length * avgCharWidth.
        // Better: use the actual Pretext measurement by calling layout at a very large width.
        widths = [estimateLineWidth(line, font, minimapScale)];
      } else {
        for (let w = 0; w < wraps; w++) {
          if (w < wraps - 1) {
            widths.push(availableWidth * minimapScale);
          } else {
            // Last wrapped line is partial
            widths.push(estimateLineWidth(line, font, minimapScale) % (availableWidth * minimapScale) || availableWidth * minimapScale);
          }
        }
      }
    }

    const height = wraps * minimapLineHeight;

    layoutLines.push({
      lineNumber: i,
      y: currentY,
      height,
      wraps,
    });

    lineWidths.push(widths);
    currentY += height;
  }

  return {
    lines: layoutLines,
    totalHeight: currentY,
    lineWidths,
  };
}

/**
 * Estimate the rendered width of a line at minimap scale.
 *
 * Uses Pretext's prepare() + layout() to get accurate measurement.
 * We call layout() with an infinite maxWidth so the text never wraps,
 * then derive width from the fact that lineCount will be 1.
 *
 * Since Pretext's layout() returns { lineCount, height } but not width directly,
 * we use a binary-search approach: find the smallest maxWidth where lineCount === 1.
 * For performance, we use a simpler heuristic when the line is short.
 */
function estimateLineWidth(
  line: string,
  font: string,
  minimapScale: number,
): number {
  if (line.length === 0) return 0;

  const prepared = prepare(line, font);

  // Binary search for minimum width that doesn't cause wrapping
  let lo = 0;
  let hi = line.length * 20; // generous upper bound in source pixels
  const lineHeight = 20; // arbitrary, just need lineCount

  // Quick check: does it fit at our upper bound?
  const check = layout(prepared, hi, lineHeight);
  if (check.lineCount > 1) {
    hi = line.length * 50; // even larger bound
  }

  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    const result = layout(prepared, mid, lineHeight);
    if (result.lineCount <= 1) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return hi * minimapScale;
}

/**
 * Find the source line number at a given Y position in the minimap.
 * Uses binary search over the layout data.
 */
export function lineAtY(
  layoutData: LayoutData,
  y: number,
): number {
  const { lines } = layoutData;
  if (lines.length === 0) return 0;
  if (y <= 0) return 0;
  if (y >= layoutData.totalHeight) return lines.length - 1;

  // Binary search
  let lo = 0;
  let hi = lines.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const line = lines[mid];
    if (y < line.y) {
      hi = mid - 1;
    } else if (y >= line.y + line.height) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.min(lo, lines.length - 1);
}
