import { escapeHtml } from "./html.js";

export function renderMdxComponents(markdown: string): string {
  return [
    transformDocusaurusComponents,
    transformNextraComponents,
    transformMintlifyComponents,
    transformBadges,
    transformIcons,
    transformCards,
    transformCardGroups,
    transformAccordions,
    transformAccordionGroups,
    transformFields,
    transformFrames,
    transformCodeGroups,
    transformTabs,
    transformSteps,
    transformCallouts,
  ].reduce((input, transform) => transform(input), markdown);
}

function transformDocusaurusComponents(input: string): string {
  return input
    .replace(/<DocCardList(?:\s+[^>]*)?\/>/g, () => {
      return `<div class="doc-card-list"></div>`;
    })
    .replace(/<Admonition([^>]*)>([\s\S]*?)<\/Admonition>/g, (_match, attrsSource: string, body: string) => {
      const attrs = parseAttributes(attrsSource);
      const type = classToken(attrs.type ?? "note");
      const title = attrs.title ? `<strong>${escapeHtml(attrs.title)}</strong>` : "";
      return `<aside class="doc-callout doc-callout-${type}">${title}${title ? "<br>" : ""}${escapeHtml(body.trim())}</aside>`;
    });
}

function transformNextraComponents(input: string): string {
  return input
    .replace(/<File([^>]*)\/>/g, (_match, attrsSource: string) => {
      const attrs = parseAttributes(attrsSource);
      const name = attrs.name ?? attrs.path ?? "file";
      return `<span class="doc-file">${escapeHtml(name)}</span>`;
    })
    .replace(/<Folder([^>]*)>([\s\S]*?)<\/Folder>/g, (_match, attrsSource: string, body: string) => {
      const attrs = parseAttributes(attrsSource);
      const name = attrs.name ?? "folder";
      const open = hasBooleanAttribute(attrs, "defaultOpen") || hasBooleanAttribute(attrs, "open");
      return `<details class="doc-folder"${open ? " open" : ""}><summary>${escapeHtml(name)}</summary>${body.trim()}</details>`;
    })
    .replace(/<FileTree\s*>([\s\S]*?)<\/FileTree>/g, (_match, body: string) => {
      return `<div class="doc-file-tree">\n${body.trim()}\n</div>`;
    })
    .replace(/<CodeBlock([^>]*)>([\s\S]*?)<\/CodeBlock>/g, (_match, attrsSource: string, body: string) => {
      const attrs = parseAttributes(attrsSource);
      const language = attrs.language ?? attrs.lang ?? "text";
      const title = attrs.title ? `<figcaption>${escapeHtml(attrs.title)}</figcaption>` : "";
      return `<figure class="doc-code-block">${title}<pre><code class="language-${classToken(language)}">${escapeHtml(body.trim())}</code></pre></figure>`;
    })
    .replace(/<Pre([^>]*)>([\s\S]*?)<\/Pre>/g, (_match, attrsSource: string, body: string) => {
      const attrs = parseAttributes(attrsSource);
      const title = attrs.title ? `<figcaption>${escapeHtml(attrs.title)}</figcaption>` : "";
      return `<figure class="doc-pre">${title}<pre><code>${escapeHtml(body.trim())}</code></pre></figure>`;
    });
}

function transformMintlifyComponents(input: string): string {
  return input
    .replace(/<Expandable([^>]*)>([\s\S]*?)<\/Expandable>/g, (_match, attrsSource: string, body: string) => {
      const attrs = parseAttributes(attrsSource);
      const title = attrs.title ?? "Details";
      const open = hasBooleanAttribute(attrs, "defaultOpen") || hasBooleanAttribute(attrs, "open");
      return `<details class="doc-expandable"${open ? " open" : ""}><summary>${escapeHtml(title)}</summary><div>${escapeHtml(body.trim())}</div></details>`;
    })
    .replace(/<Snippet([^>]*)\/>/g, (_match, attrsSource: string) => {
      const attrs = parseAttributes(attrsSource);
      const file = attrs.file ?? attrs.src ?? "snippet";
      return `<figure class="doc-snippet"><figcaption>${escapeHtml(file)}</figcaption></figure>`;
    })
    .replace(/<RequestExample([^>]*)>([\s\S]*?)<\/RequestExample>/g, (_match, attrsSource: string, body: string) => {
      return renderExample("request", parseAttributes(attrsSource), body);
    })
    .replace(/<ResponseExample([^>]*)>([\s\S]*?)<\/ResponseExample>/g, (_match, attrsSource: string, body: string) => {
      return renderExample("response", parseAttributes(attrsSource), body);
    });
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

function transformBadges(input: string): string {
  return input.replace(/<Badge([^>]*)\/>/g, (_match, attrsSource: string) => {
    const attrs = parseAttributes(attrsSource);
    const text = attrs.text ?? attrs.label ?? "Badge";
    const tone = classToken(attrs.tone ?? attrs.type ?? "neutral");
    return `<span class="doc-badge doc-badge-${tone}">${escapeHtml(text)}</span>`;
  });
}

function transformIcons(input: string): string {
  return input.replace(/<Icon([^>]*)\/>/g, (_match, attrsSource: string) => {
    const attrs = parseAttributes(attrsSource);
    const name = attrs.name ?? "icon";
    return `<span class="doc-icon" aria-label="${escapeHtml(name)}">${escapeHtml(iconGlyph(name))}</span>`;
  });
}

function transformCards(input: string): string {
  return input.replace(/<Card(?!Group\b)([^>]*)>([\s\S]*?)<\/Card>/g, (_match, attrsSource: string, body: string) => {
    const attrs = parseAttributes(attrsSource);
    const title = attrs.title ?? "Card";
    const icon = attrs.icon ? `<span class="doc-card-icon">${escapeHtml(iconGlyph(attrs.icon))}</span>` : "";
    const content = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(body.trim())}</p>`;
    const href = attrs.href ? ` href="${escapeHtml(attrs.href)}"` : "";
    const tag = attrs.href ? "a" : "article";
    return `<${tag} class="doc-card"${href}>${icon}<div>${content}</div></${tag}>`;
  });
}

function transformCardGroups(input: string): string {
  return input.replace(/<CardGroup([^>]*)>([\s\S]*?)<\/CardGroup>/g, (_match, attrsSource: string, body: string) => {
    const attrs = parseAttributes(attrsSource);
    const cols = classToken(attrs.cols ?? attrs.columns ?? "2");
    return `<div class="doc-card-group doc-card-group-${cols}">\n${body.trim()}\n</div>`;
  });
}

function transformAccordions(input: string): string {
  return input.replace(/<Accordion(?!Group\b)([^>]*)>([\s\S]*?)<\/Accordion>/g, (_match, attrsSource: string, body: string) => {
    const attrs = parseAttributes(attrsSource);
    const title = attrs.title ?? "Details";
    const open = attrs.open === "true" || attrs.defaultOpen === "true" || attrs.open === "";
    return `<details class="doc-accordion"${open ? " open" : ""}><summary>${escapeHtml(title)}</summary><div>${escapeHtml(body.trim())}</div></details>`;
  });
}

function transformAccordionGroups(input: string): string {
  return input.replace(/<AccordionGroup\s*>([\s\S]*?)<\/AccordionGroup>/g, (_match, body: string) => {
    return `<div class="doc-accordion-group">\n${body.trim()}\n</div>`;
  });
}

function transformFields(input: string): string {
  return input
    .replace(/<ParamField([^>]*)>([\s\S]*?)<\/ParamField>/g, (_match, attrsSource: string, body: string) => {
      return renderField("param", parseAttributes(attrsSource), body);
    })
    .replace(/<ResponseField([^>]*)>([\s\S]*?)<\/ResponseField>/g, (_match, attrsSource: string, body: string) => {
      return renderField("response", parseAttributes(attrsSource), body);
    });
}

function transformFrames(input: string): string {
  return input.replace(/<Frame([^>]*)>([\s\S]*?)<\/Frame>/g, (_match, attrsSource: string, body: string) => {
    const attrs = parseAttributes(attrsSource);
    const caption = attrs.caption ? `<figcaption>${escapeHtml(attrs.caption)}</figcaption>` : "";
    return `<figure class="doc-frame">\n${body.trim()}\n${caption}\n</figure>`;
  });
}

function renderField(kind: "param" | "response", attrs: Record<string, string>, body: string): string {
  const name = attrs.path ?? attrs.name ?? "field";
  const type = attrs.type ? `<span class="doc-field-type">${escapeHtml(attrs.type)}</span>` : "";
  const required = hasBooleanAttribute(attrs, "required") ? `<span class="doc-field-required">required</span>` : "";
  return `<div class="doc-field doc-field-${kind}"><div><strong>${escapeHtml(name)}</strong>${type}${required}</div><p>${escapeHtml(body.trim())}</p></div>`;
}

function renderExample(kind: "request" | "response", attrs: Record<string, string>, body: string): string {
  const title = attrs.title ?? (kind === "request" ? "Request example" : "Response example");
  return `<figure class="doc-example doc-${kind}-example"><figcaption>${escapeHtml(title)}</figcaption><pre><code>${escapeHtml(body.trim())}</code></pre></figure>`;
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([A-Za-z_:][\w:.-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g)) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function hasBooleanAttribute(attrs: Record<string, string>, name: string): boolean {
  return attrs[name] === "" || attrs[name] === "true";
}

function classToken(value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return token || "neutral";
}

function iconGlyph(name: string): string {
  const normalized = classToken(name);
  const icons: Record<string, string> = {
    api: "{}",
    book: "B",
    check: "ok",
    code: "</>",
    rocket: "->",
    terminal: "$",
  };
  return icons[normalized] ?? normalized.slice(0, 1).toUpperCase();
}
