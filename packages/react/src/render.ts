import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { SiteManifest, SiteRoute } from "@documentee/core";

export interface ReactRenderOptions {
  htmlBudgetBytes?: number;
}

export function renderDocumenteePageHtml(
  manifest: SiteManifest,
  route: SiteRoute,
  options: ReactRenderOptions = {},
): string {
  const html = `<!doctype html>${renderToStaticMarkup(
    createElement(
      "html",
      { lang: "en" },
      createElement(
        "head",
        null,
        createElement("meta", { charSet: "utf-8" }),
        createElement("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
        createElement("title", null, `${route.title} | ${manifest.config.site.name}`),
      ),
      createElement(
        "body",
        null,
        createElement("nav", null, manifest.routes.map((item) => createElement("a", { key: item.route, href: hrefForRoute(item.route) }, item.title))),
        createElement("main", { dangerouslySetInnerHTML: { __html: route.html } }),
      ),
    ),
  )}`;

  assertHtmlBudget(html, options.htmlBudgetBytes ?? 200_000, route.route);
  return html;
}

function assertHtmlBudget(html: string, budgetBytes: number, route: string): void {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > budgetBytes) {
    throw new Error(`${route} React HTML payload is ${bytes} bytes, over budget ${budgetBytes} bytes`);
  }
}

function hrefForRoute(route: string): string {
  return route === "/" ? "/" : `${route.replace(/\/$/g, "")}/`;
}
