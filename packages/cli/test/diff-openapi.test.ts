import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { diffOpenApiCommand } from "../src/commands/diff-openapi.js";
import { runCli } from "../src/index.js";

describe("diffOpenApiCommand", () => {
  it("reports OpenAPI operation, request, response, and deprecation changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-openapi-diff-"));
    const oldSpec = join(root, "old.yaml");
    const newSpec = join(root, "new.yaml");

    await writeFile(oldSpec, `openapi: 3.1.0
info:
  title: Acme
  version: 1.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      responses:
        "200":
          description: OK
    post:
      operationId: createMessage
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateMessage"
      responses:
        "201":
          description: Created
  /messages/{id}:
    delete:
      operationId: deleteMessage
      responses:
        "204":
          description: Deleted
components:
  schemas:
    CreateMessage:
      type: object
      required: [text]
      properties:
        text:
          type: string
        channel:
          type: string
`);

    await writeFile(newSpec, `openapi: 3.1.0
info:
  title: Acme
  version: 2.0.0
paths:
  /messages:
    get:
      operationId: listMessages
      deprecated: true
      responses:
        "206":
          description: Partial
    post:
      operationId: createMessage
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateMessage"
      responses:
        "201":
          description: Created
        "400":
          description: Bad request
  /messages/search:
    get:
      operationId: searchMessages
      responses:
        "200":
          description: OK
components:
  schemas:
    CreateMessage:
      type: object
      required: [text, priority]
      properties:
        text:
          type: string
        priority:
          type: integer
`);

    const report = await diffOpenApiCommand(oldSpec, newSpec);

    expect(report).toContain("# OpenAPI Diff");
    expect(report).toContain("- Added operations: 1");
    expect(report).toContain("- Removed operations: 1");
    expect(report).toContain("- Changed request fields: 2");
    expect(report).toContain("- Changed response statuses: 3");
    expect(report).toContain("- Deprecated operations: 1");
    expect(report).toContain("## Breaking Changes");
    expect(report).toContain("- Removed operation `DELETE /messages/{id}`");
    expect(report).toContain("- Removed response `200` from `GET /messages`");
    expect(report).toContain("- Added required request field `priority` to `POST /messages`");
    expect(report).toContain("- Removed request field `channel` from `POST /messages`");
    expect(report).toContain("## Added Operations");
    expect(report).toContain("- `GET /messages/search`");
    expect(report).toContain("## Deprecated Operations");
    expect(report).toContain("- `GET /messages`");
  });

  it("prints the report from the CLI route", async () => {
    const root = await mkdtemp(join(tmpdir(), "documentee-openapi-diff-cli-"));
    const oldSpec = join(root, "old.yaml");
    const newSpec = join(root, "new.yaml");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await writeFile(oldSpec, "openapi: 3.1.0\ninfo:\n  title: Old\n  version: 1\npaths: {}\n");
    await writeFile(newSpec, "openapi: 3.1.0\ninfo:\n  title: New\n  version: 2\npaths: {}\n");

    try {
      await runCli(["diff-openapi", oldSpec, newSpec]);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("# OpenAPI Diff"));
    } finally {
      log.mockRestore();
    }
  });
});
