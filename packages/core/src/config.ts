import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { DocumenteePlugin } from "./plugins.js";
import { isDocumenteePlugin } from "./plugins.js";

const navigationPageSchema = z.object({
  group: z.string(),
  pages: z.array(z.string()).optional().default([]),
  openapi: z.string().optional(),
});

const contentSchema = z.object({
  directory: z.string().min(1),
  exclude: z.array(z.string().min(1)).default([]),
});

const rootContentSchema = contentSchema.extend({
  directory: z.string().min(1).default("docs"),
}).default({ directory: "docs", exclude: [] });

const versionSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  routePrefix: z.string().min(1).optional(),
  content: contentSchema,
  default: z.boolean().default(false),
  latest: z.boolean().default(false),
  deprecated: z.boolean().default(false),
}).transform((version) => ({
  id: version.id,
  label: version.label ?? version.id,
  routePrefix: normalizeRoutePrefix(version.routePrefix ?? `/${version.id}`),
  content: version.content,
  default: version.default,
  latest: version.latest,
  deprecated: version.deprecated,
}));

const playgroundEnvironmentSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
});

const playgroundSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().url().optional(),
  auth: z.enum(["none", "bearer", "apiKey"]).default("none"),
  apiKeyName: z.string().min(1).optional(),
  apiKeyLocation: z.enum(["header", "query"]).default("header"),
  environments: z.array(playgroundEnvironmentSchema).optional(),
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
  version: z.string().optional(),
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

const legacyThemePresetSchema = z.enum([
  "neutral",
  "mint",
  "slate",
  "highContrast",
  "classic",
  "terminal",
  "startup",
  "enterprise",
  "api",
  "minimal",
]);

const designSystemSchema = z.enum([
  "minimal-technical",
  "modern-glass",
  "api-ide",
  "enterprise-knowledge",
  "premium-editorial",
  "sci-fi-console",
  "api-observatory",
  "knowledge-graph",
]);

const themeTokenSchema = z.object({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  mutedTextColor: z.string().optional(),
  borderColor: z.string().optional(),
  codeBackgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  codeFontFamily: z.string().optional(),
  radius: z.string().optional(),
  navWidth: z.string().optional(),
  contentWidth: z.string().optional(),
  contentPadding: z.string().optional(),
  densitySpace: z.string().optional(),
  cardRadius: z.string().optional(),
  pageBackground: z.string().optional(),
  sidebarBackgroundColor: z.string().optional(),
  panelBackgroundColor: z.string().optional(),
  heroBackground: z.string().optional(),
  bodyFontSize: z.string().optional(),
  smallFontSize: z.string().optional(),
  h1Size: z.string().optional(),
  h2Size: z.string().optional(),
  lineHeight: z.string().optional(),
  headingWeight: z.string().optional(),
  shadowCard: z.string().optional(),
  shadowRaised: z.string().optional(),
  methodGetColor: z.string().optional(),
  methodPostColor: z.string().optional(),
  methodPutColor: z.string().optional(),
  methodPatchColor: z.string().optional(),
  methodDeleteColor: z.string().optional(),
  methodOptionsColor: z.string().optional(),
  methodHeadColor: z.string().optional(),
  methodTraceColor: z.string().optional(),
  customCss: z.string().optional(),
});

const themeSchema = themeTokenSchema.extend({
  preset: legacyThemePresetSchema.optional(),
  designSystem: designSystemSchema.optional(),
  overrides: themeTokenSchema.optional(),
  darkMode: z.boolean().default(true),
}).default({ darkMode: true });

const layoutSchema = z.object({
  nav: z.enum(["sidebar", "topbar", "hybrid"]).default("sidebar"),
  toc: z.enum(["right", "inline", "hidden"]).default("right"),
  footer: z.boolean().default(true),
  breadcrumbs: z.boolean().default(true),
  editUrl: z.string().refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "layout.editUrl must be a valid http or https URL").optional(),
  announcement: z.string().optional(),
}).default({
  nav: "sidebar",
  toc: "right",
  footer: true,
  breadcrumbs: true,
});

const localeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
});

const i18nSchema = z.object({
  defaultLocale: z.string().min(1),
  prefixDefaultLocale: z.boolean().default(false),
  locales: z.array(localeSchema).min(1),
});

const assistantSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "assistant.endpoint must be a site path or a valid http or https URL").optional(),
}).superRefine((assistant, ctx) => {
  if (assistant.enabled && !assistant.endpoint) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endpoint"],
      message: "assistant.endpoint is required when assistant.enabled is true",
    });
  }
});

const feedbackSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "feedback.endpoint must be a site path or a valid http or https URL").optional(),
}).superRefine((feedback, ctx) => {
  if (feedback.enabled && !feedback.endpoint) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endpoint"],
      message: "feedback.endpoint is required when feedback.enabled is true",
    });
  }
});

const analyticsSchema = z.object({
  provider: z.literal("custom"),
  scriptSrc: z.string().refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//");
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "analytics.scriptSrc must be a site path or a valid http or https URL"),
});

const pluginSchema = z.custom<DocumenteePlugin>(isDocumenteePlugin, {
  message: "plugins entries must include a name and supported hook functions",
});

const configSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    url: z.string().optional(),
    basePath: z.string().min(1).optional(),
    description: z.string().optional().default(""),
    logo: z.string().optional(),
  }),
  content: rootContentSchema,
  versions: z.array(versionSchema).default([]),
  navigation: z.array(navigationPageSchema).default([]),
  openapi: z.object({
    specs: z.array(openApiSpecSchema).default([]),
  }).default({ specs: [] }),
  seo: seoSchema,
  redirects: z.array(redirectSchema).default([]),
  search: z.object({
    provider: z.enum(["none", "pagefind"]).default("none"),
  }).default({ provider: "none" }),
  i18n: i18nSchema.optional(),
  assistant: assistantSchema.optional(),
  feedback: feedbackSchema.optional(),
  analytics: analyticsSchema.optional(),
  plugins: z.array(pluginSchema).optional(),
  theme: themeSchema,
  layout: layoutSchema,
});

const docsJsonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  basePath: z.string().optional(),
  logo: z.string().optional(),
  navigation: z.array(navigationPageSchema).default([]),
  versions: z.array(versionSchema).default([]),
  openapi: z.object({
    specs: z.array(openApiSpecSchema).default([]),
  }).default({ specs: [] }),
  seo: seoSchema.optional(),
  redirects: z.array(redirectSchema).optional(),
  i18n: i18nSchema.optional(),
  assistant: assistantSchema.optional(),
  feedback: feedbackSchema.optional(),
  analytics: analyticsSchema.optional(),
  theme: themeSchema.optional(),
  layout: layoutSchema.optional(),
  colors: z.object({
    primary: z.string().optional(),
  }).optional(),
});

type ParsedDocumenteeConfig = z.output<typeof configSchema>;

export type DocumenteeConfigInput = z.input<typeof configSchema>;
export type DocumenteeConfig = ParsedDocumenteeConfig;
export type DocumenteeContentConfigInput = z.input<typeof contentSchema>;
export type NavLayout = z.infer<typeof layoutSchema>["nav"];
export type TocLayout = z.infer<typeof layoutSchema>["toc"];
export type NavigationGroup = z.infer<typeof navigationPageSchema>;
export type OpenApiSpecConfig = z.infer<typeof openApiSpecSchema>;

export function defineConfig<const Config extends DocumenteeConfigInput>(config: Config): Config {
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
  assertValidVersions(parsed.versions);
  assertValidI18n(parsed.i18n);
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
      basePath: parsed.basePath,
      logo: parsed.logo,
    },
    content: { directory: "docs", exclude: [] },
    versions: parsed.versions,
    navigation: parsed.navigation,
    openapi: parsed.openapi,
    seo: parsed.seo,
    redirects: parsed.redirects ?? [],
    search: { provider: "none" },
    i18n: parsed.i18n,
    assistant: parsed.assistant,
    feedback: parsed.feedback,
    analytics: parsed.analytics,
    theme: {
      ...parsed.theme,
      primaryColor: parsed.theme?.primaryColor ?? parsed.colors?.primary,
      darkMode: parsed.theme?.darkMode ?? true,
    },
    layout: parsed.layout,
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

function assertValidVersions(versions: DocumenteeConfig["versions"]): void {
  const ids = new Set<string>();
  const routePrefixes = new Set<string>();
  let defaultCount = 0;
  let latestCount = 0;

  for (const version of versions) {
    if (ids.has(version.id)) {
      throw new Error(`Duplicate version id: ${version.id}`);
    }
    ids.add(version.id);

    if (routePrefixes.has(version.routePrefix)) {
      throw new Error(`Duplicate version route prefix: ${version.routePrefix}`);
    }
    routePrefixes.add(version.routePrefix);

    if (version.default) defaultCount += 1;
    if (version.latest) latestCount += 1;
  }

  if (defaultCount > 1) {
    throw new Error("Only one version can be marked as default");
  }
  if (latestCount > 1) {
    throw new Error("Only one version can be marked as latest");
  }
}

function assertValidI18n(i18n: DocumenteeConfig["i18n"]): void {
  if (!i18n) return;
  const codes = new Set<string>();

  for (const locale of i18n.locales) {
    if (codes.has(locale.code)) {
      throw new Error(`Duplicate i18n locale code: ${locale.code}`);
    }
    codes.add(locale.code);
  }

  if (!codes.has(i18n.defaultLocale)) {
    throw new Error(`i18n.defaultLocale must be included in i18n.locales: ${i18n.defaultLocale}`);
  }
}

function normalizeRoutePrefix(value: string): string {
  const normalized = `/${value.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "/" : normalized;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
