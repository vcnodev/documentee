import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, parse, relative, resolve } from "node:path";
import { buildManifest, loadConfig, renderStaticSite } from "@documentee/core";
import { renderLlmsFullTxt, renderLlmsJson, renderLlmsTxt, renderSkillMd } from "@documentee/llms";
import { buildPagefindIndex } from "@documentee/search";

export async function buildCommand(projectRoot: string, outDir: string): Promise<void> {
  const resolvedProjectRoot = resolve(projectRoot);
  const resolvedOutDir = resolve(outDir);
  assertSafeOutputDirectory(resolvedProjectRoot, resolvedOutDir);

  const config = await loadConfig(projectRoot);
  const manifest = await buildManifest(projectRoot, config);

  await rm(resolvedOutDir, { recursive: true, force: true });
  await renderStaticSite(manifest, { outDir: resolvedOutDir });
  await mkdir(resolvedOutDir, { recursive: true });
  await writeFile(join(resolvedOutDir, "llms.txt"), renderLlmsTxt(manifest));
  await writeFile(join(resolvedOutDir, "llms-full.txt"), renderLlmsFullTxt(manifest));
  await writeFile(join(resolvedOutDir, "llms.json"), renderLlmsJson(manifest));
  await writeFile(join(resolvedOutDir, "skill.md"), renderSkillMd(manifest));

  if (config.search.provider === "pagefind") {
    await buildPagefindIndex(resolvedOutDir, { basePath: config.site.basePath });
  }
}

function assertSafeOutputDirectory(projectRoot: string, outDir: string): void {
  const rootDir = parse(outDir).root;
  const blocked = new Set([rootDir, homedir(), process.cwd(), projectRoot].map((path) => resolve(path)));
  const relativeProject = relative(outDir, projectRoot);
  const outDirContainsProject = relativeProject === "" || (!relativeProject.startsWith("..") && !isAbsolute(relativeProject));

  if (blocked.has(outDir) || outDirContainsProject) {
    throw new Error(`Refusing to clean unsafe output directory: ${outDir}`);
  }
}
