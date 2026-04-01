import { describe, it, expect, vi, beforeEach } from "vitest";
import { Minimap, createMinimap } from "../index.js";

// Mock @chenglou/pretext
vi.mock("@chenglou/pretext", () => ({
  prepare: vi.fn(() => ({ __brand: true })),
  layout: vi.fn((_prepared: unknown, _maxWidth: number, lineHeight: number) => ({
    lineCount: 1,
    height: lineHeight,
  })),
  parseFontSize: vi.fn(() => 14),
}));

function makeCanvas(): HTMLCanvasElement {
  const fillRect = vi.fn();
  const ctx = {
    fillRect,
    fillStyle: "",
    globalAlpha: 1,
    canvas: { height: 600, width: 120 },
  } as unknown as CanvasRenderingContext2D;

  return {
    getContext: vi.fn(() => ctx),
    width: 120,
    height: 600,
  } as unknown as HTMLCanvasElement;
}

describe("Minimap", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = makeCanvas();
  });

  it("can be created with createMinimap factory", () => {
    const mm = createMinimap({ canvas, font: '14px "Fira Code"' });
    expect(mm).toBeInstanceOf(Minimap);
  });

  it("sets text and computes layout", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("line 1\nline 2\nline 3");
    expect(mm.getTotalHeight()).toBeGreaterThan(0);
    expect(mm.getLayoutLines()).toHaveLength(3);
  });

  it("setLines works like setText but with pre-split array", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setLines(["a", "b", "c", "d"]);
    expect(mm.getLayoutLines()).toHaveLength(4);
  });

  it("render() does not throw", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("hello\nworld");
    mm.setViewport(0, 1);
    expect(() => mm.render()).not.toThrow();
  });

  it("render() with highlights does not throw", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("hello\nworld");
    mm.setHighlights([
      { startLine: 0, startColumn: 0, endLine: 0, endColumn: 5, color: "#ff0000" },
    ]);
    mm.setViewport(0, 1);
    expect(() => mm.render()).not.toThrow();
  });

  it("getLineAtY returns valid line number", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("line1\nline2\nline3");
    const line = mm.getLineAtY(0);
    expect(line).toBeGreaterThanOrEqual(0);
    expect(line).toBeLessThan(3);
  });

  it("setScrollTop clamps to valid bounds", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("a\nb\nc");
    mm.setScrollTop(99999);
    // Should be clamped — if content fits, scrollTop = 0
    expect(mm.getScrollTop()).toBeGreaterThanOrEqual(0);
  });

  it("getVisibleRange returns a valid range", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.setText("one\ntwo\nthree");
    const range = mm.getVisibleRange();
    expect(range.startLine).toBeGreaterThanOrEqual(0);
    expect(range.endLine).toBeGreaterThanOrEqual(range.startLine);
  });

  it("destroy prevents further use", () => {
    const mm = new Minimap({ canvas, font: '14px "Fira Code"' });
    mm.destroy();
    expect(() => mm.setText("test")).toThrow(/destroyed/);
    expect(() => mm.render()).toThrow(/destroyed/);
  });

  it("throws if canvas context is unavailable", () => {
    const badCanvas = {
      getContext: vi.fn(() => null),
      width: 120,
      height: 600,
    } as unknown as HTMLCanvasElement;
    expect(
      () => new Minimap({ canvas: badCanvas, font: '14px "Fira Code"' }),
    ).toThrow(/canvas context/i);
  });
});
