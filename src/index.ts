import { search } from "jmespath";
import { load } from "cheerio";

export interface TextApplication {
  to: "text";
  /** JMESPath expression evaluated against the data object */
  expr: string;
}

export interface AttrApplication {
  to: "attr";
  /** Which attribute is being targeted */
  attr: string;
  /** JMESPath expression evaluated against the data object */
  expr: string;
}

export interface ClassApplication {
  to: "class";
  /** Which classname should be toggled */
  name: string;
  /** JMESPath expression evaluated against the data object */
  expr: string;
}

export type Application = TextApplication | AttrApplication | ClassApplication;

function applyToNode(node: Element, app: Application, data: unknown): void {
  const result = search(data, app.expr);
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
  mapping: Record<string, Application | Application[]>
): (data: unknown) => void {
  return (data: unknown) => {
    for (const [selector, applications] of Object.entries(mapping)) {
      const nodes = document.querySelectorAll(selector);
      const apps = Array.isArray(applications) ? applications : [applications];
      for (const node of nodes) {
        for (const app of apps) {
          applyToNode(node, app, data);
        }
      }
    }
  };
}

export function createStringProcessor(
  mapping: Record<string, Application | Application[]>,
  html: string
): (data: unknown) => string {
  return (data: unknown) => {
    const $ = load(html, {}, false);
    for (const [selector, applications] of Object.entries(mapping)) {
      const nodes = $(selector);
      const apps = Array.isArray(applications) ? applications : [applications];
      for (const app of apps) {
        const result = search(data, app.expr);
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
