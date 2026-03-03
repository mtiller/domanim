/// <reference types="vite/client" />

import { createProcessor } from "../../src/index";
import svgContent from "../../powerplant.svg?raw";

// Inject the SVG into the page
document.getElementById("svg-container")!.innerHTML = svgContent;

// Build a processor that demonstrates all three application types and both
// custom interpolation functions.
const processor = createProcessor({
  // TextApplication is not natural for SVG, so we use two AttrApplications
  // and one ClassApplication here.

  // Accent band colour: cool green when cold, alarm red when hot
  'rect[fill="#ea5a47"]': {
    to: "attr",
    attr: "fill",
    expr: "$cinterp(temperature, 0, 100, '#00cc44', '#ea5a47')",
  },

  // Outline stroke colour: dark when idle, vivid blue at full load
  "#line path": {
    to: "attr",
    attr: "stroke",
    expr: "$cinterp(load, 0, 100, '#222222', '#0066ff')",
  },

  // Toggle the .alarm class on the colour group to trigger a CSS animation
  "#color": {
    to: "class",
    name: "alarm",
    expr: "alarm",
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function readControls(): { temperature: number; load: number; alarm: boolean } {
  return {
    temperature: Number(
      (document.getElementById("temperature") as HTMLInputElement).value
    ),
    load: Number(
      (document.getElementById("load") as HTMLInputElement).value
    ),
    alarm: (document.getElementById("alarm") as HTMLInputElement).checked,
  };
}

async function update(): Promise<void> {
  const data = readControls();
  document.getElementById(
    "temperature-display"
  )!.textContent = `${data.temperature}°C`;
  document.getElementById("load-display")!.textContent = `${data.load}%`;
  await processor(data);
}

// ── Event wiring ─────────────────────────────────────────────────────────────

document
  .getElementById("temperature")!
  .addEventListener("input", () => void update());

document
  .getElementById("load")!
  .addEventListener("input", () => void update());

document
  .getElementById("alarm")!
  .addEventListener("change", () => void update());

// Initial render
void update();
