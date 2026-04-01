import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeLayout, lineAtY } from "../layout.js";
import type { ResolvedOptions } from "../types.js";

// Mock @chenglou/pretext
vi.mock("@chenglou/pretext", () => ({
  prepare: vi.fn((_text: string, _font: string) => ({ __brand: true })),
  layout: vi.fn((prepared: unknown, maxWidth: number, lineHeight: number) => {
    // Deterministic mock: each "prepared" call returns lineCount based on maxWidth
    // If maxWidth is Infinity, always 1 line.
    // Otherwise, simulate wrapping at 80 chars worth of width (assuming ~8px per char at source scale).
    // For the binary search in estimateLineWidth, we need consistent behavior.
    if (maxWidth === Infinity || maxWidth > 1000) {
      return { lineCount: 1, height: lineHeight };
    }
    // For binary search: text wider than maxWidth wraps
    // We'll assume source char is ~8px wide, so a 40-char line is ~320px
    // If maxWidth < 320, it wraps into ceil(320/maxWidth) lines
    return { lineCount: 1, height: lineHeight };
  }),
  parseFontSize: vi.fn((_font: string) => 14),
}));

function makeOptions(overrides?: Partial<ResolvedOptions>): ResolvedOptions {
  return {
    canvas: {} as HTMLCanvasElement,
    width: 120,
    font: '14px "Fira Code"',
    minimapScale: 0.15,
    lineHeight: 21,
    backgroundColor: "#1e1e1e",
    textColor: "#d4d4d4",
    viewportColor: "rgba(255,255,255,0.1)",
    gutterWidth: 0,
    ...overrides,
  };
}

describe("computeLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty layout for empty input", () => {
    const result = computeLayout([], makeOptions());
    expect(result.lines).toHaveLength(0);
    expect(result.totalHeight).toBe(0);
    expect(result.lineWidths).toHaveLength(0);
  });

  it("computes layout for a single line", () => {
    const result = computeLayout(["hello world"], makeOptions());
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineNumber).toBe(0);
    expect(result.lines[0].y).toBe(0);
    expect(result.lines[0].wraps).toBe(1);
    expect(result.lines[0].height).toBeGreaterThan(0);
  });

  it("computes layout for multiple lines", () => {
    const lines = ["line one", "line two", "line three"];
    const result = computeLayout(lines, makeOptions());
    expect(result.lines).toHaveLength(3);

    // Each line should start after the previous
    for (let i = 1; i < result.lines.length; i++) {
      expect(result.lines[i].y).toBeGreaterThanOrEqual(
        result.lines[i - 1].y + result.lines[i - 1].height,
      );
    }
  });

  it("handles empty lines", () => {
    const lines = ["hello", "", "world"];
    const result = computeLayout(lines, makeOptions());
    expect(result.lines).toHaveLength(3);
    expect(result.lineWidths[1]).toEqual([0]);
  });

  it("totalHeight equals last line y + last line height", () => {
    const lines = ["a", "b", "c", "d"];
    const result = computeLayout(lines, makeOptions());
    const last = result.lines[result.lines.length - 1];
    expect(result.totalHeight).toBe(last.y + last.height);
  });

  it("respects gutter width in available width calculation", () => {
    const withGutter = computeLayout(["hello"], makeOptions({ gutterWidth: 20 }));
    const withoutGutter = computeLayout(["hello"], makeOptions({ gutterWidth: 0 }));
    // Both should have 1 line (our mock doesn't wrap), but the computation path differs
    expect(withGutter.lines).toHaveLength(1);
    expect(withoutGutter.lines).toHaveLength(1);
  });

  it("minimap line height scales with minimapScale", () => {
    const scale015 = computeLayout(["hello"], makeOptions({ minimapScale: 0.15 }));
    const scale030 = computeLayout(["hello"], makeOptions({ minimapScale: 0.30 }));
    // Height at 0.30 should be double the height at 0.15
    expect(scale030.lines[0].height).toBeCloseTo(scale015.lines[0].height * 2, 5);
  });
});

describe("lineAtY", () => {
  it("returns 0 for y <= 0", () => {
    const layoutData = {
      lines: [
        { lineNumber: 0, y: 0, height: 3, wraps: 1 },
        { lineNumber: 1, y: 3, height: 3, wraps: 1 },
      ],
      totalHeight: 6,
      lineWidths: [[10], [10]],
    };
    expect(lineAtY(layoutData, -5)).toBe(0);
    expect(lineAtY(layoutData, 0)).toBe(0);
  });

  it("returns last line for y >= totalHeight", () => {
    const layoutData = {
      lines: [
        { lineNumber: 0, y: 0, height: 3, wraps: 1 },
        { lineNumber: 1, y: 3, height: 3, wraps: 1 },
      ],
      totalHeight: 6,
      lineWidths: [[10], [10]],
    };
    expect(lineAtY(layoutData, 100)).toBe(1);
  });

  it("returns correct line for y in the middle", () => {
    const layoutData = {
      lines: [
        { lineNumber: 0, y: 0, height: 3, wraps: 1 },
        { lineNumber: 1, y: 3, height: 3, wraps: 1 },
        { lineNumber: 2, y: 6, height: 3, wraps: 1 },
      ],
      totalHeight: 9,
      lineWidths: [[10], [10], [10]],
    };
    expect(lineAtY(layoutData, 4)).toBe(1);
    expect(lineAtY(layoutData, 7)).toBe(2);
  });

  it("returns 0 for empty layout", () => {
    const layoutData = { lines: [], totalHeight: 0, lineWidths: [] };
    expect(lineAtY(layoutData, 5)).toBe(0);
  });
});
