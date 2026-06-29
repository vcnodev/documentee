import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildManifest, loadConfig, renderStaticSite } from "@documentee/core";
import { renderLlmsFullTxt, renderLlmsTxt } from "@documentee/llms";
import { buildPagefindIndex } from "@documentee/search";

export async function buildCommand(projectRoot: string, outDir: string): Promise<void> {
  const config = await loadConfig(projectRoot);
  const manifest = await buildManifest(projectRoot, config);
  const resolvedOutDir = resolve(outDir);

  await renderStaticSite(manifest, { outDir: resolvedOutDir });
  await mkdir(resolvedOutDir, { recursive: true });
  await writeFile(join(resolvedOutDir, "llms.txt"), renderLlmsTxt(manifest));
  await writeFile(join(resolvedOutDir, "llms-full.txt"), renderLlmsFullTxt(manifest));

  if (config.search.provider === "pagefind") {
    await buildPagefindIndex(resolvedOutDir);
  }
}
