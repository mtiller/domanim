import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createStringProcessor } from "../index.js";

// ---------------------------------------------------------------------------
// $interp() and $cinterp() — unit tests via createStringProcessor expressions
// ---------------------------------------------------------------------------
describe("$interp() via createStringProcessor", () => {
  const html = `<rect id="r" fill="#000000"/>`;

  test("maps vmin to ymin", async () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "$interp(v, 0, 100, 0, 255)" } },
      html
    );
    expect(await p({ v: 0 })).toMatchSnapshot();
  });

  test("maps vmax to ymax", async () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "$interp(v, 0, 100, 0, 255)" } },
      html
    );
    expect(await p({ v: 100 })).toMatchSnapshot();
  });

  test("linearly interpolates at midpoint", async () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "$interp(v, 0, 100, 0, 200)" } },
      html
    );
    expect(await p({ v: 50 })).toMatchSnapshot();
  });

  test("interpolates fractional values", async () => {
    const p = createStringProcessor(
      { "#r": { to: "attr", attr: "data-val", expr: "$interp(v, 0, 1, 10, 20)" } },
      html
    );
    expect(await p({ v: 0.25 })).toMatchSnapshot();
  });
});

describe("$cinterp() via createStringProcessor", () => {
  const html = `<rect id="r" fill="#000000"/>`;

  test("returns cmin color at vmin", async () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "$cinterp(v, 0, 100, '#ff0000', '#0000ff')",
        },
      },
      html
    );
    expect(await p({ v: 0 })).toMatchSnapshot();
  });

  test("returns cmax color at vmax", async () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "$cinterp(v, 0, 100, '#ff0000', '#0000ff')",
        },
      },
      html
    );
    expect(await p({ v: 100 })).toMatchSnapshot();
  });

  test("returns interpolated color at midpoint", async () => {
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "$cinterp(v, 0, 100, '#000000', '#ffffff')",
        },
      },
      html
    );
    expect(await p({ v: 50 })).toMatchSnapshot();
  });

  test("interpolates alpha when colors have transparency", async () => {
    // transparent red → opaque blue: alpha goes from 0 to 1
    const p = createStringProcessor(
      {
        "#r": {
          to: "attr",
          attr: "fill",
          expr: "$cinterp(v, 0, 100, 'rgba(255, 0, 0, 0)', 'rgba(0, 0, 255, 1)')",
        },
      },
      html
    );
    expect(await p({ v: 0 })).toMatchSnapshot();   // fully transparent
    expect(await p({ v: 50 })).toMatchSnapshot();  // half alpha
    expect(await p({ v: 100 })).toMatchSnapshot(); // fully opaque
  });
});

// ---------------------------------------------------------------------------
// Integration: applied to powerplant.svg
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, "../../powerplant.svg"), "utf-8");

describe("createStringProcessor with powerplant.svg", () => {
  test("changes the red accent fill color to green for normal operation", async () => {
    const processor = createStringProcessor(
      { 'rect[fill="#ea5a47"]': { to: "attr", attr: "fill", expr: "accent_color" } },
      svg
    );
    expect(await processor({ accent_color: "#00cc44" })).toMatchSnapshot();
  });

  test("changes the red accent fill color to orange for a warning state", async () => {
    const processor = createStringProcessor(
      { 'rect[fill="#ea5a47"]': { to: "attr", attr: "fill", expr: "accent_color" } },
      svg
    );
    expect(await processor({ accent_color: "#ff8800" })).toMatchSnapshot();
  });

  test("adds alarm class to color group when alarm is truthy", async () => {
    const processor = createStringProcessor(
      { "#color": { to: "class", name: "alarm", expr: "alarm" } },
      svg
    );
    expect(await processor({ alarm: true })).toMatchSnapshot();
  });

  test("does not add alarm class when alarm is falsy", async () => {
    const processor = createStringProcessor(
      { "#color": { to: "class", name: "alarm", expr: "alarm" } },
      svg
    );
    expect(await processor({ alarm: false })).toMatchSnapshot();
  });

  test("changes SVG viewport dimensions", async () => {
    const processor = createStringProcessor(
      {
        svg: [
          { to: "attr", attr: "width", expr: "width" },
          { to: "attr", attr: "height", expr: "height" },
        ],
      },
      svg
    );
    expect(await processor({ width: "400px", height: "400px" })).toMatchSnapshot();
  });

  test("changes stroke color on all line paths", async () => {
    const processor = createStringProcessor(
      { "#line path": { to: "attr", attr: "stroke", expr: "stroke_color" } },
      svg
    );
    expect(await processor({ stroke_color: "#cc0000" })).toMatchSnapshot();
  });

  test("applies multiple independent modifications at once", async () => {
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
      await processor({
        accent_color: "#ffaa00",
        warning: true,
        width: "600px",
        height: "600px",
        stroke_color: "#884400",
      })
    ).toMatchSnapshot();
  });

  test("removes a class that was previously present", async () => {
    const processor = createStringProcessor(
      { "#line": { to: "class", name: "highlighted", expr: "highlighted" } },
      svg
    );
    expect(await processor({ highlighted: true })).toMatchSnapshot();
    expect(await processor({ highlighted: false })).toMatchSnapshot();
  });

  test("changes fill on all paths in the color group", async () => {
    const processor = createStringProcessor(
      { "#color path": { to: "attr", attr: "fill", expr: "fill_color" } },
      svg
    );
    expect(await processor({ fill_color: "#aaddff" })).toMatchSnapshot();
  });

  test("uses $interp() to drive SVG width from a data value", async () => {
    const processor = createStringProcessor(
      { svg: { to: "attr", attr: "width", expr: "$interp(output_pct, 0, 100, 200, 800)" } },
      svg
    );
    expect(await processor({ output_pct: 0 })).toMatchSnapshot();
    expect(await processor({ output_pct: 50 })).toMatchSnapshot();
    expect(await processor({ output_pct: 100 })).toMatchSnapshot();
  });

  test("uses $cinterp() to color the accent rect based on temperature", async () => {
    const processor = createStringProcessor(
      {
        'rect[fill="#ea5a47"]': {
          to: "attr",
          attr: "fill",
          expr: "$cinterp(temperature, 0, 100, '#00cc44', '#ea5a47')",
        },
      },
      svg
    );
    expect(await processor({ temperature: 0 })).toMatchSnapshot();
    expect(await processor({ temperature: 50 })).toMatchSnapshot();
    expect(await processor({ temperature: 100 })).toMatchSnapshot();
  });
});
