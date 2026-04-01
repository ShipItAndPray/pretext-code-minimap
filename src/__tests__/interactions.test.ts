import { describe, it, expect, vi } from "vitest";
import {
  getLineAtCanvasY,
  clampScrollTop,
  getVisibleLineRange,
} from "../interactions.js";
import type { LayoutData } from "../types.js";

// Mock @chenglou/pretext (required because interactions imports layout which imports pretext)
vi.mock("@chenglou/pretext", () => ({
  prepare: vi.fn(() => ({ __brand: true })),
  layout: vi.fn(() => ({ lineCount: 1, height: 21 })),
  parseFontSize: vi.fn(() => 14),
}));

function makeLayoutData(): LayoutData {
  return {
    lines: [
      { lineNumber: 0, y: 0, height: 3, wraps: 1 },
      { lineNumber: 1, y: 3, height: 3, wraps: 1 },
      { lineNumber: 2, y: 6, height: 3, wraps: 1 },
      { lineNumber: 3, y: 9, height: 3, wraps: 1 },
      { lineNumber: 4, y: 12, height: 3, wraps: 1 },
    ],
    totalHeight: 15,
    lineWidths: [[10], [10], [10], [10], [10]],
  };
}

describe("getLineAtCanvasY", () => {
  it("accounts for scroll offset", () => {
    const data = makeLayoutData();
    // canvasY=0, scrollTop=6 -> looking at y=6 which is line 2
    expect(getLineAtCanvasY(data, 0, 6)).toBe(2);
  });

  it("returns first line for canvasY=0, scrollTop=0", () => {
    const data = makeLayoutData();
    expect(getLineAtCanvasY(data, 0, 0)).toBe(0);
  });

  it("returns last line for large canvasY", () => {
    const data = makeLayoutData();
    expect(getLineAtCanvasY(data, 100, 0)).toBe(4);
  });
});

describe("clampScrollTop", () => {
  it("returns 0 when content fits within canvas", () => {
    expect(clampScrollTop(50, 100, 200)).toBe(0);
  });

  it("clamps to 0 for negative scroll", () => {
    expect(clampScrollTop(-10, 500, 200)).toBe(0);
  });

  it("clamps to max scroll when exceeding bounds", () => {
    // totalHeight=500, canvasHeight=200, max scroll = 300
    expect(clampScrollTop(400, 500, 200)).toBe(300);
  });

  it("allows valid scroll values", () => {
    expect(clampScrollTop(100, 500, 200)).toBe(100);
  });
});

describe("getVisibleLineRange", () => {
  it("returns full range when no scroll", () => {
    const data = makeLayoutData();
    const range = getVisibleLineRange(data, 0, 15);
    expect(range.startLine).toBe(0);
    expect(range.endLine).toBe(4);
  });

  it("returns subset when scrolled and canvas is smaller than content", () => {
    const data = makeLayoutData();
    // scrollTop=6, canvasHeight=6 -> visible y range is 6..12 -> lines 2..3
    const range = getVisibleLineRange(data, 6, 6);
    expect(range.startLine).toBe(2);
    expect(range.endLine).toBe(3);
  });

  it("handles empty layout", () => {
    const empty: LayoutData = { lines: [], totalHeight: 0, lineWidths: [] };
    const range = getVisibleLineRange(empty, 0, 100);
    expect(range.startLine).toBe(0);
    expect(range.endLine).toBe(0);
  });
});
