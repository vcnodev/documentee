import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const navigationPageSchema = z.object({
  group: z.string(),
  pages: z.array(z.string()).optional().default([]),
  openapi: z.string().optional(),
});

const openApiSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  source: z.string().min(1),
  routeBase: z.string().min(1).default("/api-reference"),
});

const configSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    url: z.string().optional(),
    description: z.string().optional().default(""),
    logo: z.string().optional(),
  }),
  content: z.object({
    directory: z.string().min(1).default("docs"),
  }).default({ directory: "docs" }),
  navigation: z.array(navigationPageSchema).default([]),
  openapi: z.object({
    specs: z.array(openApiSpecSchema).default([]),
  }).default({ specs: [] }),
  search: z.object({
    provider: z.enum(["none", "pagefind"]).default("none"),
  }).default({ provider: "none" }),
  theme: z.object({
    primaryColor: z.string().optional(),
    darkMode: z.boolean().default(true),
  }).default({ darkMode: true }),
});

const docsJsonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  logo: z.string().optional(),
  navigation: z.array(navigationPageSchema).default([]),
  openapi: z.object({
    specs: z.array(openApiSpecSchema).default([]),
  }).default({ specs: [] }),
  colors: z.object({
    primary: z.string().optional(),
  }).optional(),
});

export type DocumenteeConfig = z.infer<typeof configSchema>;
export type NavigationGroup = z.infer<typeof navigationPageSchema>;
export type OpenApiSpecConfig = z.infer<typeof openApiSpecSchema>;

export function defineConfig(config: DocumenteeConfig): DocumenteeConfig {
  return config;
}

export async function loadConfig(projectRoot: string): Promise<DocumenteeConfig> {
  const root = resolve(projectRoot);
  const tsConfigPath = join(root, "documentee.config.ts");
  const jsConfigPath = join(root, "documentee.config.js");
  const docsJsonPath = join(root, "docs.json");

  let raw: unknown;

  if (await exists(tsConfigPath)) {
    raw = await importConfig(tsConfigPath);
  } else if (await exists(jsConfigPath)) {
    raw = await importConfig(jsConfigPath);
  } else if (await exists(docsJsonPath)) {
    raw = normalizeDocsJson(JSON.parse(await readFile(docsJsonPath, "utf8")));
  } else {
    throw new Error(`No Documentee config found in ${root}`);
  }

  const parsed = configSchema.parse(raw);
  assertUniqueOpenApiIds(parsed.openapi.specs);
  return parsed;
}

async function importConfig(filePath: string): Promise<unknown> {
  const imported = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
  return imported.default ?? imported.config;
}

function normalizeDocsJson(input: unknown): DocumenteeConfig {
  const parsed = docsJsonSchema.parse(input);
  return configSchema.parse({
    site: {
      name: parsed.name,
      description: parsed.description ?? "",
      url: parsed.url,
      logo: parsed.logo,
    },
    content: { directory: "docs" },
    navigation: parsed.navigation,
    openapi: parsed.openapi,
    search: { provider: "none" },
    theme: {
      primaryColor: parsed.colors?.primary,
      darkMode: true,
    },
  });
}

function assertUniqueOpenApiIds(specs: OpenApiSpecConfig[]): void {
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.id)) {
      throw new Error(`Duplicate OpenAPI spec id: ${spec.id}`);
    }
    seen.add(spec.id);
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
