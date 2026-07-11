import type { DocumenteeConfig } from "./config.js";
import type { SiteManifest, SiteRoute } from "./manifest.js";
import type { ValidationIssue } from "./validation.js";

export interface DocumenteePlugin {
  name: string;
  transformManifest?: (manifest: SiteManifest) => SiteManifest | Promise<SiteManifest>;
  transformHtml?: (html: string, route: SiteRoute, manifest: SiteManifest) => string | Promise<string>;
  validate?: (manifest: SiteManifest) => ValidationIssue[] | Promise<ValidationIssue[]>;
}

export function getPlugins(config: DocumenteeConfig): DocumenteePlugin[] {
  return config.plugins ?? [];
}

export async function applyManifestPlugins(manifest: SiteManifest): Promise<SiteManifest> {
  let current = manifest;

  for (const plugin of getPlugins(current.config)) {
    if (!plugin.transformManifest) continue;
    const next = await plugin.transformManifest(current);
    if (!isManifestLike(next)) {
      throw new Error(`Plugin ${plugin.name} transformManifest must return a site manifest`);
    }
    current = next;
  }

  return current;
}

export async function applyHtmlPlugins(html: string, route: SiteRoute, manifest: SiteManifest): Promise<string> {
  let current = html;

  for (const plugin of getPlugins(manifest.config)) {
    if (!plugin.transformHtml) continue;
    current = await plugin.transformHtml(current, route, manifest);
  }

  return current;
}

export async function validatePlugins(manifest: SiteManifest): Promise<ValidationIssue[]> {
  const diagnostics: ValidationIssue[] = [];

  for (const plugin of getPlugins(manifest.config)) {
    if (!plugin.validate) continue;
    diagnostics.push(...await plugin.validate(manifest));
  }

  return diagnostics;
}

export function isDocumenteePlugin(value: unknown): value is DocumenteePlugin {
  if (!value || typeof value !== "object") return false;
  const plugin = value as Record<string, unknown>;
  if (typeof plugin.name !== "string" || plugin.name.trim().length === 0) return false;

  for (const hook of ["transformManifest", "transformHtml", "validate"] as const) {
    if (plugin[hook] !== undefined && typeof plugin[hook] !== "function") return false;
  }

  return true;
}

function isManifestLike(value: unknown): value is SiteManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as SiteManifest;
  return Array.isArray(manifest.routes) && Array.isArray(manifest.pages) && Array.isArray(manifest.operations);
}
