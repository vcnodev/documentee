#!/usr/bin/env tsx
import { auditCommand, type AuditFormat } from "./commands/audit.js";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { diffOpenApiCommand } from "./commands/diff-openapi.js";
import { generateMcpCommand } from "./commands/generate-mcp.js";
import { initCommand, isInitTemplate, type InitTemplate } from "./commands/init.js";
import { migrateCommand, type MigrationSource } from "./commands/migrate.js";
import { previewCommand } from "./commands/preview.js";
import { parseScreenshotsArgs, screenshotsCommand } from "./commands/screenshots.js";
import { validateCommand } from "./commands/validate.js";
import { resolve } from "node:path";

export { auditCommand } from "./commands/audit.js";
export { buildCommand } from "./commands/build.js";
export { devCommand } from "./commands/dev.js";
export { diffOpenApiCommand } from "./commands/diff-openapi.js";
export { generateMcpCommand } from "./commands/generate-mcp.js";
export { initCommand } from "./commands/init.js";
export { migrateCommand } from "./commands/migrate.js";
export { previewCommand } from "./commands/preview.js";
export { screenshotsCommand } from "./commands/screenshots.js";
export { validateCommand } from "./commands/validate.js";

export async function runCli(argv: string[]): Promise<void> {
  const [command, projectRoot, ...rest] = argv;

  if (command === "init") {
    const options = parseInitArgs([projectRoot, ...rest].filter((value): value is string => Boolean(value)));
    await initCommand(resolveCliPath(options.project), { template: options.template });
    return;
  }

  if (command === "validate") {
    if (!projectRoot) throw new Error("Usage: documentee validate <project>");
    await validateCommand(resolveCliPath(projectRoot));
    return;
  }

  if (command === "audit") {
    if (!projectRoot) throw new Error("Usage: documentee audit <project> --format <markdown|json>");
    const formatIndex = rest.indexOf("--format");
    const format = formatIndex >= 0 ? rest[formatIndex + 1] : "markdown";
    if (!isAuditFormat(format)) throw new Error("Usage: documentee audit <project> --format <markdown|json>");
    console.log(await auditCommand(resolveCliPath(projectRoot), { format }));
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

  if (command === "preview") {
    if (!projectRoot) throw new Error("Usage: documentee preview <project> --out <dir> --port <port>");
    const outIndex = rest.indexOf("--out");
    const outDir = outIndex >= 0 ? rest[outIndex + 1] : "dist";
    const portIndex = rest.indexOf("--port");
    const port = portIndex >= 0 ? Number(rest[portIndex + 1]) : 3000;
    if (!outDir) throw new Error("Usage: documentee preview <project> --out <dir> --port <port>");
    if (!Number.isInteger(port) || port < 0) throw new Error("Port must be a non-negative integer");
    const server = await previewCommand(resolveCliPath(projectRoot), { outDir: resolveCliPath(outDir), port });
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    console.log(`Documentee preview server running at http://127.0.0.1:${boundPort}`);
    return;
  }

  if (command === "screenshots") {
    const parsed = parseScreenshotsArgs([projectRoot, ...rest].filter((value): value is string => Boolean(value)));
    await screenshotsCommand(resolveCliPath(parsed.project), {
      outDir: resolveCliPath(parsed.outDir),
      buildOutDir: resolveCliPath(parsed.buildOutDir)
    });
    return;
  }

  if (command === "diff-openapi") {
    const [oldSpec, newSpec] = [projectRoot, ...rest];
    if (!oldSpec || !newSpec) throw new Error("Usage: documentee diff-openapi <old.yaml> <new.yaml>");
    console.log(await diffOpenApiCommand(resolveCliPath(oldSpec), resolveCliPath(newSpec)));
    return;
  }

  if (command === "generate-mcp") {
    if (!projectRoot) throw new Error("Usage: documentee generate-mcp <project> --out <dir>");
    const outIndex = rest.indexOf("--out");
    const outDir = outIndex >= 0 ? rest[outIndex + 1] : ".documentee-mcp";
    if (!outDir) throw new Error("Usage: documentee generate-mcp <project> --out <dir>");
    await generateMcpCommand(resolveCliPath(projectRoot), resolveCliPath(outDir));
    console.log(`Generated Documentee MCP server at ${resolveCliPath(outDir)}`);
    return;
  }

  if (command === "migrate") {
    const [sourceType, source, target] = [projectRoot, ...rest];
    if (!sourceType || !source || !target) {
      throw new Error("Usage: documentee migrate <mintlify|docusaurus|nextra|scalar|redocly> <source> <target>");
    }
    await migrateCommand(sourceType as MigrationSource, resolveCliPath(source), resolveCliPath(target));
    return;
  }

  throw new Error(`Unknown command: ${command ?? "(missing)"}`);
}

function parseInitArgs(args: string[]): { project: string; template?: InitTemplate } {
  let project: string | undefined;
  let template: InitTemplate | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--template") {
      const value = args[index + 1];
      if (!value || !isInitTemplate(value)) {
        throw new Error("Usage: documentee init <project> --template <api-first|product-docs|enterprise-docs>");
      }
      template = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown init option: ${arg}`);
    }
    if (project) {
      throw new Error("Usage: documentee init <project> --template <api-first|product-docs|enterprise-docs>");
    }
    project = arg;
  }

  if (!project && !template) {
    throw new Error("Usage: documentee init <project> --template <api-first|product-docs|enterprise-docs>");
  }

  return { project: project ?? ".", template };
}

function isAuditFormat(value: string | undefined): value is AuditFormat {
  return value === "markdown" || value === "json";
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
