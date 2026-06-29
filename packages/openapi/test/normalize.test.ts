import { describe, expect, it } from "vitest";
import { normalizeOperations } from "../src/normalize.js";
import type { OpenApiDocument } from "../src/types.js";

describe("normalizeOperations", () => {
  it("extracts operations and stable routes without inlining schemas", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/messages": {
          get: {
            operationId: "listMessages",
            summary: "List messages",
            tags: ["Messages"],
            responses: { "200": { description: "OK" } },
          },
        },
        "/messages/{id}": {
          post: {
            summary: "Update message",
            tags: ["Messages"],
            responses: { "200": { description: "OK" } },
          },
        },
      },
      components: {
        schemas: {
          Message: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    };

    const operations = normalizeOperations("core", "/api-reference", spec);

    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({
      method: "GET",
      path: "/messages",
      slug: "list-messages",
      route: "/api-reference/list-messages",
      summary: "List messages",
    });
    expect(JSON.stringify(operations)).not.toContain("properties");
  });

  it("normalizes auth, parameters, request body, responses, and schema references compactly", () => {
    const spec: OpenApiDocument = {
      openapi: "3.1.0",
      info: { title: "Acme", version: "1.0.0" },
      paths: {
        "/messages/{id}": {
          patch: {
            operationId: "updateMessage",
            summary: "Update a message",
            tags: ["Messages"],
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
              { name: "preview", in: "query", schema: { type: "boolean" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateMessageRequest" },
                },
              },
            },
            responses: {
              "200": {
                description: "Updated",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
              "404": { description: "Missing" },
            },
            security: [{ bearerAuth: [] }],
            "x-beta": true,
            "x-codeSamples": [
              { lang: "curl", source: "curl https://api.acme.test/messages/id" },
            ],
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
        schemas: {
          UpdateMessageRequest: { type: "object", properties: { text: { type: "string" } } },
          Message: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    };

    const [operation] = normalizeOperations("core", "/api-reference", spec);

    expect(operation.auth).toEqual(["bearerAuth"]);
    expect(operation.parameters).toEqual([
      { name: "id", location: "path", required: true, schemaRef: undefined },
      { name: "preview", location: "query", required: false, schemaRef: undefined },
    ]);
    expect(operation.requestBody).toEqual({
      required: false,
      mediaTypes: ["application/json"],
      schemaRefs: ["UpdateMessageRequest"],
    });
    expect(operation.responses).toEqual([
      { status: "200", description: "Updated", mediaTypes: ["application/json"], schemaRefs: ["Message"] },
      { status: "404", description: "Missing", mediaTypes: [], schemaRefs: [] },
    ]);
    expect(operation.beta).toBe(true);
    expect(operation.codeSamples).toEqual([{ lang: "curl", source: "curl https://api.acme.test/messages/id" }]);
    expect(JSON.stringify(operation)).not.toContain("properties");
  });
});
