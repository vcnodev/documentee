import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { marked } from "marked";
import type { DocumenteeContentConfigInput } from "./config.js";
import { renderMdxComponents } from "./mdx-components.js";

export interface ContentPage {
  sourcePath: string;
  sourceRelativePath: string;
  sourceProjectPath?: string;
  route: string;
  title: string;
  description: string;
  lastUpdated: string;
  seo: PageSeo;
  markdown: string;
  html: string;
}

export interface PageSeo {
  canonical?: string;
  robots?: string;
  image?: string;
  socialTitle?: string;
  socialDescription?: string;
}

export async function loadContentPages(
  projectRoot: string,
  content: DocumenteeContentConfigInput,
): Promise<ContentPage[]> {
  const contentRoot = resolve(projectRoot, content.directory);
  const files = await fg(["**/*.md", "**/*.mdx"], {
    cwd: contentRoot,
    absolute: true,
    ignore: content.exclude ?? [],
    onlyFiles: true,
  });

  const pages = await Promise.all(files.map((filePath) => loadPage(projectRoot, contentRoot, filePath)));
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

async function loadPage(projectRoot: string, contentRoot: string, filePath: string): Promise<ContentPage> {
  const raw = await readFile(filePath, "utf8");
  const fileStat = await stat(filePath);
  const parsed = matter(raw);
  const markdown = renderMdxComponents(parsed.content.trim());
  const html = await marked.parse(markdown, { async: true });
  const sourceRelativePath = relative(contentRoot, filePath).split(/[\\/]/g).join("/");
  const sourceProjectPath = projectRelativePath(projectRoot, filePath);
  const route = routeFromFile(contentRoot, filePath);

  return {
    sourcePath: filePath,
    sourceRelativePath,
    sourceProjectPath,
    route,
    title: stringValue(parsed.data.title) ?? titleFromRoute(route),
    description: stringValue(parsed.data.description) ?? "",
    lastUpdated: fileStat.mtime.toISOString(),
    seo: {
      canonical: stringValue(parsed.data.canonical),
      robots: stringValue(parsed.data.robots),
      image: stringValue(parsed.data.image),
      socialTitle: stringValue(parsed.data.socialTitle),
      socialDescription: stringValue(parsed.data.socialDescription),
    },
    markdown,
    html,
  };
}

function projectRelativePath(projectRoot: string, filePath: string): string | undefined {
  const normalized = relative(resolve(projectRoot), filePath).split(/[\\/]/g).join("/");
  if (normalized === ".." || normalized.startsWith("../") || isAbsolute(normalized)) return undefined;
  return normalized;
}

function routeFromFile(contentRoot: string, filePath: string): string {
  const withoutExtension = relative(contentRoot, filePath).replace(/\.(mdx|md)$/i, "");
  const normalized = withoutExtension.split(/[\\/]/g).join("/");
  if (normalized === "index") return "/";
  if (normalized.endsWith("/index")) return `/${normalized.slice(0, -"index".length).replace(/\/$/g, "")}`;
  return `/${normalized}`;
}

function titleFromRoute(route: string): string {
  const segment = route.split("/").filter(Boolean).at(-1) ?? "Home";
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
