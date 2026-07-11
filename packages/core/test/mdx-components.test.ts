import { describe, expect, it } from "vitest";
import { renderMdxComponents } from "../src/mdx-components.js";

describe("renderMdxComponents", () => {
  it("renders richer authoring components as static HTML", () => {
    const markdown = renderMdxComponents(`
<PackageInstall package="documentee" managers="pnpm,npm,yarn" />

<CliCommand command="documentee build . --out dist" />

<Mermaid title="Request flow">
graph TD
  A[Docs] --> B[Build]
</Mermaid>

<Changelog>
<Update title="Version lifecycle" date="2026-07-07" label="New">Latest and deprecated badges are available.</Update>
</Changelog>

<Columns cols="2">
<Column title="Guides">Task-focused pages.</Column>
<Column title="API">Generated endpoint docs.</Column>
</Columns>

<FeatureGrid>
<Feature title="Static output" icon="check">No hydration required.</Feature>
<Feature title="Agent-ready" icon="code">LLM files ship with builds.</Feature>
</FeatureGrid>

<EndpointCard method="POST" path="/messages" href="/api-reference/create-message">Create a message.</EndpointCard>

<OpenApiOperation method="GET" path="/messages" summary="List messages" href="/api-reference/list-messages" />
`);

    expect(markdown).toContain('class="doc-package-install"');
    expect(markdown).toContain("pnpm add documentee");
    expect(markdown).toContain("npm install documentee");
    expect(markdown).toContain('class="doc-cli-command"');
    expect(markdown).toContain("documentee build . --out dist");
    expect(markdown).toContain('class="doc-mermaid"');
    expect(markdown).toContain('class="language-mermaid"');
    expect(markdown).toContain("Request flow");
    expect(markdown).toContain('class="doc-changelog"');
    expect(markdown).toContain('class="doc-update"');
    expect(markdown).toContain("Version lifecycle");
    expect(markdown).toContain('class="doc-columns doc-columns-2"');
    expect(markdown).toContain('class="doc-column"');
    expect(markdown).toContain('class="doc-feature-grid"');
    expect(markdown).toContain('class="doc-feature"');
    expect(markdown).toContain('<article class="doc-endpoint-card method-post">');
    expect(markdown).toContain('href="/api-reference/create-message"');
    expect(markdown).toContain('<article class="doc-openapi-operation method-get">');
    expect(markdown).toContain("List messages");
  });

  it("renders richer static docs primitives without client JavaScript", () => {
    const markdown = renderMdxComponents(`
<Badge text="Beta" tone="success" />

<Icon name="terminal" />

<CardGroup cols="2">
<Card title="Quickstart" icon="rocket" href="/get-started/quickstart">Ship your first docs page.</Card>
<Card title="API Reference">Generate routes from OpenAPI.</Card>
</CardGroup>

<AccordionGroup>
<Accordion title="Can I deploy statically?">Yes. The output is static HTML.</Accordion>
</AccordionGroup>

<ParamField path="body.message" type="string" required>Message body text.</ParamField>

<ResponseField name="message" type="object">Returned message object.</ResponseField>

<Frame caption="Dashboard preview">
<img src="/dashboard.png" alt="Dashboard">
</Frame>
`);

    expect(markdown).toContain('class="doc-badge doc-badge-success"');
    expect(markdown).toContain('class="doc-icon" aria-label="terminal"');
    expect(markdown).toContain('class="doc-card-group doc-card-group-2"');
    expect(markdown).toContain('class="doc-card" href="/get-started/quickstart"');
    expect(markdown).toContain('class="doc-card-icon" aria-hidden="true"');
    expect(markdown).toContain("<h3>Quickstart</h3>");
    expect(markdown).toContain('class="doc-accordion-group"');
    expect(markdown).toContain('<details class="doc-accordion">');
    expect(markdown).toContain("<summary>Can I deploy statically?</summary>");
    expect(markdown).toContain('class="doc-field doc-field-param"');
    expect(markdown).toContain("body.message");
    expect(markdown).toContain("required");
    expect(markdown).toContain('class="doc-field doc-field-response"');
    expect(markdown).toContain('class="doc-frame"');
    expect(markdown).toContain("<figcaption>Dashboard preview</figcaption>");
  });

  it("renders framework compatibility components as static HTML", () => {
    const markdown = renderMdxComponents(`
<DocCardList />

<Admonition type="tip" title="Heads up">Use the new SDK.</Admonition>

<FileTree>
<Folder name="app" defaultOpen>
<File name="page.tsx" />
</Folder>
</FileTree>

<CodeBlock language="ts" title="Install">
pnpm add documentee
</CodeBlock>

<Pre title="Output">
done
</Pre>

<Expandable title="Details">Static content.</Expandable>

<Snippet file="install.mdx" />

<RequestExample title="Create message">
POST /messages
</RequestExample>

<ResponseExample title="Created">
201 Created
</ResponseExample>
`);

    expect(markdown).toContain('class="doc-card-list"');
    expect(markdown).toContain('class="doc-callout doc-callout-tip"');
    expect(markdown).toContain("<strong>Heads up</strong>");
    expect(markdown).toContain('class="doc-file-tree"');
    expect(markdown).toContain("<summary>app</summary>");
    expect(markdown).toContain("page.tsx");
    expect(markdown).toContain('class="doc-code-block"');
    expect(markdown).toContain("<figcaption>Install</figcaption>");
    expect(markdown).toContain('class="doc-pre"');
    expect(markdown).toContain("<summary>Details</summary>");
    expect(markdown).toContain('class="doc-snippet"');
    expect(markdown).toContain("install.mdx");
    expect(markdown).toContain('class="doc-example doc-request-example"');
    expect(markdown).toContain('class="doc-example doc-response-example"');
  });
});
