import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createStringProcessor } from "../index.js";

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
});
