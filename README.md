# @shipitandpray/pretext-code-minimap

VS Code-style code minimap for the browser. Pixel-accurate, Canvas-rendered, powered by [Pretext](https://github.com/chenglou/pretext).

No editor dependency — works with any text content.

**[Live Demo](https://shipitandpray.github.io/pretext-code-minimap/)**

## Features

- Pixel-accurate line positioning using Pretext text measurement
- Lines rendered as colored rectangles (not text) — same approach as VS Code
- Syntax highlight ranges with per-character block coloring
- Viewport indicator overlay
- Click-to-line mapping
- Scrollable minimap for large documents
- Zero framework dependency — pure TypeScript + Canvas

## Install

```bash
npm install @shipitandpray/pretext-code-minimap @chenglou/pretext
```

`@chenglou/pretext` is a peer dependency — you must install it alongside this package.

## Quick Start

```typescript
import { createMinimap } from "@shipitandpray/pretext-code-minimap";

const canvas = document.getElementById("minimap") as HTMLCanvasElement;

const minimap = createMinimap({
  canvas,
  font: '14px "Fira Code"',
  width: 120,
  minimapScale: 0.15,
});

// Set document content
minimap.setText(editor.getValue());

// Update viewport indicator as user scrolls
minimap.setViewport(firstVisibleLine, lastVisibleLine);

// Optional: add syntax highlights
minimap.setHighlights([
  { startLine: 0, startColumn: 0, endLine: 0, endColumn: 6, color: "#569cd6" },
  { startLine: 0, startColumn: 7, endLine: 0, endColumn: 15, color: "#ce9178" },
]);

// Render
minimap.render();
```

## Integration with CodeMirror 6

```typescript
import { createMinimap } from "@shipitandpray/pretext-code-minimap";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

const canvas = document.createElement("canvas");
canvas.height = 800;
document.querySelector(".editor-wrapper")!.appendChild(canvas);

const minimap = createMinimap({
  canvas,
  font: '14px "Fira Code"',
  width: 120,
  minimapScale: 0.15,
  lineHeight: 21,
});

// Click on minimap to jump to line
canvas.addEventListener("click", (e) => {
  const line = minimap.getLineAtY(e.offsetY);
  const pos = view.state.doc.line(line + 1).from;
  view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
});

// ViewPlugin to sync minimap with editor
const minimapPlugin = ViewPlugin.define(
  (view) => {
    function update() {
      const doc = view.state.doc;
      const lines: string[] = [];
      for (let i = 1; i <= doc.lines; i++) {
        lines.push(doc.line(i).text);
      }
      minimap.setLines(lines);

      // Viewport
      const topBlock = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
      const bottomBlock = view.lineBlockAtHeight(
        view.scrollDOM.scrollTop + view.scrollDOM.clientHeight,
      );
      const startLine = view.state.doc.lineAt(topBlock.from).number - 1;
      const endLine = view.state.doc.lineAt(bottomBlock.to).number - 1;
      minimap.setViewport(startLine, endLine);

      minimap.render();
    }

    update();
    return {
      update(viewUpdate: ViewUpdate) {
        if (viewUpdate.docChanged || viewUpdate.viewportChanged) {
          update();
        }
      },
    };
  },
);
```

## Standalone Usage (No Editor)

```typescript
import { createMinimap } from "@shipitandpray/pretext-code-minimap";

const canvas = document.querySelector<HTMLCanvasElement>("#my-minimap")!;
canvas.height = window.innerHeight;

const minimap = createMinimap({
  canvas,
  font: '13px Consolas',
  width: 100,
  minimapScale: 0.12,
  backgroundColor: "#282c34",
  textColor: "#abb2bf",
  viewportColor: "rgba(100,100,200,0.15)",
});

// Load source code
const code = await fetch("/src/main.ts").then((r) => r.text());
minimap.setText(code);

// Show lines 0-40 as the "visible" range
minimap.setViewport(0, 40);

// If the minimap content is taller than the canvas, scroll it
minimap.setScrollTop(200);

minimap.render();

// Handle clicks
canvas.addEventListener("click", (e) => {
  const lineNumber = minimap.getLineAtY(e.offsetY);
  console.log("Clicked line:", lineNumber);
});

// Handle scroll
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  minimap.setScrollTop(minimap.getScrollTop() + e.deltaY);
  minimap.render();
});
```

## API

### `createMinimap(options: MinimapOptions): Minimap`

Factory function. Returns a new `Minimap` instance.

### `MinimapOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `canvas` | `HTMLCanvasElement` | (required) | Target canvas element |
| `font` | `string` | (required) | Source font, e.g. `'14px "Fira Code"'` |
| `width` | `number` | `120` | Minimap width in pixels |
| `minimapScale` | `number` | `0.15` | Scale factor from source to minimap |
| `lineHeight` | `number` | `fontSize * 1.5` | Source line height in pixels |
| `backgroundColor` | `string` | `'#1e1e1e'` | Canvas background color |
| `textColor` | `string` | `'#d4d4d4'` | Default line color |
| `viewportColor` | `string` | `'rgba(255,255,255,0.1)'` | Viewport overlay color |
| `gutterWidth` | `number` | `0` | Left gutter width in minimap pixels |

### `Minimap` Methods

| Method | Description |
|---|---|
| `setText(text)` | Set full document text. Recomputes layout via Pretext. |
| `setLines(lines)` | Set pre-split lines array. Recomputes layout. |
| `setViewport(start, end)` | Set visible source line range for viewport indicator. |
| `setHighlights(ranges)` | Set syntax coloring blocks. |
| `render()` | Draw the minimap to canvas. |
| `getLineAtY(y)` | Convert minimap canvas Y to source line number. |
| `getTotalHeight()` | Total minimap content height in pixels. |
| `getVisibleRange()` | Currently visible line range in minimap. |
| `setScrollTop(px)` | Scroll minimap if content exceeds canvas height. |
| `getScrollTop()` | Current scroll offset. |
| `getLayoutLines()` | Get layout info for all lines. |
| `destroy()` | Cleanup. Instance cannot be used after this. |

### `HighlightRange`

```typescript
interface HighlightRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  color: string;
}
```

## How It Works

1. **Text measurement** — Each source line is measured using Pretext's `prepare()` + `layout()`. This determines the pixel width at the source font size.

2. **Wrapping** — At minimap scale, available width is `(minimapWidth - gutterWidth) / minimapScale`. Lines wider than this wrap, just like they would in an editor.

3. **Rendering** — Lines are drawn as thin colored rectangles on Canvas. At minimap scale (~15% of source), individual characters are indistinguishable, so rectangles give a more accurate visual representation than actual text rendering.

4. **Performance** — `prepare()` is called once per document change. `render()` only draws to Canvas using cached layout data. This makes re-renders (scroll, viewport change) very fast.

## License

MIT
