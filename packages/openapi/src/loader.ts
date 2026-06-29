import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse as parseYaml } from "yaml";
import type { OpenApiDocument } from "./types.js";

export async function loadOpenApiSpec(filePath: string): Promise<OpenApiDocument> {
  const raw = await readFile(filePath, "utf8");
  const parsed = parseSpec(raw, filePath);

  if (!isRecord(parsed)) {
    throw new Error("OpenAPI spec must be an object");
  }

  if (typeof parsed.openapi !== "string") {
    throw new Error("OpenAPI spec is missing the openapi version");
  }

  if (!parsed.openapi.startsWith("3.")) {
    throw new Error(`Unsupported OpenAPI version: ${parsed.openapi}`);
  }

  if (!isRecord(parsed.info) || typeof parsed.info.title !== "string") {
    throw new Error("OpenAPI spec is missing info.title");
  }

  if (!isRecord(parsed.paths)) {
    throw new Error("OpenAPI spec is missing paths");
  }

  return parsed as unknown as OpenApiDocument;
}

function parseSpec(raw: string, filePath: string): unknown {
  if (extname(filePath).toLowerCase() === ".json") {
    return JSON.parse(raw);
  }

  return parseYaml(raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
