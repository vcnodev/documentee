import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function initCommand(projectRoot: string): Promise<void> {
  await mkdir(join(projectRoot, "docs", "get-started"), { recursive: true });
  await mkdir(join(projectRoot, "api"), { recursive: true });

  await writeFile(
    join(projectRoot, "documentee.config.ts"),
    `export default {
  site: {
    name: "Acme Docs",
    description: "Developer documentation for the Acme API",
  },
  content: {
    directory: "docs",
  },
  navigation: [
    { group: "Get Started", pages: ["docs/index", "docs/get-started/quickstart"] },
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
    darkMode: true,
  },
};
`,
  );

  await writeFile(
    join(projectRoot, "docs", "index.mdx"),
    `---
title: Home
description: Developer documentation for the Acme API.
---

# Acme Docs

Start with the quickstart or explore the API reference.
`,
  );

  await writeFile(
    join(projectRoot, "docs", "get-started", "quickstart.mdx"),
    `---
title: Quickstart
description: Make your first Acme API request.
---

# Quickstart

Use the Acme API to list messages.
`,
  );

  await writeFile(
    join(projectRoot, "api", "openapi.yaml"),
    `openapi: 3.1.0
info:
  title: Acme API
  version: 1.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      summary: List messages
      tags:
        - Messages
      responses:
        "200":
          description: OK
  /messages/{id}:
    get:
      operationId: getMessage
      summary: Get a message
      tags:
        - Messages
      responses:
        "200":
          description: OK
`,
  );
}
