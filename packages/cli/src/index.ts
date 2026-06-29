#!/usr/bin/env tsx
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { initCommand } from "./commands/init.js";
import { migrateCommand, type MigrationSource } from "./commands/migrate.js";
import { validateCommand } from "./commands/validate.js";
import { resolve } from "node:path";

export { buildCommand } from "./commands/build.js";
export { devCommand } from "./commands/dev.js";
export { initCommand } from "./commands/init.js";
export { migrateCommand } from "./commands/migrate.js";
export { validateCommand } from "./commands/validate.js";

export async function runCli(argv: string[]): Promise<void> {
  const [command, projectRoot, ...rest] = argv;

  if (command === "init") {
    if (!projectRoot) throw new Error("Usage: documentee init <project>");
    await initCommand(resolveCliPath(projectRoot));
    return;
  }

  if (command === "validate") {
    if (!projectRoot) throw new Error("Usage: documentee validate <project>");
    await validateCommand(resolveCliPath(projectRoot));
    return;
  }

  if (command === "build") {
    if (!projectRoot) throw new Error("Usage: documentee build <project> --out <dir>");
    const outIndex = rest.indexOf("--out");
    const outDir = outIndex >= 0 ? rest[outIndex + 1] : "dist";
    if (!outDir) throw new Error("Usage: documentee build <project> --out <dir>");
    await buildCommand(resolveCliPath(projectRoot), resolveCliPath(outDir));
    return;
  }

  if (command === "dev") {
    if (!projectRoot) throw new Error("Usage: documentee dev <project> --port <port>");
    const portIndex = rest.indexOf("--port");
    const port = portIndex >= 0 ? Number(rest[portIndex + 1]) : 3000;
    if (!Number.isInteger(port) || port < 0) throw new Error("Port must be a non-negative integer");
    const server = await devCommand(resolveCliPath(projectRoot), { port });
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    console.log(`Documentee dev server running at http://127.0.0.1:${boundPort}`);
    return;
  }

  if (command === "migrate") {
    const [sourceType, source, target] = [projectRoot, ...rest];
    if (!sourceType || !source || !target) {
      throw new Error("Usage: documentee migrate <mintlify|docusaurus|nextra> <source> <target>");
    }
    await migrateCommand(sourceType as MigrationSource, resolveCliPath(source), resolveCliPath(target));
    return;
  }

  throw new Error(`Unknown command: ${command ?? "(missing)"}`);
}

function resolveCliPath(input: string): string {
  return resolve(process.env.INIT_CWD ?? process.cwd(), input);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
