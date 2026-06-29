import { escapeHtml } from "./html.js";

export function renderMdxComponents(markdown: string): string {
  return transformCodeGroups(transformTabs(transformSteps(transformCallouts(markdown))));
}

function transformCallouts(input: string): string {
  return input.replace(
    /<Callout(?:\s+type="([^"]+)")?\s*>([\s\S]*?)<\/Callout>/g,
    (_match, type: string | undefined, body: string) => {
      const normalizedType = type ?? "note";
      return `<aside class="doc-callout doc-callout-${escapeHtml(normalizedType)}">${escapeHtml(body.trim())}</aside>`;
    },
  );
}

function transformSteps(input: string): string {
  return input.replace(/<Steps\s*>([\s\S]*?)<\/Steps>/g, (_match, body: string) => {
    const items = [...body.matchAll(/<Step(?:\s+title="([^"]+)")?\s*>([\s\S]*?)<\/Step>/g)]
      .map((match) => `<li><strong>${escapeHtml(match[1] ?? "Step")}</strong><p>${escapeHtml(match[2]?.trim() ?? "")}</p></li>`)
      .join("");
    return `<ol class="doc-steps">${items}</ol>`;
  });
}

function transformTabs(input: string): string {
  return input.replace(/<Tabs\s*>([\s\S]*?)<\/Tabs>/g, (_match, body: string) => {
    const tabs = [...body.matchAll(/<Tab(?:\s+title="([^"]+)")?\s*>([\s\S]*?)<\/Tab>/g)]
      .map((match) => `<section class="doc-tab"><h3>${escapeHtml(match[1] ?? "Tab")}</h3><p>${escapeHtml(match[2]?.trim() ?? "")}</p></section>`)
      .join("");
    return `<div class="doc-tabs">${tabs}</div>`;
  });
}

function transformCodeGroups(input: string): string {
  return input.replace(/<CodeGroup\s*>([\s\S]*?)<\/CodeGroup>/g, (_match, body: string) => {
    return `<div class="doc-code-group">\n${body.trim()}\n</div>`;
  });
}
