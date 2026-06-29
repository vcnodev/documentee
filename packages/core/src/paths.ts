export function routeToOutputPath(route: string): string[] {
  const clean = route.replace(/^\/+|\/+$/g, "");
  if (!clean) return ["index.html"];
  return [...clean.split("/"), "index.html"];
}
