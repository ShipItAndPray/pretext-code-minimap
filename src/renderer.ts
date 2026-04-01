import type {
  ResolvedOptions,
  LayoutData,
  HighlightRange,
} from "./types.js";

/**
 * Render the minimap to a canvas.
 *
 * Lines are drawn as thin colored rectangles — not actual text.
 * This matches the VS Code approach: at minimap scale, individual characters
 * are indistinguishable, so we just draw blocks that represent the shape of code.
 */
export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  options: ResolvedOptions,
  layoutData: LayoutData,
  highlights: HighlightRange[],
  viewportStart: number,
  viewportEnd: number,
  scrollTop: number,
  sourceLines: string[],
): void {
  const { width, backgroundColor, textColor, viewportColor, gutterWidth, minimapScale, lineHeight } = options;
  const canvasHeight = ctx.canvas.height;
  const minimapLineHeight = lineHeight * minimapScale;

  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, canvasHeight);

  // Build highlight lookup: Map<lineNumber, Array<{startCol, endCol, color}>>
  const highlightMap = buildHighlightMap(highlights);

  // Draw lines as colored rectangles
  const blockHeight = Math.max(1, Math.floor(minimapLineHeight));

  for (const lineInfo of layoutData.lines) {
    const renderY = lineInfo.y - scrollTop;

    // Skip lines outside visible canvas area
    if (renderY + lineInfo.height < 0) continue;
    if (renderY > canvasHeight) break;

    const lineNum = lineInfo.lineNumber;
    const lineText = sourceLines[lineNum] ?? "";
    const lineWidths = layoutData.lineWidths[lineNum] ?? [0];

    // Get highlights for this line
    const lineHighlights = highlightMap.get(lineNum);

    for (let wrap = 0; wrap < lineInfo.wraps; wrap++) {
      const wrapY = renderY + wrap * Math.max(1, minimapLineHeight);
      const wrapWidth = lineWidths[wrap] ?? 0;

      if (wrapWidth <= 0) continue;

      if (lineHighlights && lineHighlights.length > 0) {
        // Draw highlighted segments
        drawHighlightedLine(
          ctx,
          lineHighlights,
          lineNum,
          wrap,
          gutterWidth,
          wrapY,
          blockHeight,
          wrapWidth,
          minimapScale,
          lineText,
          textColor,
        );
      } else {
        // Draw the whole line as a single block in default text color
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(
          gutterWidth,
          Math.round(wrapY),
          Math.round(wrapWidth),
          Math.max(1, blockHeight - 1),
        );
        ctx.globalAlpha = 1;
      }
    }
  }

  // Draw viewport indicator
  drawViewport(ctx, layoutData, viewportStart, viewportEnd, scrollTop, viewportColor, width, canvasHeight);
}

/**
 * Draw a single line with syntax highlight coloring.
 */
function drawHighlightedLine(
  ctx: CanvasRenderingContext2D,
  highlights: Array<{ startCol: number; endCol: number; color: string }>,
  _lineNum: number,
  _wrap: number,
  gutterWidth: number,
  y: number,
  blockHeight: number,
  totalWidth: number,
  minimapScale: number,
  lineText: string,
  defaultColor: string,
): void {
  const lineLen = lineText.length || 1;
  const charWidth = totalWidth / lineLen;

  // Sort highlights by startCol
  const sorted = [...highlights].sort((a, b) => a.startCol - b.startCol);

  let lastCol = 0;
  const roundedY = Math.round(y);
  const drawHeight = Math.max(1, blockHeight - 1);

  for (const hl of sorted) {
    // Draw gap before this highlight in default color
    if (hl.startCol > lastCol) {
      const gapStart = gutterWidth + lastCol * charWidth * minimapScale;
      const gapWidth = (hl.startCol - lastCol) * charWidth * minimapScale;
      if (gapWidth > 0.5) {
        ctx.fillStyle = defaultColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(Math.round(gapStart), roundedY, Math.round(gapWidth), drawHeight);
      }
    }

    // Draw highlighted segment
    const hlStart = gutterWidth + hl.startCol * charWidth * minimapScale;
    const hlWidth = (hl.endCol - hl.startCol) * charWidth * minimapScale;
    if (hlWidth > 0.5) {
      ctx.fillStyle = hl.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(Math.round(hlStart), roundedY, Math.round(hlWidth), drawHeight);
    }

    lastCol = Math.max(lastCol, hl.endCol);
  }

  // Draw remaining text after last highlight
  if (lastCol < lineLen) {
    const remainStart = gutterWidth + lastCol * charWidth * minimapScale;
    const remainWidth = (lineLen - lastCol) * charWidth * minimapScale;
    if (remainWidth > 0.5) {
      ctx.fillStyle = defaultColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(Math.round(remainStart), roundedY, Math.round(remainWidth), drawHeight);
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Build a per-line lookup map from highlight ranges.
 * Multi-line highlights get split into per-line entries.
 */
function buildHighlightMap(
  highlights: HighlightRange[],
): Map<number, Array<{ startCol: number; endCol: number; color: string }>> {
  const map = new Map<number, Array<{ startCol: number; endCol: number; color: string }>>();

  for (const hl of highlights) {
    for (let line = hl.startLine; line <= hl.endLine; line++) {
      const startCol = line === hl.startLine ? hl.startColumn : 0;
      const endCol = line === hl.endLine ? hl.endColumn : Infinity;

      let entries = map.get(line);
      if (!entries) {
        entries = [];
        map.set(line, entries);
      }
      entries.push({ startCol, endCol, color: hl.color });
    }
  }

  return map;
}

/**
 * Draw the viewport indicator overlay.
 */
function drawViewport(
  ctx: CanvasRenderingContext2D,
  layoutData: LayoutData,
  viewportStart: number,
  viewportEnd: number,
  scrollTop: number,
  viewportColor: string,
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (viewportStart < 0 || viewportEnd < 0) return;
  if (viewportStart >= layoutData.lines.length) return;

  const startLine = layoutData.lines[Math.min(viewportStart, layoutData.lines.length - 1)];
  const endLineIdx = Math.min(viewportEnd, layoutData.lines.length - 1);
  const endLine = layoutData.lines[endLineIdx];

  if (!startLine || !endLine) return;

  const vpTop = startLine.y - scrollTop;
  const vpBottom = endLine.y + endLine.height - scrollTop;

  // Clamp to canvas
  const drawTop = Math.max(0, Math.round(vpTop));
  const drawBottom = Math.min(canvasHeight, Math.round(vpBottom));

  if (drawBottom <= drawTop) return;

  ctx.fillStyle = viewportColor;
  ctx.fillRect(0, drawTop, canvasWidth, drawBottom - drawTop);

  // Draw thin border lines at top and bottom of viewport
  ctx.fillStyle = viewportColor;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, drawTop, canvasWidth, 1);
  ctx.fillRect(0, drawBottom - 1, canvasWidth, 1);
  ctx.globalAlpha = 1;
}
