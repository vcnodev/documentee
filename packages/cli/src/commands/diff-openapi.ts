import { loadOpenApiSpec, normalizeOperations, type ApiOperation, type ApiSchemaField } from "@documentee/openapi";

interface DiffReport {
  addedOperations: string[];
  removedOperations: string[];
  changedRequestFields: string[];
  changedResponseStatuses: string[];
  deprecatedOperations: string[];
  breakingChanges: string[];
}

export async function diffOpenApiCommand(oldSpecPath: string, newSpecPath: string): Promise<string> {
  const oldSpec = await loadOpenApiSpec(oldSpecPath);
  const newSpec = await loadOpenApiSpec(newSpecPath);
  const oldOperations = operationMap(normalizeOperations("old", "/api-reference", oldSpec));
  const newOperations = operationMap(normalizeOperations("new", "/api-reference", newSpec));
  const report: DiffReport = {
    addedOperations: [],
    removedOperations: [],
    changedRequestFields: [],
    changedResponseStatuses: [],
    deprecatedOperations: [],
    breakingChanges: [],
  };

  for (const [key, operation] of newOperations) {
    if (!oldOperations.has(key)) {
      report.addedOperations.push(formatOperation(operation));
    }
  }

  for (const [key, operation] of oldOperations) {
    if (!newOperations.has(key)) {
      const item = `Removed operation ${formatOperation(operation)}`;
      report.removedOperations.push(formatOperation(operation));
      report.breakingChanges.push(item);
    }
  }

  for (const [key, oldOperation] of oldOperations) {
    const newOperation = newOperations.get(key);
    if (!newOperation) continue;

    if (!oldOperation.deprecated && newOperation.deprecated) {
      report.deprecatedOperations.push(formatOperation(newOperation));
    }

    compareRequestFields(oldOperation, newOperation, report);
    compareResponses(oldOperation, newOperation, report);
  }

  sortReport(report);
  return renderDiffReport(report);
}

function operationMap(operations: ApiOperation[]): Map<string, ApiOperation> {
  return new Map(operations.map((operation) => [`${operation.method} ${operation.path}`, operation]));
}

function compareRequestFields(oldOperation: ApiOperation, newOperation: ApiOperation, report: DiffReport): void {
  const oldFields = fieldMap(oldOperation.requestBody?.fields ?? []);
  const newFields = fieldMap(newOperation.requestBody?.fields ?? []);
  const operation = formatOperation(newOperation);

  for (const [name, field] of newFields) {
    const oldField = oldFields.get(name);
    if (!oldField) {
      const change = `${operation}: added request field \`${name}\``;
      report.changedRequestFields.push(change);
      if (field.required) report.breakingChanges.push(`Added required request field \`${name}\` to ${operation}`);
      continue;
    }

    const oldType = schemaLabel(oldField);
    const newType = schemaLabel(field);
    if (oldType !== newType) {
      const change = `${operation}: request field \`${name}\` changed from ${oldType} to ${newType}`;
      report.changedRequestFields.push(change);
      report.breakingChanges.push(`Changed request field \`${name}\` type on ${operation}`);
    }

    if (!oldField.required && field.required) {
      const change = `${operation}: request field \`${name}\` became required`;
      report.changedRequestFields.push(change);
      report.breakingChanges.push(`Request field \`${name}\` became required on ${operation}`);
    }
  }

  for (const [name] of oldFields) {
    if (newFields.has(name)) continue;
    const change = `${operation}: removed request field \`${name}\``;
    report.changedRequestFields.push(change);
    report.breakingChanges.push(`Removed request field \`${name}\` from ${operation}`);
  }
}

function compareResponses(oldOperation: ApiOperation, newOperation: ApiOperation, report: DiffReport): void {
  const oldStatuses = new Set(oldOperation.responses.map((response) => response.status));
  const newStatuses = new Set(newOperation.responses.map((response) => response.status));
  const operation = formatOperation(newOperation);

  for (const status of newStatuses) {
    if (!oldStatuses.has(status)) {
      report.changedResponseStatuses.push(`${operation}: added response \`${status}\``);
    }
  }

  for (const status of oldStatuses) {
    if (!newStatuses.has(status)) {
      report.changedResponseStatuses.push(`${operation}: removed response \`${status}\``);
      report.breakingChanges.push(`Removed response \`${status}\` from ${operation}`);
    }
  }
}

function fieldMap(fields: ApiSchemaField[]): Map<string, ApiSchemaField> {
  return new Map(fields.map((field) => [field.name, field]));
}

function schemaLabel(field: ApiSchemaField): string {
  return field.schemaFormat ? `${field.schemaType ?? "schema"}<${field.schemaFormat}>` : field.schemaType ?? field.schemaRef ?? "schema";
}

function sortReport(report: DiffReport): void {
  report.addedOperations.sort();
  report.removedOperations.sort();
  report.changedRequestFields.sort();
  report.changedResponseStatuses.sort();
  report.deprecatedOperations.sort();
  report.breakingChanges.sort();
}

function renderDiffReport(report: DiffReport): string {
  return [
    "# OpenAPI Diff",
    "",
    "## Summary",
    `- Added operations: ${report.addedOperations.length}`,
    `- Removed operations: ${report.removedOperations.length}`,
    `- Changed request fields: ${report.changedRequestFields.length}`,
    `- Changed response statuses: ${report.changedResponseStatuses.length}`,
    `- Deprecated operations: ${report.deprecatedOperations.length}`,
    `- Potential breaking changes: ${report.breakingChanges.length}`,
    "",
    renderSection("Breaking Changes", report.breakingChanges),
    renderSection("Added Operations", report.addedOperations),
    renderSection("Removed Operations", report.removedOperations),
    renderSection("Changed Request Fields", report.changedRequestFields),
    renderSection("Changed Response Statuses", report.changedResponseStatuses),
    renderSection("Deprecated Operations", report.deprecatedOperations),
  ].filter(Boolean).join("\n");
}

function renderSection(title: string, items: string[]): string {
  return [`## ${title}`, ...(items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"]), ""].join("\n");
}

function formatOperation(operation: ApiOperation): string {
  return `\`${operation.method} ${operation.path}\``;
}
