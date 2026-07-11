import { loadConfig, buildManifest, validateManifestWithPlugins } from "@documentee/core";

export async function validateCommand(projectRoot: string): Promise<void> {
  const config = await loadConfig(projectRoot);
  const manifest = await buildManifest(projectRoot, config);
  const diagnostics = await validateManifestWithPlugins(manifest);
  if (diagnostics.length > 0) {
    throw new Error(`Documentee validation failed:\n${diagnostics.map((diagnostic) => `- ${diagnostic}`).join("\n")}`);
  }
}
