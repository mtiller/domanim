import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createStringProcessor } from "../index.js";

// ---------------------------------------------------------------------------
// interp() and cinterp() — unit tests via createStringProcessor expressions
// ---------------------------------------------------------------------------
describe("interp() via createStringProcessor", () => {
  const html = `<rect id="r" fill="#000000"/>`;

  test("maps vmin to ymin", () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "interp(v, 0, 100, 0, 255)" } },
      html
    );
    expect(p({ v: 0 })).toMatchSnapshot();
  });

  test("maps vmax to ymax", () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "interp(v, 0, 100, 0, 255)" } },
      html
    );
    expect(p({ v: 100 })).toMatchSnapshot();
  });

  test("linearly interpolates at midpoint", () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "interp(v, 0, 100, 0, 200)" } },
      html
    );
    expect(p({ v: 50 })).toMatchSnapshot();
  });

  test("interpolates fractional values", () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "interp(v, 0, 1, 10, 20)" } },
      html
    );
    expect(p({ v: 0.25 })).toMatchSnapshot();
  });
});

describe("cinterp() via createStringProcessor", () => {
  const html = `<rect id="r" fill="#000000"/>`;

  test("returns cmin color at vmin", () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "cinterp(v, 0, 100, '#ff0000', '#0000ff')",
        },
      },
      html
    );
    expect(p({ v: 0 })).toMatchSnapshot();
  });

  test("returns cmax color at vmax", () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "cinterp(v, 0, 100, '#ff0000', '#0000ff')",
        },
      },
      html
    );
    expect(p({ v: 100 })).toMatchSnapshot();
  });

  test("returns interpolated color at midpoint", () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "cinterp(v, 0, 100, '#000000', '#ffffff')",
        },
      },
      html
    );
    expect(p({ v: 50 })).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Integration: interp/cinterp applied to powerplant.svg
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, "../../powerplant.svg"), "utf-8");

describe("createStringProcessor with powerplant.svg", () => {
  test("changes the red accent fill color to green for normal operation", () => {
    const processor = createStringProcessor(
      { 'rect[fill="#ea5a47"]': { to: "attr", attr: "fill", expr: "accent_color" } },
      svg
    );
    expect(processor({ accent_color: "#00cc44" })).toMatchSnapshot();
  });

  test("changes the red accent fill color to orange for a warning state", () => {
    const processor = createStringProcessor(
      { 'rect[fill="#ea5a47"]': { to: "attr", attr: "fill", expr: "accent_color" } },
      svg
    );
    expect(processor({ accent_color: "#ff8800" })).toMatchSnapshot();
  });

  test("adds alarm class to color group when alarm is truthy", () => {
    const processor = createStringProcessor(
      { "#color": { to: "class", name: "alarm", expr: "alarm" } },
      svg
    );
    expect(processor({ alarm: true })).toMatchSnapshot();
  });

  test("does not add alarm class when alarm is falsy", () => {
    const processor = createStringProcessor(
      { "#color": { to: "class", name: "alarm", expr: "alarm" } },
      svg
    );
    expect(processor({ alarm: false })).toMatchSnapshot();
  });

  test("changes SVG viewport dimensions", () => {
    const processor = createStringProcessor(
      {
        svg: [
          { to: "attr", attr: "width", expr: "width" },
          { to: "attr", attr: "height", expr: "height" },
        ],
      },
      svg
    );
    expect(processor({ width: "400px", height: "400px" })).toMatchSnapshot();
  });

  test("changes stroke color on all line paths", () => {
    const processor = createStringProcessor(
      { "#line path": { to: "attr", attr: "stroke", expr: "stroke_color" } },
      svg
    );
    expect(processor({ stroke_color: "#cc0000" })).toMatchSnapshot();
  });

  test("applies multiple independent modifications at once", () => {
    const processor = createStringProcessor(
      {
        'rect[fill="#ea5a47"]': { to: "attr", attr: "fill", expr: "accent_color" },
        "#color": { to: "class", name: "warning", expr: "warning" },
        svg: [
          { to: "attr", attr: "width", expr: "width" },
          { to: "attr", attr: "height", expr: "height" },
        ],
        "#line path": { to: "attr", attr: "stroke", expr: "stroke_color" },
      },
      svg
    );
    expect(
      processor({
        accent_color: "#ffaa00",
        warning: true,
        width: "600px",
        height: "600px",
        stroke_color: "#884400",
      })
    ).toMatchSnapshot();
  });

  test("removes a class that was previously present", () => {
    // First add the class, then verify removing it works correctly
    const processor = createStringProcessor(
      { "#line": { to: "class", name: "highlighted", expr: "highlighted" } },
      svg
    );
    expect(processor({ highlighted: true })).toMatchSnapshot();
    expect(processor({ highlighted: false })).toMatchSnapshot();
  });

  test("changes fill on all paths in the color group", () => {
    const processor = createStringProcessor(
      { "#color path": { to: "attr", attr: "fill", expr: "fill_color" } },
      svg
    );
    expect(processor({ fill_color: "#aaddff" })).toMatchSnapshot();
  });

  test("uses interp() to drive SVG width from a data value", () => {
    // Maps output_pct (0–100) → width 200px–800px
    const processor = createStringProcessor(
      { svg: { to: "attr", attr: "width", expr: "interp(output_pct, 0, 100, 200, 800)" } },
      svg
    );
    expect(processor({ output_pct: 0 })).toMatchSnapshot();
    expect(processor({ output_pct: 50 })).toMatchSnapshot();
    expect(processor({ output_pct: 100 })).toMatchSnapshot();
  });

  test("uses cinterp() to color the accent rect based on temperature", () => {
    // Maps temperature (0–100) from green (#00cc44) to red (#ea5a47)
    const processor = createStringProcessor(
      {
        'rect[fill="#ea5a47"]': {
          to: "attr",
          attr: "fill",
          expr: "cinterp(temperature, 0, 100, '#00cc44', '#ea5a47')",
        },
      },
      svg
    );
    expect(processor({ temperature: 0 })).toMatchSnapshot();
    expect(processor({ temperature: 50 })).toMatchSnapshot();
    expect(processor({ temperature: 100 })).toMatchSnapshot();
  });
});
