import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const navigationPageSchema = z.object({
  group: z.string(),
  pages: z.array(z.string()).optional().default([]),
  openapi: z.string().optional(),
});

const playgroundSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().url().optional(),
  auth: z.enum(["none", "bearer", "apiKey"]).default("none"),
  apiKeyName: z.string().min(1).optional(),
  apiKeyLocation: z.enum(["header", "query"]).default("header"),
}).default({
  enabled: false,
  auth: "none",
  apiKeyLocation: "header",
});

const openApiSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  source: z.string().min(1),
  routeBase: z.string().min(1).default("/api-reference"),
  playground: playgroundSchema,
});

const robotsRuleSchema = z.object({
  userAgent: z.string().min(1),
  allow: z.string().optional(),
  disallow: z.string().optional(),
});

const seoSchema = z.object({
  titleTemplate: z.string().optional(),
  image: z.string().optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).default("summary_large_image"),
  sitemap: z.boolean().default(true),
  robots: z.object({
    enabled: z.boolean().default(true),
    rules: z.array(robotsRuleSchema).default([{ userAgent: "*", allow: "/" }]),
  }).default({
    enabled: true,
    rules: [{ userAgent: "*", allow: "/" }],
  }),
}).default({
  sitemap: true,
  robots: {
    enabled: true,
    rules: [{ userAgent: "*", allow: "/" }],
  },
  twitterCard: "summary_large_image",
});

const redirectSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  status: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).default(301),
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
  seo: seoSchema,
  redirects: z.array(redirectSchema).default([]),
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
  seo: seoSchema.optional(),
  redirects: z.array(redirectSchema).optional(),
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
    seo: parsed.seo,
    redirects: parsed.redirects ?? [],
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
