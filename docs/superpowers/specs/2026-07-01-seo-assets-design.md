# Sitemap, Redirects, Robots, And SEO Metadata Design

## Goal

Add production-ready SEO and discovery artifacts to Documentee static builds:

- `sitemap.xml`
- `robots.txt`
- redirect artifacts
- richer per-page HTML metadata

## Scope

This milestone implements SEO support in the existing static renderer and build pipeline.

Included:

- Config for sitemap, robots, redirects, and default SEO metadata.
- Frontmatter support for canonical URL, robots directives, Open Graph image, and social title/description overrides.
- Route-level SEO metadata for authored pages, generated API operation pages, and schema pages.
- `sitemap.xml` written during static builds when `site.url` is configured.
- `robots.txt` written during static builds with sitemap link and allow/disallow rules.
- Redirect config as source of truth.
- Static HTML redirect fallback pages at redirect source paths.
- Netlify/Cloudflare `_redirects` artifact.
- Vercel-style `vercel.json` redirects artifact in the output directory.
- Validation for redirect conflicts and invalid redirect status codes.
- Tests for config parsing, metadata rendering, generated assets, redirect output, and example build output.

Excluded:

- Runtime server redirects.
- Dynamic route discovery outside the generated manifest.
- Per-route priority or change frequency in `sitemap.xml`.
- Image generation for social cards.
- Search engine submission.

## Config

Example:

```ts
export default {
  site: {
    name: "Acme Docs",
    url: "https://docs.acme.test",
    description: "Developer documentation for Acme"
  },
  seo: {
    titleTemplate: "%s | Acme Docs",
    image: "/og.png",
    twitterCard: "summary_large_image",
    robots: {
      enabled: true,
      rules: [{ userAgent: "*", allow: "/" }]
    },
    sitemap: true
  },
  redirects: [
    { from: "/old", to: "/get-started/quickstart", status: 301 }
  ]
}
```

Defaults:

- `seo.sitemap`: `true`
- `seo.robots.enabled`: `true`
- `seo.robots.rules`: `[{ userAgent: "*", allow: "/" }]`
- `seo.twitterCard`: `"summary_large_image"`
- `redirects`: `[]`

`site.url` is required to emit absolute sitemap URLs, canonical URLs, and social URL metadata. If `site.url` is absent, the build still renders page metadata that does not require an absolute URL, skips `sitemap.xml`, and writes `robots.txt` without a sitemap line.

## Page Frontmatter

Authored pages may define:

```yaml
---
title: Quickstart
description: Make your first API request.
canonical: https://docs.acme.test/start
robots: noindex,nofollow
image: /quickstart-og.png
socialTitle: Start with Acme
socialDescription: Send your first request in minutes.
---
```

These fields override site defaults for that page.

Generated API operation and schema pages use route title, route description, site URL, and global SEO defaults.

## HTML Metadata

Every rendered HTML page includes:

- `<title>`
- `<meta name="description">`
- canonical link when an absolute URL can be resolved
- `<meta name="robots">` when configured by page frontmatter
- Open Graph title, description, type, URL, site name, and image when available
- Twitter card, title, description, and image when available

Metadata is escaped and derived from the manifest, not hand-built per renderer.

## Sitemap

`sitemap.xml` includes all non-redirect routes in the manifest when `site.url` exists and `seo.sitemap` is enabled.

Each entry includes:

- `<loc>` absolute route URL

The first milestone intentionally omits priority and change frequency.

## Robots

`robots.txt` is emitted when `seo.robots.enabled` is true.

It includes configured rules:

```txt
User-agent: *
Allow: /
Sitemap: https://docs.acme.test/sitemap.xml
```

If `site.url` is absent, the sitemap line is omitted.

## Redirects

Redirect config writes three outputs:

- HTML fallback at the redirect source route, using meta refresh and canonical link.
- `_redirects`, compatible with Netlify and Cloudflare Pages.
- `vercel.json` containing a `redirects` array.

Redirect source routes must not conflict with generated content/API/schema routes.

Allowed status codes:

- `301`
- `302`
- `307`
- `308`

## Testing

Required tests:

- Config parser normalizes SEO and redirects defaults.
- Config parser accepts explicit SEO/redirect settings.
- Content frontmatter carries SEO fields into content pages.
- Static renderer outputs canonical, robots, Open Graph, and Twitter metadata.
- Static build writes `sitemap.xml`, `robots.txt`, redirect fallback HTML, `_redirects`, and `vercel.json`.
- Validation reports redirect source conflicts with real routes.
- Example build emits sitemap, robots, and redirect artifacts.

## Acceptance

The goal is complete when:

- Static builds produce SEO assets and redirect outputs from config.
- Rendered HTML includes useful SEO metadata.
- Authored page frontmatter can override canonical, robots, and social metadata.
- Tests and example build prove the feature.
- Full verification passes.
