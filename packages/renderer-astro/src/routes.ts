import type { SiteManifest, SiteRoute } from "@documentee/core";

export interface AstroRouteModule {
  route: string;
  params: Record<string, string>;
  props: {
    route: SiteRoute;
  };
}

export function createAstroRouteModules(manifest: SiteManifest): AstroRouteModule[] {
  return manifest.routes.map((route) => ({
    route: route.route,
    params: paramsForRoute(route.route),
    props: { route },
  }));
}

function paramsForRoute(route: string): Record<string, string> {
  if (route === "/") return {};
  return { slug: route.replace(/^\/+|\/+$/g, "") };
}
