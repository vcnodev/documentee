import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type InitTemplate = "api-first" | "product-docs" | "enterprise-docs";

export type InitOptions = {
  template?: InitTemplate;
};

type TemplateFile = {
  path: string;
  content: string;
};

type StarterTemplate = {
  files: TemplateFile[];
};

export const initTemplates = ["api-first", "product-docs", "enterprise-docs"] as const satisfies readonly InitTemplate[];

export function isInitTemplate(value: string): value is InitTemplate {
  return initTemplates.includes(value as InitTemplate);
}

export async function initCommand(projectRoot: string, options: InitOptions = {}): Promise<void> {
  const template = options.template ?? "api-first";
  const definition = starterTemplates[template];

  for (const file of definition.files) {
    const target = join(projectRoot, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

const starterTemplates: Record<InitTemplate, StarterTemplate> = {
  "api-first": {
    files: [
      {
        path: "documentee.config.ts",
        content: `// Template: api-first
export default {
  site: {
    name: "Acme Docs",
    description: "API-first documentation for builders integrating Acme payments.",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart", "docs/get-started/authentication"] },
    { group: "Guides", pages: ["docs/guides/webhooks"] },
    { group: "API Reference", openapi: "core" },
  ],
  openapi: {
    specs: [
      {
        id: "core",
        name: "Core API",
        source: "./api/openapi.yaml",
        routeBase: "/api-reference",
      },
    ],
  },
  search: {
    provider: "none",
  },
  theme: {
    preset: "api",
    primaryColor: "#2563eb",
    darkMode: true,
  },
  layout: {
    nav: "sidebar",
    toc: "right",
    footer: true,
    breadcrumbs: true,
  },
};
`,
      },
      {
        path: "docs/index.mdx",
        content: `---
title: Home
description: Build payment workflows with the Acme API.
---

# Acme Docs

Ship your first payment integration, test it in sandbox, and move to production with clear API contracts.

<CardGroup cols="2">
  <Card title="Quickstart" href="/get-started/quickstart">
    Create a checkout session and confirm your first successful request.
  </Card>
  <Card title="API reference" href="/api-reference/create-checkout-session">
    Inspect endpoints, request bodies, responses, and authentication.
  </Card>
</CardGroup>
`,
      },
      {
        path: "docs/get-started/quickstart.mdx",
        content: `---
title: Quickstart
description: Create a checkout session in sandbox.
---

# Quickstart

Install your HTTP client, create a sandbox API key, and send your first checkout request.

<PackageInstall package="@acme/sdk" managers="pnpm,npm,yarn" />

\`\`\`bash
curl https://api.acme.test/v1/checkout/sessions \\
  -H "Authorization: Bearer $ACME_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 4900, "currency": "usd"}'
\`\`\`
`,
      },
      {
        path: "docs/get-started/authentication.mdx",
        content: `---
title: Authentication
description: Use bearer tokens safely across sandbox and production.
---

# Authentication

Acme uses bearer tokens for API authentication. Keep production keys on the server, rotate keys during incident response, and scope keys to the environments they are allowed to access.

<Callout type="warning">
Never ship production API keys in client-side applications.
</Callout>
`,
      },
      {
        path: "docs/guides/webhooks.mdx",
        content: `---
title: Webhooks
description: Receive payment lifecycle events.
---

# Webhooks

Use webhooks to react to checkout completion, payment failure, and refund events.

<Steps>
  <Step title="Create an endpoint">Expose a secure HTTPS endpoint in your application.</Step>
  <Step title="Verify signatures">Compare the Acme signature header before processing events.</Step>
  <Step title="Retry safely">Make handlers idempotent so repeated delivery does not duplicate work.</Step>
</Steps>
`,
      },
      {
        path: "api/openapi.yaml",
        content: `openapi: 3.1.0
info:
  title: Acme API
  version: 1.0.0
servers:
  - url: https://api.acme.test/v1
security:
  - bearerAuth: []
paths:
  /messages:
    get:
      operationId: listMessages
      summary: List messages
      tags:
        - Messages
      responses:
        "200":
          description: Messages
  /messages/{id}:
    get:
      operationId: getMessage
      summary: Get a message
      tags:
        - Messages
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Message
  /checkout/sessions:
    post:
      operationId: createCheckoutSession
      summary: Create checkout session
      tags:
        - Checkout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - amount
                - currency
              properties:
                amount:
                  type: integer
                  example: 4900
                currency:
                  type: string
                  example: usd
      responses:
        "201":
          description: Checkout session created
  /customers/{customerId}:
    get:
      operationId: getCustomer
      summary: Get customer
      tags:
        - Customers
      parameters:
        - name: customerId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Customer details
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
`,
      },
    ],
  },
  "product-docs": {
    files: [
      {
        path: "documentee.config.ts",
        content: `// Template: product-docs
export default {
  site: {
    name: "Orbit Product Docs",
    description: "Product documentation for teams launching and operating workspaces in Orbit.",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    { group: "Start", pages: ["docs/index", "docs/get-started/onboarding"] },
    { group: "Workflows", pages: ["docs/guides/projects", "docs/guides/roles"] },
    { group: "Release Notes", pages: ["docs/changelog"] },
  ],
  openapi: {
    specs: [],
  },
  search: {
    provider: "none",
  },
  theme: {
    preset: "startup",
    primaryColor: "#0f766e",
    darkMode: true,
  },
  layout: {
    nav: "sidebar",
    toc: "right",
    footer: true,
    breadcrumbs: true,
  },
};
`,
      },
      {
        path: "docs/index.mdx",
        content: `---
title: Home
description: Learn how teams plan launches in Orbit.
---

# Orbit Product Docs

Help operators understand the core product model, invite their team, and build a repeatable launch workflow.

<FeatureGrid>
  <Feature title="Workspace setup">Create a workspace with the right defaults for your organization.</Feature>
  <Feature title="Project planning">Turn launch work into milestones, tasks, and owners.</Feature>
  <Feature title="Roles and access">Give every teammate the right level of control.</Feature>
</FeatureGrid>
`,
      },
      {
        path: "docs/get-started/onboarding.mdx",
        content: `---
title: Onboarding
description: Bring a team into Orbit.
---

# Onboarding

Invite your core project team first, configure workspace defaults, and create your first launch project.

<Callout type="tip">
Start with one active launch before migrating every workflow.
</Callout>
`,
      },
      {
        path: "docs/guides/projects.mdx",
        content: `---
title: Projects
description: Structure launch work in Orbit.
---

# Projects

Projects organize goals, milestones, tasks, owners, and status updates into one workspace.

<Columns>
  <Column>
    Keep milestones outcome-based so leadership can scan progress quickly.
  </Column>
  <Column>
    Use task owners for execution details and weekly reporting.
  </Column>
</Columns>
`,
      },
      {
        path: "docs/guides/roles.mdx",
        content: `---
title: Roles
description: Assign workspace access.
---

# Roles

Use owner, admin, contributor, and viewer roles to separate workspace administration from project execution.
`,
      },
      {
        path: "docs/changelog.mdx",
        content: `---
title: Changelog
description: Track product updates.
---

# Changelog

<Changelog>
  <Update date="2026-07-01" title="Launch dashboard">
    Added a dashboard for milestone health, open risks, and weekly progress.
  </Update>
  <Update date="2026-06-15" title="Role templates">
    Added reusable role presets for launch teams.
  </Update>
</Changelog>
`,
      },
    ],
  },
  "enterprise-docs": {
    files: [
      {
        path: "documentee.config.ts",
        content: `// Template: enterprise-docs
export default {
  site: {
    name: "Atlas Enterprise Docs",
    description: "Enterprise documentation for security, administration, compliance, and platform APIs.",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    { group: "Overview", pages: ["docs/index"] },
    { group: "Administration", pages: ["docs/admin/workspaces", "docs/deployment/sso"] },
    { group: "Trust", pages: ["docs/security", "docs/compliance/audit-logs"] },
    { group: "Admin API", openapi: "admin" },
  ],
  openapi: {
    specs: [
      {
        id: "admin",
        name: "Admin API",
        source: "./api/admin-openapi.yaml",
        routeBase: "/admin-api",
      },
    ],
  },
  search: {
    provider: "none",
  },
  theme: {
    preset: "enterprise",
    primaryColor: "#475569",
    darkMode: true,
  },
  layout: {
    nav: "sidebar",
    toc: "right",
    footer: true,
    breadcrumbs: true,
    announcement: "Review security requirements before production rollout",
  },
};
`,
      },
      {
        path: "docs/index.mdx",
        content: `---
title: Home
description: Operate Atlas securely at enterprise scale.
---

# Atlas Enterprise Docs

Plan deployment, configure access, review security controls, and automate administration with the Atlas Admin API.

<CardGroup cols="3">
  <Card title="Security" href="/security">Review platform controls and responsibilities.</Card>
  <Card title="SSO" href="/deployment/sso">Connect your identity provider.</Card>
  <Card title="Audit logs" href="/compliance/audit-logs">Export events for governance workflows.</Card>
</CardGroup>
`,
      },
      {
        path: "docs/admin/workspaces.mdx",
        content: `---
title: Workspaces
description: Administer enterprise workspaces.
---

# Workspaces

Create separate workspaces for business units that need independent access policies, billing ownership, or data retention rules.
`,
      },
      {
        path: "docs/deployment/sso.mdx",
        content: `---
title: SSO
description: Configure SAML single sign-on.
---

# SSO

Atlas supports SAML-based single sign-on with enforced domain capture and just-in-time user provisioning.

<Steps>
  <Step title="Create the SAML app">Add Atlas in your identity provider.</Step>
  <Step title="Map attributes">Send email, full name, and group claims.</Step>
  <Step title="Enforce login">Require SSO after validating an admin recovery path.</Step>
</Steps>
`,
      },
      {
        path: "docs/security.mdx",
        content: `---
title: Security
description: Understand Atlas security controls.
---

# Security

Atlas encrypts data in transit and at rest, supports least-privilege administration, and provides audit trails for sensitive actions.

<Callout type="info">
For regulated deployments, pair SSO enforcement with audit log export and quarterly access reviews.
</Callout>
`,
      },
      {
        path: "docs/compliance/audit-logs.mdx",
        content: `---
title: Audit Logs
description: Export administrative events.
---

# Audit Logs

Audit logs capture workspace changes, role updates, authentication events, and API key lifecycle events.
`,
      },
      {
        path: "api/admin-openapi.yaml",
        content: `openapi: 3.1.0
info:
  title: Atlas Admin API
  version: 1.0.0
servers:
  - url: https://api.atlas.test/admin
paths:
  /audit-events:
    get:
      operationId: listAuditEvents
      summary: List audit events
      tags:
        - Audit
      responses:
        "200":
          description: Audit events
  /workspaces/{workspaceId}/members:
    get:
      operationId: listWorkspaceMembers
      summary: List workspace members
      tags:
        - Workspaces
      parameters:
        - name: workspaceId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Workspace members
`,
      },
    ],
  },
};
