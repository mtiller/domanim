import jsonata from "jsonata";
import { load } from "cheerio";
import colorParse from "color-parse";

export interface TextApplication {
  to: "text";
  /** JSONata expression evaluated against the data object */
  expr: string;
}

export interface AttrApplication {
  to: "attr";
  /** Which attribute is being targeted */
  attr: string;
  /** JSONata expression evaluated against the data object */
  expr: string;
}

export interface ClassApplication {
  to: "class";
  /** Which classname should be toggled */
  name: string;
  /** JSONata expression evaluated against the data object */
  expr: string;
}

export type Application = TextApplication | AttrApplication | ClassApplication;

/** Linear interpolation: maps v from [vmin, vmax] to [ymin, ymax]. */
function interp(
  v: number,
  vmin: number,
  vmax: number,
  ymin: number,
  ymax: number,
): number {
  const t = (v - vmin) / (vmax - vmin);
  return ymin + t * (ymax - ymin);
}

/** Color interpolation: maps v from [vmin, vmax] to a color between cmin and cmax.
 *  Interpolates RGB channels and alpha. Returns #rrggbb when fully opaque,
 *  rgba(r,g,b,a) when the interpolated alpha is less than 1. */
function cinterp(
  v: number,
  vmin: number,
  vmax: number,
  cmin: string,
  cmax: string,
): string {
  const parsedMin = colorParse(cmin);
  const parsedMax = colorParse(cmax);
  const clamp255 = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const r = clamp255(
    interp(v, vmin, vmax, parsedMin.values[0], parsedMax.values[0]),
  );
  const g = clamp255(
    interp(v, vmin, vmax, parsedMin.values[1], parsedMax.values[1]),
  );
  const b = clamp255(
    interp(v, vmin, vmax, parsedMin.values[2], parsedMax.values[2]),
  );
  const a = Math.max(
    0,
    Math.min(1, interp(v, vmin, vmax, parsedMin.alpha, parsedMax.alpha)),
  );
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Compile a JSONata expression string, registering $interp and $cinterp. */
function compileExpr(expr: string): jsonata.Expression {
  const compiled = jsonata(expr);
  compiled.registerFunction("interp", interp, "<nnnnn:n>");
  compiled.registerFunction("cinterp", cinterp, "<nnnss:s>");
  return compiled;
}

type CompiledApp = { app: Application; compiled: jsonata.Expression };
type CompiledMapping = Array<{ selector: string; compiledApps: CompiledApp[] }>;

function compileMapping(
  mapping: Record<string, Application | Application[]>,
): CompiledMapping {
  return Object.entries(mapping).map(([selector, applications]) => {
    const apps = Array.isArray(applications) ? applications : [applications];
    return {
      selector,
      compiledApps: apps.map((app) => ({
        app,
        compiled: compileExpr(app.expr),
      })),
    };
  });
}

function applyResultToNode(
  node: Element,
  app: Application,
  result: unknown,
): void {
  switch (app.to) {
    case "text":
      node.textContent = String(result ?? "");
      break;
    case "attr":
      node.setAttribute(app.attr, String(result ?? ""));
      break;
    case "class":
      if (result) {
        node.classList.add(app.name);
      } else {
        node.classList.remove(app.name);
      }
      break;
  }
}

export function createProcessor(
  mapping: Record<string, Application | Application[]>,
): (data: unknown) => Promise<void> {
  const compiledMapping = compileMapping(mapping);
  return async (data: unknown) => {
    for (const { selector, compiledApps } of compiledMapping) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        for (const { app, compiled } of compiledApps) {
          const result = await compiled.evaluate(data as object);
          applyResultToNode(node, app, result);
        }
      }
    }
  };
}

export function createStringProcessor(
  mapping: Record<string, Application | Application[]>,
  html: string,
): (data: unknown) => Promise<string> {
  const compiledMapping = compileMapping(mapping);
  return async (data: unknown) => {
    const $ = load(html, {}, false);
    for (const { selector, compiledApps } of compiledMapping) {
      const nodes = $(selector);
      for (const { app, compiled } of compiledApps) {
        const result = await compiled.evaluate(data as object);
        switch (app.to) {
          case "text":
            nodes.text(String(result ?? ""));
            break;
          case "attr":
            nodes.attr(app.attr, String(result ?? ""));
            break;
          case "class":
            if (result) {
              nodes.addClass(app.name);
            } else {
              nodes.removeClass(app.name);
            }
            break;
        }
      }
    }
    return $.html();
  };
}
