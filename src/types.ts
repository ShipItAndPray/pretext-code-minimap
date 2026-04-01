/**
 * Configuration options for creating a minimap instance.
 */
export interface MinimapOptions {
  /** Target canvas element to render the minimap into */
  canvas: HTMLCanvasElement;
  /** Minimap width in pixels (default: 120) */
  width?: number;
  /** Source font string, e.g. '14px "Fira Code"' */
  font: string;
  /** Scale factor from source to minimap (default: 0.15) */
  minimapScale?: number;
  /** Source line height in pixels. If not provided, derived from font size * 1.5 */
  lineHeight?: number;
  /** Minimap background color (default: '#1e1e1e') */
  backgroundColor?: string;
  /** Default text color for lines without highlights (default: '#d4d4d4') */
  textColor?: string;
  /** Viewport indicator overlay color (default: 'rgba(255,255,255,0.1)') */
  viewportColor?: string;
  /** Left gutter width in minimap pixels for line number area (default: 0) */
  gutterWidth?: number;
}

/**
 * A colored range within the document for syntax highlighting on the minimap.
 */
export interface HighlightRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  color: string;
}

/**
 * Layout information for a single source line on the minimap.
 */
export interface MinimapLineInfo {
  /** 0-based source line number */
  lineNumber: number;
  /** Y position on minimap canvas (before scroll offset) */
  y: number;
  /** Rendered height on minimap in pixels */
  height: number;
  /** Number of visual (wrapped) lines this source line occupies */
  wraps: number;
}

/**
 * Resolved options with all defaults applied.
 */
export interface ResolvedOptions {
  canvas: HTMLCanvasElement;
  width: number;
  font: string;
  minimapScale: number;
  lineHeight: number;
  backgroundColor: string;
  textColor: string;
  viewportColor: string;
  gutterWidth: number;
}

/**
 * Internal layout data produced by the layout engine.
 */
export interface LayoutData {
  lines: MinimapLineInfo[];
  totalHeight: number;
  /** Per-line widths at minimap scale (array of arrays for wrapped lines) */
  lineWidths: number[][];
}
