import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { marked } from "marked";
import type { DocumenteeConfig } from "./config.js";
import { renderMdxComponents } from "./mdx-components.js";

export interface ContentPage {
  sourcePath: string;
  route: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
}

export async function loadContentPages(
  projectRoot: string,
  content: DocumenteeConfig["content"],
): Promise<ContentPage[]> {
  const contentRoot = resolve(projectRoot, content.directory);
  const files = await fg(["**/*.md", "**/*.mdx"], {
    cwd: contentRoot,
    absolute: true,
    onlyFiles: true,
  });

  const pages = await Promise.all(files.map((filePath) => loadPage(contentRoot, filePath)));
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

async function loadPage(contentRoot: string, filePath: string): Promise<ContentPage> {
  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  const markdown = renderMdxComponents(parsed.content.trim());
  const html = await marked.parse(markdown, { async: true });
  const route = routeFromFile(contentRoot, filePath);

  return {
    sourcePath: filePath,
    route,
    title: stringValue(parsed.data.title) ?? titleFromRoute(route),
    description: stringValue(parsed.data.description) ?? "",
    markdown,
    html,
  };
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
