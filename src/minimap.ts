import type {
  MinimapOptions,
  ResolvedOptions,
  HighlightRange,
  LayoutData,
  MinimapLineInfo,
} from "./types.js";
import { computeLayout, lineAtY } from "./layout.js";
import { renderMinimap } from "./renderer.js";
import { getLineAtCanvasY, clampScrollTop, getVisibleLineRange } from "./interactions.js";
import { parseFontSize } from "@chenglou/pretext";

/**
 * Default option values.
 */
const DEFAULTS = {
  width: 120,
  minimapScale: 0.15,
  backgroundColor: "#1e1e1e",
  textColor: "#d4d4d4",
  viewportColor: "rgba(255,255,255,0.1)",
  gutterWidth: 0,
} as const;

/**
 * Resolve user-provided options with defaults.
 */
function resolveOptions(opts: MinimapOptions): ResolvedOptions {
  const fontSize = parseFontSize(opts.font);
  return {
    canvas: opts.canvas,
    width: opts.width ?? DEFAULTS.width,
    font: opts.font,
    minimapScale: opts.minimapScale ?? DEFAULTS.minimapScale,
    lineHeight: opts.lineHeight ?? Math.round(fontSize * 1.5),
    backgroundColor: opts.backgroundColor ?? DEFAULTS.backgroundColor,
    textColor: opts.textColor ?? DEFAULTS.textColor,
    viewportColor: opts.viewportColor ?? DEFAULTS.viewportColor,
    gutterWidth: opts.gutterWidth ?? DEFAULTS.gutterWidth,
  };
}

/**
 * Code minimap rendered on Canvas with pixel-accurate line positioning.
 *
 * Uses @chenglou/pretext for text measurement so that line widths and
 * wrapping at minimap scale are accurate. Lines are drawn as thin colored
 * rectangles — not actual text characters — matching VS Code's approach.
 */
export class Minimap {
  private options: ResolvedOptions;
  private ctx: CanvasRenderingContext2D;
  private lines: string[] = [];
  private layoutData: LayoutData = { lines: [], totalHeight: 0, lineWidths: [] };
  private highlights: HighlightRange[] = [];
  private viewportStartLine = -1;
  private viewportEndLine = -1;
  private scrollTop = 0;
  private destroyed = false;

  constructor(opts: MinimapOptions) {
    this.options = resolveOptions(opts);

    const ctx = opts.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("pretext-code-minimap: Could not get 2D canvas context");
    }
    this.ctx = ctx;

    // Set canvas dimensions
    opts.canvas.width = this.options.width;
  }

  /**
   * Set the full document text. Splits into lines and recomputes layout.
   */
  setText(text: string): void {
    this.assertNotDestroyed();
    this.lines = text.split("\n");
    this.recomputeLayout();
  }

  /**
   * Set pre-split lines for efficiency (avoids an extra split).
   */
  setLines(lines: string[]): void {
    this.assertNotDestroyed();
    this.lines = lines;
    this.recomputeLayout();
  }

  /**
   * Update the visible viewport range indicator.
   * @param startLine - First visible source line (0-based)
   * @param endLine - Last visible source line (0-based, inclusive)
   */
  setViewport(startLine: number, endLine: number): void {
    this.assertNotDestroyed();
    this.viewportStartLine = startLine;
    this.viewportEndLine = endLine;
  }

  /**
   * Set syntax highlight ranges for colored block rendering.
   */
  setHighlights(ranges: HighlightRange[]): void {
    this.assertNotDestroyed();
    this.highlights = ranges;
  }

  /**
   * Draw the minimap to the canvas.
   */
  render(): void {
    this.assertNotDestroyed();
    renderMinimap(
      this.ctx,
      this.options,
      this.layoutData,
      this.highlights,
      this.viewportStartLine,
      this.viewportEndLine,
      this.scrollTop,
      this.lines,
    );
  }

  /**
   * Convert a Y coordinate on the minimap canvas to the corresponding source line number.
   */
  getLineAtY(canvasY: number): number {
    this.assertNotDestroyed();
    return getLineAtCanvasY(this.layoutData, canvasY, this.scrollTop);
  }

  /**
   * Get the total height of all minimap content in pixels.
   */
  getTotalHeight(): number {
    return this.layoutData.totalHeight;
  }

  /**
   * Get the range of source lines currently visible within the minimap canvas viewport.
   */
  getVisibleRange(): { startLine: number; endLine: number } {
    return getVisibleLineRange(
      this.layoutData,
      this.scrollTop,
      this.options.canvas.height,
    );
  }

  /**
   * Scroll the minimap content. Clamped to valid bounds.
   */
  setScrollTop(pixels: number): void {
    this.assertNotDestroyed();
    this.scrollTop = clampScrollTop(
      pixels,
      this.layoutData.totalHeight,
      this.options.canvas.height,
    );
  }

  /**
   * Get the current scroll offset.
   */
  getScrollTop(): number {
    return this.scrollTop;
  }

  /**
   * Get layout info for all lines.
   */
  getLayoutLines(): readonly MinimapLineInfo[] {
    return this.layoutData.lines;
  }

  /**
   * Cleanup. The instance cannot be used after this.
   */
  destroy(): void {
    this.destroyed = true;
    this.lines = [];
    this.highlights = [];
    this.layoutData = { lines: [], totalHeight: 0, lineWidths: [] };
  }

  // --- Private ---

  private recomputeLayout(): void {
    this.layoutData = computeLayout(this.lines, this.options);
  }

  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error("pretext-code-minimap: Instance has been destroyed");
    }
  }
}
