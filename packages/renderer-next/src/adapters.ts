import type { SiteManifest } from "@documentee/core";

export interface NextAppRouterEntry {
  route: string;
  segments: string[];
  dynamic: "force-static";
}

export interface NextPagesRouterEntry {
  route: string;
  page: string;
}

export function createNextAppRouterEntries(manifest: SiteManifest): NextAppRouterEntry[] {
  return manifest.routes.map((route) => ({
    route: route.route,
    segments: routeSegments(route.route),
    dynamic: "force-static",
  }));
}

export function createNextPagesRouterEntries(manifest: SiteManifest): NextPagesRouterEntry[] {
  return manifest.routes.map((route) => ({
    route: route.route,
    page: route.route === "/" ? "/index" : route.route,
  }));
}

function routeSegments(route: string): string[] {
  return route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}
